import logging
import aiosqlite
from pathlib import Path

logger = logging.getLogger(__name__)

class MigrationRunner:
    """
    Lightweight SQLite migration runner.
    Applies raw .sql scripts sequentially and tracks them in 'schema_migrations'.
    """
    def __init__(self, db_path: str | Path, migrations_dir: str | Path):
        self.db_path = Path(db_path)
        self.migrations_dir = Path(migrations_dir)

    async def run_all(self):
        if not self.migrations_dir.exists():
            logger.warning(f"Migrations directory not found: {self.migrations_dir}")
            return

        # Ensure database directory exists
        self.db_path.parent.mkdir(parents=True, exist_ok=True)

        async with aiosqlite.connect(self.db_path) as conn:
            # 1. Guarantee tracking table exists
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version TEXT PRIMARY KEY,
                    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
                );
            """)
            await conn.commit()

            # 2. Read already applied migrations
            async with conn.execute("SELECT version FROM schema_migrations") as cursor:
                applied = {row[0] for row in await cursor.fetchall()}

            # 3. Gather and sort available migrations
            available_files = sorted([f for f in self.migrations_dir.iterdir() if f.name.endswith(".sql")])

            # 4. Apply pending migrations
            for migration_file in available_files:
                version = migration_file.name
                if version not in applied:
                    print(f"[MigrationRunner] Applying migration: {version}", flush=True)
                    logger.info(f"Applying migration: {version}")
                    
                    with open(migration_file, "r", encoding="utf-8") as f:
                        sql_script = f.read()

                    # Execute the full script
                    await conn.executescript(sql_script)
                    
                    # Record the migration
                    await conn.execute(
                        "INSERT INTO schema_migrations (version) VALUES (?)", (version,)
                    )
                    await conn.commit()
