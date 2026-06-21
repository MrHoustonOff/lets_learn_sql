import time
from fastapi import APIRouter, HTTPException, Request
from typing import List
from core.sqlite_db import get_sqlite_conn
from core import database as db_module
from core.config import settings
from db.repositories.tasks import TaskRepository

from schemas.tasks import SolutionResponse, RuleInput, CheckRulesRequest
from core.exceptions import RollbackTransaction

router = APIRouter()


@router.post("/tasks/{id}/execute-reference", response_model=SolutionResponse)
async def execute_reference_sql(id: int, request: Request):
    return await get_task_solution(id)

@router.post("/tasks/{id}/check_rules")
async def check_task_rules(id: int, req: CheckRulesRequest):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    repo = TaskRepository(sqlite)
    task_row = await repo.get_task_reference(id)
    if not task_row:
        raise HTTPException(status_code=404, detail="Task not found")
        
    if not task_row["reference_sql"]:
        raise HTTPException(status_code=400, detail="No reference SQL available")

    rules = []
    for r in req.rules:
        from core.grader import parse_rule
        pr = parse_rule(r.model_dump())
        if pr:
            rules.append(pr)

    if not rules:
        return {"rules": []}

    from core.grader import _get_conn, run_stage2
    
    conn = await _get_conn(task_row["db_name"])
    try:
        stage2 = await run_stage2(conn, task_row["reference_sql"], rules)
        def _rule(r):
            return {
                "rule_id": r.rule_id, # This maps back to the index in req.rules
                "passed": r.passed,
                "severity": r.severity,
                "message": r.message,
                "detail_msg": getattr(r, "detail_msg", None)
            }
        return {"rules": [_rule(r) for r in stage2.rules]}
    finally:
        await conn.close()

@router.post("/tasks/{id}/solution", response_model=SolutionResponse)
async def get_task_solution(id: int):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    repo = TaskRepository(sqlite)
    row = await repo.get_task_reference(id)
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
            
    solution_sql = row["reference_sql"]
    db_name = row["db_name"]
    
    if db_module.user_pool is None:
        raise HTTPException(status_code=500, detail="Database pool not initialized")
        
    start = time.monotonic()
    
    async def _run_with_rollback(conn):
        await conn.execute(f"SET statement_timeout = '{settings.QUERY_TIMEOUT_MS}ms'")
        try:
            async with conn.transaction():
                records = await conn.fetch(solution_sql)
                raise RollbackTransaction(records)
        except RollbackTransaction as e:
            return e.args[0]

    try:
        if db_name == settings.POSTGRES_DB:
            async with db_module.user_pool.acquire() as conn:
                records = await _run_with_rollback(conn)
        else:
            pool = db_module.get_tenant_pool(db_name)
            if not pool:
                raise HTTPException(status_code=404, detail=f"Database {db_name} not found or pool not created")
            async with pool.acquire() as conn:
                records = await _run_with_rollback(conn)
                
        duration_ms = (time.monotonic() - start) * 1000
        
        if not records:
            return SolutionResponse(solution_sql=solution_sql, columns=[], rows=[], row_count=0, duration_ms=duration_ms)
            
        columns = list(records[0].keys())
        rows_data = [list(r.values()) for r in records]
        
        return SolutionResponse(
            solution_sql=solution_sql,
            columns=columns,
            rows=rows_data,
            row_count=len(records),
            duration_ms=duration_ms
        )
        
    except Exception as e:
        duration_ms = (time.monotonic() - start) * 1000
        raise HTTPException(status_code=400, detail=str(e))
