from fastapi import APIRouter, HTTPException
import asyncpg
from core import database
from core.security import validate_sql
from core.config import settings
import time
from typing import List

from schemas.execution import QueryRequest, QueryResponse
from core.exceptions import RollbackTransaction

router = APIRouter()

@router.post("/query")
async def run_query(req: QueryRequest) -> QueryResponse:
    is_valid, error = validate_sql(req.sql, is_admin=req.admin_commit)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    if req.admin_commit:
        pool = await database.get_admin_pool(req.database)
    else:
        pool = await database.get_user_pool(req.database)
        
    async with pool.acquire() as conn:
        # statement_timeout — защита от бесконечных запросов
        await conn.execute(f"SET statement_timeout = '{settings.QUERY_TIMEOUT_MS}ms'")

        start = time.monotonic()
        try:
            # РОЛЛБЕК — главное правило проекта (кроме admin_commit)
            async with conn.transaction():
                try:
                    # Создаём SAVEPOINT, чтобы при ошибке не оборвать основную транзакцию
                    async with conn.transaction():
                        records = await conn.fetch(req.sql)
                except asyncpg.exceptions.PostgresSyntaxError as e:
                    if "cannot insert multiple commands into a prepared statement" in str(e):
                        # asyncpg.fetch uses prepared statements which don't support multiple commands separated by ;
                        # Fallback to execute which uses the simple query protocol and supports multiple statements
                        await conn.execute(req.sql)
                        records = []
                    else:
                        raise e
                
                duration_ms = (time.monotonic() - start) * 1000

                if not records:
                    columns, rows, row_count, truncated = [], [], 0, False
                else:
                    columns = list(records[0].keys())
                    rows = []
                    for record in records[:settings.QUERY_ROWS_LIMIT]:
                        row = []
                        for v in record.values():
                            if isinstance(v, (str, int, float, bool, type(None))):
                                row.append(v)
                            else:
                                row.append(str(v))
                        rows.append(row)
                    row_count = len(records)
                    truncated = len(records) > settings.QUERY_ROWS_LIMIT

                # Откатываем транзакцию, если это не админский запрос
                if not req.admin_commit:
                    raise RollbackTransaction()
                else:
                    # Выдаем права llpg_user на случай, если мы создали новые таблицы (DDL)
                    await conn.execute(f"""
                        GRANT USAGE ON SCHEMA public TO {settings.POSTGRES_USER};
                        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {settings.POSTGRES_USER};
                        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {settings.POSTGRES_USER};
                    """)
                    
            # Если admin_commit == True, мы дошли сюда и транзакция успешно закоммичена
            return QueryResponse(
                columns=columns,
                rows=rows,
                row_count=row_count,
                duration_ms=round(duration_ms, 2),
                truncated=truncated
            )

        except RollbackTransaction:
            # Это наш принудительный rollback, возвращаем результат
            return QueryResponse(
                columns=columns,
                rows=rows,
                row_count=row_count,
                duration_ms=round(duration_ms, 2),
                truncated=truncated
            )
        except asyncpg.PostgresError as e:
            raise HTTPException(status_code=400, detail=str(e))
