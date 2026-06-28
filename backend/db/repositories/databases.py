from core import sqlite_db

class DatabaseRepository:
    @staticmethod
    async def get_all_databases() -> list[dict]:
        async with sqlite_db.sqlite_pool.execute("SELECT technical_name, display_name, is_builtin, connection_status FROM databases") as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
