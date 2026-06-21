import os
import json
import zipfile
import shutil
import asyncio
from io import BytesIO
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse

from core.sqlite_db import get_sqlite_conn
from core.config import settings
from core.security import validate_db_name

router = APIRouter()

def cleanup_old_backups(db_path: Path, keep: int = 1):
    """
    Удаляет старые файлы резервных копий SQLite, оставляя только указанное количество последних.
    """
    parent = db_path.parent
    bak_pattern = f"{db_path.name}.bak-*"
    bak_files = sorted(list(parent.glob(bak_pattern)))
    if len(bak_files) > keep:
        for f in bak_files[:-keep]:
            try:
                f.unlink()
                print(f"Removed old backup: {f}")
            except Exception as e:
                print(f"Error removing old backup {f}: {e}")

async def get_pg_dump(technical_name: str) -> bytes:
    if not validate_db_name(technical_name):
        raise ValueError(f"Unsafe database name for export: {technical_name}")

    # Use PGPASSWORD so we don't prompt
    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_ADMIN_PASSWORD
    
    cmd = [
        "pg_dump",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_ADMIN_USER,
        "-Fc", # Custom format
        technical_name
    ]
    
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env
    )
    stdout, stderr = await process.communicate()
    
    if process.returncode != 0:
        print(f"pg_dump failed for {technical_name}: {stderr.decode()}")
        return b""
    return stdout

async def restore_pg_dump(technical_name: str, dump_path: str):
    if not validate_db_name(technical_name):
        raise ValueError(f"Unsafe database name for restore: {technical_name}")

    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_ADMIN_PASSWORD
    
    # 1. Drop database if exists, then create
    psql_drop = [
        "psql",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_ADMIN_USER,
        "-d", "postgres",
        "-c", f"DROP DATABASE IF EXISTS {technical_name};"
    ]
    p_drop = await asyncio.create_subprocess_exec(*psql_drop, env=env)
    await p_drop.communicate()
    
    psql_create = [
        "psql",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_ADMIN_USER,
        "-d", "postgres",
        "-c", f"CREATE DATABASE {technical_name};"
    ]
    p_create = await asyncio.create_subprocess_exec(*psql_create, env=env)
    await p_create.communicate()
    
    # 2. pg_restore
    restore_cmd = [
        "pg_restore",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_ADMIN_USER,
        "-d", technical_name,
        "-1", # Single transaction
        dump_path
    ]
    p_restore = await asyncio.create_subprocess_exec(
        *restore_cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env
    )
    _, stderr = await p_restore.communicate()
    if p_restore.returncode != 0:
        print(f"pg_restore failed for {technical_name}: {stderr.decode()}")

@router.get("/export")
async def export_profile():
    sqlite = await get_sqlite_conn()
    
    # Prepare zip in memory
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # 1. Manifest
        manifest = {
            "schema_version": "1.0",
            "export_date": datetime.utcnow().isoformat(),
            "app_version": "0.1.0"
        }
        zip_file.writestr("backup/manifest.json", json.dumps(manifest, indent=2))
        
        # 2. SQLite Tables export
        tables = [
            "users", "databases", "courses", "sections", "tasks", 
            "task_rules", "section_tasks", "tags", "task_tags", 
            "attempts", "task_flags", "app_settings"
        ]
        
        registered_dbs = []
        for table in tables:
            try:
                async with sqlite.execute(f"SELECT * FROM {table}") as cursor:
                    rows = await cursor.fetchall()
                    data = [dict(row) for row in rows]
                    if table == "databases":
                        for row in data:
                            name = row["technical_name"]
                            if validate_db_name(name):
                                registered_dbs.append(name)
                            else:
                                print(f"Skipping database with unsafe name from registry: {name}")
                        
                    zip_file.writestr(f"backup/app_data/{table}.json", json.dumps(data, indent=2))
            except Exception as e:
                print(f"Error exporting table {table}: {e}")
                
        # 3. PostgreSQL dumps
        for db_name in registered_dbs:
            dump_data = await get_pg_dump(db_name)
            if dump_data:
                zip_file.writestr(f"backup/pg_dumps/{db_name}.dump", dump_data)
                
    zip_buffer.seek(0)
    
    filename = f"sql-trainer-backup-{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.post("/import")
async def import_profile(file: UploadFile = File(...)):
    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Must be a .zip file")
        
    temp_dir = Path("/tmp/sql_import")
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    zip_path = temp_dir / "uploaded.zip"
    with open(zip_path, "wb") as f:
        f.write(await file.read())
        
    db_path = Path(settings.SQLITE_DB_PATH)
    bak_path = None
    if db_path.exists():
        bak_path = db_path.with_name(f"app.db.bak-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        shutil.copy2(db_path, bak_path)
        
    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            zip_ref.extractall(temp_dir)
            
        backup_dir = temp_dir / "backup"
        if not backup_dir.exists():
            raise HTTPException(status_code=400, detail="Invalid backup format (missing backup directory)")
            
        # 1. Validate manifest.json
        manifest_path = backup_dir / "manifest.json"
        if not manifest_path.exists():
            raise HTTPException(status_code=400, detail="Invalid backup format (missing manifest.json)")
            
        with open(manifest_path, "r") as f:
            try:
                manifest = json.load(f)
            except Exception:
                raise HTTPException(status_code=400, detail="manifest.json is invalid JSON")
                
        schema_version = manifest.get("schema_version")
        if not schema_version:
            raise HTTPException(status_code=400, detail="manifest.json is missing schema_version")
            
        try:
            version_float = float(schema_version)
            if version_float > 1.0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Incompatible schema version: {schema_version}. Max supported version is 1.0"
                )
        except ValueError:
            raise HTTPException(status_code=400, detail="manifest.json schema_version must be a valid float string")
            
        sqlite = await get_sqlite_conn()
        
        # 2. Re-import tables
        app_data_dir = backup_dir / "app_data"
        if app_data_dir.exists():
            for json_file in app_data_dir.glob("*.json"):
                table_name = json_file.stem
                with open(json_file, "r") as f:
                    data = json.load(f)
                    
                if not data: continue
                
                # Clear table
                await sqlite.execute(f"DELETE FROM {table_name}")
                
                # Insert data
                columns = data[0].keys()
                cols_str = ", ".join(columns)
                placeholders = ", ".join(["?"] * len(columns))
                
                insert_query = f"INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders})"
                
                # Convert dicts to tuples matching columns order
                values = [tuple(row[col] for col in columns) for row in data]
                
                await sqlite.executemany(insert_query, values)
                
            await sqlite.commit()
            
        # 3. Restore PG databases
        pg_dumps_dir = backup_dir / "pg_dumps"
        if pg_dumps_dir.exists():
            for dump_file in pg_dumps_dir.glob("*.dump"):
                db_name = dump_file.stem
                if not validate_db_name(db_name):
                    print(f"Skipping restore of database with unsafe name: {db_name}")
                    continue
                await restore_pg_dump(db_name, str(dump_file))
                
        # Clean up old backups, keeping only the most recent one
        cleanup_old_backups(db_path, keep=1)
                
    except Exception as e:
        print(f"Import error: {e}")
        # Rollback SQLite database if backup exists
        if bak_path and bak_path.exists():
            try:
                from core.sqlite_db import close_sqlite, init_sqlite
                await close_sqlite()
                shutil.copy2(bak_path, db_path)
                await init_sqlite()
                print("Restored SQLite database from backup due to import failure")
            except Exception as restore_err:
                print(f"Failed to restore backup: {restore_err}")
                
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
        
    return {"status": "success", "message": "Import completed"}

