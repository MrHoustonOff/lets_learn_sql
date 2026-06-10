from fastapi import APIRouter, HTTPException
from core import database as db_module

router = APIRouter()

@router.get("/schema")
async def get_schema(database: str = "northwind"):
    # TODO: MVP+ — database параметр для мультибд
    # сейчас всегда northwind

    if db_module.user_pool is None:
        raise HTTPException(status_code=500, detail="Database pool not initialized")

    async with db_module.user_pool.acquire() as conn:
        # Таблицы и колонки
        columns = await conn.fetch("""
            SELECT
                c.table_name,
                c.column_name,
                c.data_type,
                c.is_nullable,
                c.column_default,
                c.character_maximum_length,
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

        # Foreign keys
        fkeys = await conn.fetch("""
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name  AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                tc.constraint_name,
                rc.delete_rule  AS on_delete,
                rc.update_rule  AS on_update
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            JOIN information_schema.referential_constraints rc
                ON rc.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
        """)

        # Sequences
        sequences = await conn.fetch("""
            SELECT sequencename, last_value, increment_by
            FROM pg_sequences
            WHERE schemaname = 'public'
        """)

        # Собираем в структуру для DB Visualizer
        tables = {}
        for col in columns:
            tname = col["table_name"]
            if tname not in tables:
                tables[tname] = {
                    "name": tname,
                    "columns": [],
                    "indexes": [],
                    "foreign_keys": [],
                    "referenced_by": [],
                    "sequences": [],
                }
            tables[tname]["columns"].append(dict(col))

        for idx in indexes:
            tname = idx["tablename"]
            if tname in tables:
                tables[tname]["indexes"].append(dict(idx))

        for fk in fkeys:
            tname = fk["table_name"]
            ftname = fk["foreign_table_name"]
            if tname in tables:
                tables[tname]["foreign_keys"].append(dict(fk))
            if ftname in tables:
                tables[ftname]["referenced_by"].append(dict(fk))

        for seq in sequences:
            # привязываем sequence к таблице по имени (orders_order_id_seq → orders)
            for tname in tables:
                if tname in seq["sequencename"]:
                    tables[tname]["sequences"].append(dict(seq))

        return {"tables": list(tables.values())}
