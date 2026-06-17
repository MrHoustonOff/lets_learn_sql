import time
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List
from core.sqlite_db import get_sqlite_conn
from core import database as db_module
from core.config import settings

router = APIRouter()

class SolutionResponse(BaseModel):
    solution_sql: str
    columns: List[str]
    rows: List[List]
    row_count: int
    duration_ms: float

class RuleInput(BaseModel):
    category: str
    condition: str
    params: dict
    severity: str = "blocking"
    message: str = ""

class CheckRulesRequest(BaseModel):
    rules: List[RuleInput]

class RollbackTransaction(Exception):
    pass

@router.post("/tasks/{id}/execute-reference", response_model=SolutionResponse)
async def execute_reference_sql(id: int, request: Request):
    return await get_task_solution(id)

@router.post("/tasks/{id}/check_rules")
async def check_task_rules(id: int, req: CheckRulesRequest):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    async with sqlite.execute("SELECT t.reference_sql, d.technical_name as db_name FROM tasks t JOIN databases d ON t.database_id = d.id WHERE t.id = ?", (id,)) as cur:
        task_row = await cur.fetchone()
    
    if not task_row or not task_row["reference_sql"]:
        raise HTTPException(status_code=400, detail="SQL запрос (reference_sql) не задан")
        
    rules = []
    for i, r in enumerate(req.rules):
        rules.append({
            "id": i, # Temporary ID for matching
            "category": r.category,
            "condition": r.condition,
            "params": r.params,
            "severity": r.severity,
            "message": r.message
        })
    
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
        
    # 1. Fetch task reference_sql and database name
    query_str = """
        SELECT t.reference_sql, d.technical_name as db_name
        FROM tasks t
        JOIN databases d ON t.database_id = d.id
        WHERE t.id = ?
    """
    async with sqlite.execute(query_str, (id,)) as cursor:
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
            
    solution_sql = row["reference_sql"]
    db_name = row["db_name"]
    
    # 2. Run the solution query on Postgres to return the reference result
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
            import asyncpg
            conn = await asyncpg.connect(
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD,
                database=db_name,
                timeout=5.0
            )
            try:
                records = await _run_with_rollback(conn)
            finally:
                await conn.close()
                
        duration_ms = (time.monotonic() - start) * 1000
        
        if not records:
            columns, rows, row_count = [], [], 0
        else:
            columns = list(records[0].keys())
            rows = []
            for record in records[:settings.QUERY_ROWS_LIMIT]:
                row_data = []
                for v in record.values():
                    if isinstance(v, (str, int, float, bool, type(None))):
                        row_data.append(v)
                    else:
                        row_data.append(str(v))
                rows.append(row_data)
            row_count = len(records)
            
        return SolutionResponse(
            solution_sql=solution_sql,
            columns=columns,
            rows=rows,
            row_count=row_count,
            duration_ms=round(duration_ms, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Reference SQL error: {str(e)}")

@router.get("/tasks/{id}/attempts")
async def get_task_attempts(id: int, request: Request):
    """Fetch history of attempts for a specific task."""
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    # Hardcoded user_id=1 for now (per initial structure)
    user_id = getattr(request.state, "user_id", 1)

    query = """
        SELECT id, sql_text, is_correct, report_json, created_at
        FROM attempts
        WHERE task_id = ? AND user_id = ?
        ORDER BY created_at DESC
    """
    async with sqlite.execute(query, (id, user_id)) as cursor:
        rows = await cursor.fetchall()

    import json
    results = []
    for row in rows:
        try:
            report = json.loads(row["report_json"]) if row["report_json"] else None
        except:
            report = None
            
        results.append({
            "id": row["id"],
            "sql": row["sql_text"],
            "is_correct": bool(row["is_correct"]),
            "report": report,
            "created_at": row["created_at"]
        })

    return results
