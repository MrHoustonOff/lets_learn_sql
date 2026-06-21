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
    is_valid, error = validate_sql(req.sql)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    # user_pool can be None if not initialized
    if database.user_pool is None:
        raise HTTPException(status_code=500, detail="Database pool not initialized")

    async with database.user_pool.acquire() as conn:
        # statement_timeout — защита от бесконечных запросов
        await conn.execute(f"SET statement_timeout = '{settings.QUERY_TIMEOUT_MS}ms'")

        start = time.monotonic()
        try:
            # РОЛЛБЕК — главное правило проекта
            async with conn.transaction():
                records = await conn.fetch(req.sql)
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

                # Для принудительного отката мы можем вызвать raise или использовать transaction rollback.
                # asyncpg.transaction() автоматически делает commit, если нет ошибок!
                # Нам нужен принудительный rollback.
                raise RollbackTransaction()

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
