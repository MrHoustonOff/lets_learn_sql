import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import asyncpg
from core import database
from core.security import validate_sql

router = APIRouter()

class ExplainRequest(BaseModel):
    sql: str
    database: str = "northwind"   # TODO: MVP+ — мультибд

class RollbackTransaction(Exception):
    pass

@router.post("/explain")
async def explain_query(req: ExplainRequest):
    is_valid, error = validate_sql(req.sql)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    if database.user_pool is None:
        raise HTTPException(status_code=500, detail="Database pool not initialized")

    async with database.user_pool.acquire() as conn:
        try:
            async with conn.transaction():
                result = await conn.fetchval(
                    f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {req.sql}"
                )
                plan = json.loads(result) if isinstance(result, str) else result
                
                # Принудительный откат
                raise RollbackTransaction()

        except RollbackTransaction:
            return {"plan": plan, "sql": req.sql}
        except asyncpg.PostgresError as e:
            # возвращаем ошибку — фронт покажет error_block
            return {
                "plan": None,
                "sql": req.sql,
                "error": str(e)
            }
