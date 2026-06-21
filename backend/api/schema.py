from fastapi import APIRouter, HTTPException
from core import database as db_module
from core.config import settings
from core.security import validate_db_name

router = APIRouter()

@router.get("/schema")
async def get_schema(database: str = "northwind"):
    if not validate_db_name(database):
        raise HTTPException(status_code=400, detail="Invalid database name")

    conn = None
    is_pooled = False

    if database == settings.POSTGRES_DB:
        if db_module.user_pool is None:
            raise HTTPException(status_code=500, detail="Database pool not initialized")
        conn = await db_module.user_pool.acquire()
        is_pooled = True
    else:
        import asyncpg
        try:
            conn = await asyncpg.connect(
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD,
                database=database,
                timeout=5.0
            )
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Database '{database}' not found or unreachable: {str(e)}")

    try:
        # Таблицы и колонки
        columns = await conn.fetch("""
            SELECT
                c.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                c.character_maximum_length,
                col_description((quote_ident(c.table_schema)||'.'||quote_ident(c.table_name))::regclass::oid, c.ordinal_position) as description,
                EXISTS (
                    SELECT 1 FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                        AND kcu.table_name = c.table_name
                        AND kcu.column_name = c.column_name
                ) AS is_primary_key
            FROM information_schema.columns c
            WHERE c.table_schema = 'public'
            ORDER BY c.table_name, c.ordinal_position
        """)

        # Индексы
        indexes = await conn.fetch("""
            SELECT tablename, indexname, indexdef,
                   ix.indisunique AS is_unique,
                   ix.indisprimary AS is_primary
            FROM pg_indexes pi
            JOIN pg_class pc ON pc.relname = pi.indexname
            JOIN pg_index ix ON ix.indexrelid = pc.oid
            WHERE schemaname = 'public'
        """)

        # Foreign keys (используем pg_constraint, так как information_schema прячет FK от не-владельцев таблиц)
        fkeys = await conn.fetch("""
            SELECT
                c.conname AS constraint_name,
                c.conrelid::regclass::text AS table_name,
                a.attname AS column_name,
                c.confrelid::regclass::text AS foreign_table_name,
                af.attname AS foreign_column_name,
                CASE c.confdeltype
                    WHEN 'a' THEN 'NO ACTION'
                    WHEN 'r' THEN 'RESTRICT'
                    WHEN 'c' THEN 'CASCADE'
                    WHEN 'n' THEN 'SET NULL'
                    WHEN 'd' THEN 'SET DEFAULT'
                END AS on_delete,
                CASE c.confupdtype
                    WHEN 'a' THEN 'NO ACTION'
                    WHEN 'r' THEN 'RESTRICT'
                    WHEN 'c' THEN 'CASCADE'
                    WHEN 'n' THEN 'SET NULL'
                    WHEN 'd' THEN 'SET DEFAULT'
                END AS on_update
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
            JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
            WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
        """)

        # Sequences
        sequences = await conn.fetch("""
            SELECT sequencename, last_value, increment_by
            FROM pg_sequences
            WHERE schemaname = 'public'
        """)

        # Метаинформация таблиц (размер, строки, описания)
        table_meta = await conn.fetch("""
            SELECT 
                c.relname as table_name,
                GREATEST(0, c.reltuples::bigint) AS row_count,
                pg_total_relation_size(c.oid) AS size_bytes,
                obj_description(c.oid, 'pg_class') AS description
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind = 'r'
        """)

        # Ограничения CHECK
        check_constraints = await conn.fetch("""
            SELECT 
                c.conrelid::regclass::text AS table_name,
                c.conname AS name,
                pg_get_constraintdef(c.oid) AS definition
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE n.nspname = 'public' AND c.contype = 'c'
        """)

        # Триггеры
        triggers = await conn.fetch("""
            SELECT 
                t.tgrelid::regclass::text AS table_name,
                t.tgname AS name,
                pg_get_triggerdef(t.oid) AS definition
            FROM pg_trigger t
            JOIN pg_class c ON c.oid = t.tgrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND t.tgisinternal = false
        """)

        # Собираем в структуру для DB Visualizer
        tables = {}
        for col in columns:
            tname = col["table_name"]
            if tname not in tables:
                tables[tname] = {
                    "name": tname,
                    "schema": "public",
                    "rowCount": 0,
                    "sizeBytes": 0,
                    "description": None,
                    "columns": [],
                    "indexes": [],
                    "foreignKeys": [],
                    "referencedBy": [],
                    "sequences": [],
                    "checkConstraints": [],
                    "triggers": []
                }
            
            tables[tname]["columns"].append({
                "name": col["column_name"],
                "type": col["data_type"],
                "nullable": col["is_nullable"] == "YES",
                "default": col["column_default"],
                "description": col["description"],
                "isPrimaryKey": col["is_primary_key"],
                "isForeignKey": False, # Будет обновлено ниже
                "isUnique": False      # Будет обновлено ниже
            })

        for meta in table_meta:
            tname = meta["table_name"]
            if tname in tables:
                tables[tname]["rowCount"] = meta["row_count"]
                tables[tname]["sizeBytes"] = meta["size_bytes"]
                tables[tname]["description"] = meta["description"]

        for idx in indexes:
            tname = idx["tablename"]
            if tname in tables:
                tables[tname]["indexes"].append({
                    "name": idx["indexname"],
                    "definition": idx["indexdef"],
                    "isPrimary": idx["is_primary"],
                    "isUnique": idx["is_unique"]
                })
                # Обновляем isUnique для колонок
                if idx["is_unique"] and not idx["is_primary"]:
                    # Очень простая эвристика: если имя колонки есть в определении индекса
                    for c in tables[tname]["columns"]:
                        if c["name"] in idx["indexdef"]:
                            c["isUnique"] = True

        for fk in fkeys:
            tname = fk["table_name"]
            ftname = fk["foreign_table_name"]
            
            fk_obj = {
                "name": fk["constraint_name"],
                "column": fk["column_name"],
                "targetSchema": "public",
                "targetTable": ftname,
                "targetColumn": fk["foreign_column_name"],
                "onDelete": fk["on_delete"],
                "onUpdate": fk["on_update"]
            }
            
            if tname in tables:
                tables[tname]["foreignKeys"].append(fk_obj)
                # Обновляем isForeignKey
                for c in tables[tname]["columns"]:
                    if c["name"] == fk["column_name"]:
                        c["isForeignKey"] = True

            if ftname in tables:
                tables[ftname]["referencedBy"].append({
                    "table": tname,
                    "column": fk["column_name"],
                    "constraint": fk["constraint_name"]
                })

        for seq in sequences:
            for tname in tables:
                if tname in seq["sequencename"]:
                    tables[tname]["sequences"].append({
                        "name": seq["sequencename"],
                        "current": seq["last_value"]
                    })

        for chk in check_constraints:
            tname = chk["table_name"]
            if tname in tables:
                tables[tname]["checkConstraints"].append({
                    "name": chk["name"],
                    "definition": chk["definition"]
                })

        for trg in triggers:
            tname = trg["table_name"]
            if tname in tables:
                tables[tname]["triggers"].append({
                    "name": trg["name"],
                    "definition": trg["definition"]
                })

        return {"tables": list(tables.values())}
    finally:
        if conn:
            if is_pooled:
                await db_module.user_pool.release(conn)
            else:
                await conn.close()

