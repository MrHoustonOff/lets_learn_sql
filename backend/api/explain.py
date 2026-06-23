import json
from fastapi import APIRouter, HTTPException
from core import database
import asyncpg
import json
import logging

from schemas.execution import ExplainRequest
from core.exceptions import RollbackTransaction
from core.security import validate_sql
from core.explain_parser import parse_plan

router = APIRouter()

@router.post("/explain")
async def explain_query(req: ExplainRequest):
    is_valid, error = validate_sql(req.sql)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)

    pool = await database.get_user_pool(req.database)
    async with pool.acquire() as conn:
        try:
            async with conn.transaction():
                result = await conn.fetchval(
                    f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {req.sql}"
                )
                raw_json = json.loads(result) if isinstance(result, str) else result
                parsed = parse_plan(raw_json)
                
                # Принудительный откат
                raise RollbackTransaction()

        except RollbackTransaction:
            return {"plan_parsed": parsed, "sql": req.sql}
        except asyncpg.PostgresError as e:
            # возвращаем ошибку — фронт покажет error_block
            return {
                "plan_parsed": None,
                "sql": req.sql,
                "error": str(e)
            }
