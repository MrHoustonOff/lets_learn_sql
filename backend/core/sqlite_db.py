import os
import aiosqlite
import asyncpg
import asyncpg.exceptions
import asyncio
from pathlib import Path
from datetime import datetime
from core.config import settings
from core.security import validate_db_name

sqlite_pool: aiosqlite.Connection = None

async def init_sqlite():
    global sqlite_pool
    db_path = Path(settings.SQLITE_DB_PATH)
    
    # Ensure directory exists (e.g., /data)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    
    sqlite_pool = await aiosqlite.connect(db_path)
    sqlite_pool.row_factory = aiosqlite.Row
    
    await run_migrations()
    await seed_initial_data()
    await verify_and_sync_databases()

async def run_migrations():
    # Simple migration runner
    migrations_dir = Path(__file__).parent.parent / "migrations"
    if not migrations_dir.exists():
        return

    # Check applied migrations
    try:
        async with sqlite_pool.execute("SELECT version FROM schema_migrations") as cursor:
            applied = {row["version"] for row in await cursor.fetchall()}
    except aiosqlite.OperationalError:
        applied = set()

    # Get available migrations
    available = sorted([f for f in migrations_dir.iterdir() if f.name.endswith(".sql")])

    for migration_file in available:
        version = migration_file.name
        if version not in applied:
            print(f"Applying migration: {version}", flush=True)
            with open(migration_file, "r", encoding="utf-8") as f:
                sql_script = f.read()
            
            await sqlite_pool.executescript(sql_script)
            await sqlite_pool.execute(
                "INSERT INTO schema_migrations (version) VALUES (?)", (version,)
            )
            await sqlite_pool.commit()

async def seed_initial_data():
    # 1. Seed user if empty
    async with sqlite_pool.execute("SELECT COUNT(*) as count FROM users") as cursor:
        row = await cursor.fetchone()
        if row["count"] == 0:
            await sqlite_pool.execute(
                "INSERT INTO users (username, display_name) VALUES (?, ?)",
                ("local_user", "Local User")
            )
            await sqlite_pool.commit()

    # 2. Seed northwind database in registry if empty
    async with sqlite_pool.execute("SELECT COUNT(*) as count FROM databases WHERE technical_name = 'northwind'") as cursor:
        row = await cursor.fetchone()
        if row["count"] == 0:
            await sqlite_pool.execute(
                """
                INSERT INTO databases (technical_name, display_name, description, is_builtin, connection_status)
                VALUES (?, ?, ?, ?, ?)
                """,
                ("northwind", "Northwind Traders", "Built-in database for learning", 1, "unknown")
            )
            await sqlite_pool.commit()

    # 3. Seed courses if empty
    async with sqlite_pool.execute("SELECT COUNT(*) as count FROM courses") as cursor:
        row = await cursor.fetchone()
        if row["count"] == 0:
            await sqlite_pool.execute(
                """
                INSERT INTO courses (id, title, description, author_name)
                VALUES (?, ?, ?, ?)
                """,
                (
                    1, 
                    "Основы PostgreSQL", 
                    "Комплексный курс по основам реляционных баз данных. Вы научитесь писать сложные SQL запросы, работать с джоинами, агрегацией и оконными функциями на живых примерах.", 
                    "Local Instructor"
                )
            )
            await sqlite_pool.commit()

    # 4. Seed sections if empty
    async with sqlite_pool.execute("SELECT COUNT(*) as count FROM sections") as cursor:
        row = await cursor.fetchone()
        if row["count"] == 0:
            await sqlite_pool.execute(
                """
                INSERT INTO sections (id, course_id, title, description, sort_order)
                VALUES 
                (1, 1, 'Раздел 1: SELECT', 'Базовые выборки, фильтрация (WHERE) и сортировка (ORDER BY). Учимся доставать именно те данные, которые нам нужны.', 1),
                (2, 1, 'Раздел 2: JOIN', 'Объединяем данные из разных таблиц. Разбираем разницу между INNER, LEFT, RIGHT и FULL JOIN.', 2)
                """
            )
            await sqlite_pool.commit()

    # 5. Seed tasks if empty
    async with sqlite_pool.execute("SELECT COUNT(*) as count FROM tasks") as cursor:
        row = await cursor.fetchone()
        if row["count"] == 0:
            tasks_data = [
                (
                    1, "Все клиенты", 
                    "Выведи все колонки из таблицы `customers`.", 
                    "SELECT * FROM customers;", 1, 0, "published",
                    '{"hint": "Простой SELECT * FROM customers;"}'
                ),
                (
                    2, "Фильтрация по стране", 
                    "Выведи имена компаний (`company_name`) и контактные имена (`contact_name`) клиентов, которые находятся в Великобритании (`UK`).", 
                    "SELECT company_name, contact_name FROM customers WHERE country = 'UK';", 1, 0, "published",
                    '{"hint": "Используй фильтр WHERE country = \'UK\';"}'
                ),
                (
                    3, "Сортировка", 
                    "Выведи список всех товаров (`product_name`, `unit_price`), отсортированных по цене по убыванию.", 
                    "SELECT product_name, unit_price FROM products ORDER BY unit_price DESC;", 1, 1, "published",
                    '{"hint": "Используй ORDER BY unit_price DESC;"}'
                ),
                (
                    4, "Псевдонимы колонок", 
                    "Выведи имя товара как `product` и цену как `price` из таблицы `products`.", 
                    "SELECT product_name AS product, unit_price AS price FROM products;", 1, 0, "published",
                    '{"hint": "Используй AS для переименования колонок в выводе."}'
                ),
                (
                    5, "DISTINCT", 
                    "Выведи уникальный список стран (`country`) из таблицы `customers` без дубликатов, отсортированных по алфавиту.", 
                    "SELECT DISTINCT country FROM customers ORDER BY country;", 1, 1, "published",
                    '{"hint": "Используй DISTINCT для удаления дубликатов."}'
                ),
                (
                    6, "INNER JOIN", 
                    "Выведи имя товара (`product_name`) и имя категории (`category_name`) для всех товаров. Используй INNER JOIN.", 
                    "SELECT p.product_name, c.category_name FROM products p INNER JOIN categories c ON p.category_id = c.category_id;", 1, 0, "published",
                    '{"hint": "Используй INNER JOIN по полю category_id."}'
                ),
                (
                    7, "LEFT JOIN", 
                    "Выведи имя компании заказчика (`company_name`) и идентификаторы их заказов (`order_id`) из таблиц `customers` и `orders`. Используй LEFT JOIN, чтобы включить заказчиков без заказов.", 
                    "SELECT c.company_name, o.order_id FROM customers c LEFT JOIN orders o ON c.customer_id = o.customer_id;", 1, 0, "published",
                    '{"hint": "Используй LEFT JOIN с таблицей orders по полю customer_id."}'
                )
            ]
            for t_id, title, desc, ref_sql, db_id, order_matters, status, meta_json in tasks_data:
                await sqlite_pool.execute(
                    """
                    INSERT INTO tasks (id, title, description, reference_sql, database_id, order_matters, status, metadata_json)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (t_id, title, desc, ref_sql, db_id, order_matters, status, meta_json)
                )
            await sqlite_pool.commit()

    # 6. Seed section_tasks if empty
    async with sqlite_pool.execute("SELECT COUNT(*) as count FROM section_tasks") as cursor:
        row = await cursor.fetchone()
        if row["count"] == 0:
            await sqlite_pool.execute(
                """
                INSERT INTO section_tasks (section_id, task_id, sort_order)
                VALUES 
                (1, 1, 1),
                (1, 2, 2),
                (1, 3, 3),
                (1, 4, 4),
                (1, 5, 5),
                (2, 6, 1),
                (2, 7, 2)
                """
            )
            await sqlite_pool.commit()

async def restore_builtin_database(tech_name: str) -> bool:
    """
    Восстанавливает встроенную или зарегистрированную базу из .sql или .dump файла,
    если он найден в backend/init/. Динамически выдает права для llpg_user.
    """
    init_dir = Path("/app/init")
    if not init_dir.exists():
        init_dir = Path(__file__).parent.parent / "init"
        
    candidates = [
        init_dir / f"{tech_name}.sql",
        init_dir / f"02_{tech_name}.sql",
        init_dir / f"{tech_name}.dump",
    ]
    
    found_file = None
    for c in candidates:
        if c.exists():
            found_file = c
            break
            
    if not found_file:
        print(f"No seed file found for database '{tech_name}'", flush=True)
        return False
        
    print(f"Found seed file for database '{tech_name}': {found_file}", flush=True)
    
    env = os.environ.copy()
    env["PGPASSWORD"] = settings.POSTGRES_ADMIN_PASSWORD
    
    # 2. Recreate database
    psql_drop = [
        "psql",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_ADMIN_USER,
        "-d", "postgres",
        "-c", f"DROP DATABASE IF EXISTS {tech_name};"
    ]
    p_drop = await asyncio.create_subprocess_exec(
        *psql_drop,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env
    )
    await p_drop.communicate()

    psql_create = [
        "psql",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_ADMIN_USER,
        "-d", "postgres",
        "-c", f"CREATE DATABASE {tech_name};"
    ]
    p_create = await asyncio.create_subprocess_exec(
        *psql_create,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env
    )
    stdout, stderr = await p_create.communicate()
    if p_create.returncode != 0:
        print(f"Failed to create database '{tech_name}': {stderr.decode()}", flush=True)
        return False
        
    # 3. Restore data
    if found_file.suffix == ".sql":
        psql_restore = [
            "psql",
            "-h", settings.POSTGRES_HOST,
            "-p", str(settings.POSTGRES_PORT),
            "-U", settings.POSTGRES_ADMIN_USER,
            "-d", tech_name,
            "-f", str(found_file)
        ]
        p_restore = await asyncio.create_subprocess_exec(
            *psql_restore,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env
        )
    else:
        # Custom format dump
        pg_restore_cmd = [
            "pg_restore",
            "-h", settings.POSTGRES_HOST,
            "-p", str(settings.POSTGRES_PORT),
            "-U", settings.POSTGRES_ADMIN_USER,
            "-d", tech_name,
            "-1",
            str(found_file)
        ]
        p_restore = await asyncio.create_subprocess_exec(
            *pg_restore_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env
        )
        
    stdout, stderr = await p_restore.communicate()
    if p_restore.returncode != 0:
        print(f"Failed to restore database '{tech_name}' data: {stderr.decode()}", flush=True)
        return False
        
    # 4. Apply user grants dynamically
    grants_sql = f"""
    GRANT CONNECT ON DATABASE {tech_name} TO {settings.POSTGRES_USER};
    GRANT USAGE ON SCHEMA public TO {settings.POSTGRES_USER};
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {settings.POSTGRES_USER};
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {settings.POSTGRES_USER};
    """
    psql_grants = [
        "psql",
        "-h", settings.POSTGRES_HOST,
        "-p", str(settings.POSTGRES_PORT),
        "-U", settings.POSTGRES_ADMIN_USER,
        "-d", tech_name,
        "-c", grants_sql
    ]
    p_grants = await asyncio.create_subprocess_exec(
        *psql_grants,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env
    )
    stdout, stderr = await p_grants.communicate()
    if p_grants.returncode != 0:
        print(f"Warning: failed to apply grants to '{tech_name}': {stderr.decode()}", flush=True)
        
    print(f"Database '{tech_name}' successfully restored and configured.", flush=True)
    return True

async def verify_and_sync_databases():
    global sqlite_pool
    if not sqlite_pool:
        return
        
    async with sqlite_pool.execute("SELECT id, technical_name FROM databases") as cursor:
        rows = await cursor.fetchall()
        
    for row in rows:
        db_id = row["id"]
        tech_name = row["technical_name"]
        
        if not validate_db_name(tech_name):
            print(f"Database in registry has invalid name: {tech_name}", flush=True)
            await sqlite_pool.execute(
                "UPDATE databases SET connection_status = 'unreachable', last_checked_at = ? WHERE id = ?",
                (datetime.utcnow().isoformat(), db_id)
            )
            await sqlite_pool.commit()
            continue
            
        status = 'unreachable'
        try:
            # Connect to database directly to verify if it exists and is accessible
            conn = await asyncpg.connect(
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD,
                database=tech_name,
                timeout=2.0
            )
            await conn.close()
            status = 'healthy'
        except asyncpg.exceptions.InvalidCatalogNameError:
            # Database does not exist! Try to recreate/restore if we have a seed file
            print(f"Database '{tech_name}' does not exist in Postgres. Attempting automatic restoration...", flush=True)
            restored = await restore_builtin_database(tech_name)
            if restored:
                status = 'healthy'
        except Exception as e:
            print(f"Error checking connection for database '{tech_name}': {e}", flush=True)
            
        await sqlite_pool.execute(
            "UPDATE databases SET connection_status = ?, last_checked_at = ? WHERE id = ?",
            (status, datetime.utcnow().isoformat(), db_id)
        )
        await sqlite_pool.commit()

async def get_sqlite_conn():
    return sqlite_pool

async def close_sqlite():
    if sqlite_pool:
        await sqlite_pool.close()

