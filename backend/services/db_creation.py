import asyncio
import os
from fastapi import HTTPException
from core.config import settings
from core.database import get_admin_pool
from core import sqlite_db


async def validate_db_name_available(technical_name: str) -> tuple[bool, str | None]:
    """Проверяет что БД с таким именем не существует ни в Postgres, ни в реестре."""
    # Проверка в реестре (SQLite)
    async with sqlite_db.sqlite_pool.execute(
        "SELECT COUNT(*) as count FROM databases WHERE technical_name = ?",
        (technical_name,)
    ) as cursor:
        row = await cursor.fetchone()
        if row["count"] > 0:
            return False, f"База данных '{technical_name}' уже зарегистрирована в системе"

    # Проверка в Postgres (на случай "осиротевших" БД без записи в реестре)
    try:
        pool = await get_admin_pool("postgres")
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT 1 FROM pg_database WHERE datname = $1", technical_name
            )
            if row:
                return False, f"База данных '{technical_name}' уже существует в Postgres"
    except Exception as e:
        return False, f"Не удалось проверить Postgres: {e}"

    return True, None


async def create_postgres_db(technical_name: str):
    """CREATE DATABASE — обязательно без транзакции (Postgres не позволяет иначе)."""
    # Подключаемся к postgres (системная БД), чтобы создать новую
    pool = await get_admin_pool("postgres")
    async with pool.acquire() as conn:
        # autocommit — не нужен явно, asyncpg выполняет DDL вне транзакций по умолчанию
        # Но нужно убедиться что мы не внутри transaction() блока
        await conn.execute(f'CREATE DATABASE "{technical_name}"')


async def delete_postgres_db(technical_name: str):
    """Удаляет базу данных из Postgres, предварительно оборвав все соединения."""
    pool = await get_admin_pool("postgres")
    async with pool.acquire() as conn:
        # Обрываем все чужие соединения к этой БД
        await conn.execute(f"""
            SELECT pg_terminate_backend(pid) 
            FROM pg_stat_activity 
            WHERE datname = '{technical_name}' AND pid <> pg_backend_pid();
        """)
        # Удаляем БД
        await conn.execute(f'DROP DATABASE "{technical_name}"')

async def run_init_sql(technical_name: str, sql: str) -> None:
    """Выполняет инициализационный SQL через psql (корректно обрабатывает COPY, \\ команды)."""
    if not sql or not sql.strip():
        return

    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_ADMIN_PASSWORD

    process = await asyncio.create_subprocess_exec(
        "psql",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_ADMIN_USER,
        "-d", technical_name,
        "-c", sql,
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        err = stderr.decode(errors="replace")
        raise HTTPException(
            status_code=422,
            detail=f"Ошибка выполнения SQL-скрипта:\n{err}"
        )


async def run_init_sql_file(technical_name: str, filepath: str) -> None:
    """Выполняет SQL-файл через psql."""
    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_ADMIN_PASSWORD

    process = await asyncio.create_subprocess_exec(
        "psql",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_ADMIN_USER,
        "-d", technical_name,
        "-f", filepath,
        env=env,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )

    stdout, stderr = await process.communicate()

    if process.returncode != 0:
        err = stderr.decode(errors="replace")
        raise HTTPException(
            status_code=422,
            detail=f"Ошибка выполнения SQL-файла:\n{err}"
        )


async def grant_db_access(technical_name: str):
    """Выдаёт права llpg_user на новую базу данных."""
    pool = await get_admin_pool(technical_name)
    async with pool.acquire() as conn:
        await conn.execute(f"""
            GRANT USAGE ON SCHEMA public TO {settings.POSTGRES_USER};
            GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {settings.POSTGRES_USER};
            GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {settings.POSTGRES_USER};
            ALTER DEFAULT PRIVILEGES IN SCHEMA public
                GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO {settings.POSTGRES_USER};
        """)


async def register_database(technical_name: str, display_name: str):
    """Регистрирует базу данных в SQLite реестре."""
    await sqlite_db.sqlite_pool.execute(
        """
        INSERT INTO databases (technical_name, display_name, is_builtin, connection_status)
        VALUES (?, ?, 0, 'ok')
        """,
        (technical_name, display_name)
    )
    await sqlite_db.sqlite_pool.commit()


async def drop_postgres_db(technical_name: str):
    """Откатной DROP DATABASE — вызывается при ошибке после CREATE DATABASE."""
    try:
        pool = await get_admin_pool("postgres")
        async with pool.acquire() as conn:
            # Завершаем все соединения к базе перед удалением
            await conn.execute(f"""
                SELECT pg_terminate_backend(pid)
                FROM pg_stat_activity
                WHERE datname = '{technical_name}' AND pid <> pg_backend_pid()
            """)
            await conn.execute(f'DROP DATABASE IF EXISTS "{technical_name}"')
    except Exception as e:
        print(f"[WARNING] Failed to rollback drop database '{technical_name}': {e}")
