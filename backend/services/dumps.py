import asyncio
import os
from pathlib import Path
from datetime import datetime
from fastapi import HTTPException
from core.config import settings
from core.database import get_admin_pool

class DumpsService:
    @staticmethod
    def get_db_dumps_dir(db_name: str) -> Path:
        p = Path(settings.SQLITE_DB_PATH).parent / "dumps" / db_name
        p.mkdir(parents=True, exist_ok=True)
        return p

    @staticmethod
    async def get_dumps(db_name: str) -> list[dict]:
        db_dumps_dir = DumpsService.get_db_dumps_dir(db_name)
        
        def fetch_files():
            res = []
            for f in db_dumps_dir.glob("*.sql"):
                stat = f.stat()
                res.append({
                    "filename": f.name,
                    "size": stat.st_size,
                    "created_at": int(stat.st_mtime),
                    "is_init": f.name == "init.sql"
                })
            return res

        dumps = await asyncio.to_thread(fetch_files)
        # Sort so init.sql is first, then by date descending (newest first)
        dumps.sort(key=lambda x: (not x["is_init"], -x["created_at"]))
        return dumps

    @staticmethod
    async def create_dump(db_name: str, is_init: bool = False) -> dict:
        db_dumps_dir = DumpsService.get_db_dumps_dir(db_name)
        filename = "init.sql" if is_init else f"{int(datetime.now().timestamp())}.sql"
        filepath = db_dumps_dir / filename

        if is_init and filepath.exists():
            return {"filename": filename, "status": "exists"}

        env = os.environ.copy()
        env["PGPASSWORD"] = settings.POSTGRES_ADMIN_PASSWORD
        
        process = await asyncio.create_subprocess_exec(
            "pg_dump",
            "-h", settings.POSTGRES_HOST,
            "-p", str(settings.POSTGRES_PORT),
            "-U", settings.POSTGRES_ADMIN_USER,
            "-d", db_name,
            "--clean",
            "--if-exists",
            "-f", str(filepath),
            env=env,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            if filepath.exists():
                filepath.unlink()
            raise HTTPException(500, f"pg_dump failed: {stderr.decode()}")
            
        # Manage maximum 5 normal dumps limit (excluding init.sql)
        if not is_init:
            def cleanup_old_dumps():
                all_files = list(db_dumps_dir.glob("*.sql"))
                normal_dumps = [f for f in all_files if f.name != "init.sql"]
                if len(normal_dumps) > 5:
                    # Sort oldest first
                    normal_dumps.sort(key=lambda x: x.stat().st_mtime)
                    for f in normal_dumps[:-5]:
                        f.unlink()
            await asyncio.to_thread(cleanup_old_dumps)

        return {
            "filename": filename,
            "size": filepath.stat().st_size,
            "created_at": int(filepath.stat().st_mtime),
            "is_init": is_init
        }

    @staticmethod
    async def restore_dump(db_name: str, filename: str):
        filepath = DumpsService.get_db_dumps_dir(db_name) / filename
        if not filepath.exists():
            raise HTTPException(404, "Dump file not found")
            
        def read_dump():
            with open(filepath, 'r', encoding='utf-8') as f:
                return f.read()
                
        sql_content = await asyncio.to_thread(read_dump)
        
        pool = await get_admin_pool(db_name)
        async with pool.acquire() as conn:
            # Execute all changes in a single transaction
            async with conn.transaction():
                # 1. Nuke schema
                await conn.execute("""
                    DROP SCHEMA public CASCADE;
                    CREATE SCHEMA public;
                    GRANT ALL ON SCHEMA public TO postgres;
                    GRANT ALL ON SCHEMA public TO public;
                """)
                
                # 2. Restore data
                await conn.execute(sql_content)
                
                # 3. Re-grant privileges to the application user
                # We dynamically construct this using the actual username from settings
                grant_sql = f"""
                    GRANT USAGE ON SCHEMA public TO {settings.POSTGRES_USER};
                    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {settings.POSTGRES_USER};
                    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {settings.POSTGRES_USER};
                """
                await conn.execute(grant_sql)
