"""
submit.py — Submit endpoint.

POST /api/tasks/{id}/submit
  Body: { "sql": "<user query>" }

Reference: правила_сравнения (1).md
"""
import time
import json
from fastapi import APIRouter, HTTPException
from core.sqlite_db import get_sqlite_conn
from core import database as db_module
from core.grader import grade_submission
from core.security import validate_sql

from schemas.execution import SubmitRequest

router = APIRouter()



@router.post("/tasks/{id}/submit")
async def submit_answer(id: int, req: SubmitRequest):
    # 1. Validate SQL safety
    is_valid, err = validate_sql(req.sql)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err)

    # 2. Fetch task data from SQLite
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="SQLite not available")

    task_query = """
        SELECT t.id, t.reference_sql, t.order_matters, d.technical_name AS db_name
        FROM tasks t
        JOIN databases d ON t.database_id = d.id
        WHERE t.id = ?
    """
    async with sqlite.execute(task_query, (id,)) as cur:
        task_row = await cur.fetchone()

    if not task_row:
        raise HTTPException(status_code=404, detail="Task not found")

    task_id = task_row["id"]
    reference_sql = task_row["reference_sql"]
    order_matters = bool(task_row["order_matters"])
    db_name = task_row["db_name"]

    # 3. Fetch task rules
    rules_query = """
        SELECT id, category, condition, params_json, severity, message, sort_order
        FROM task_rules
        WHERE task_id = ?
        ORDER BY sort_order
    """
    async with sqlite.execute(rules_query, (task_id,)) as cur:
        rule_rows = await cur.fetchall()

    rules = [dict(r) for r in rule_rows]

    # 4. Grade
    report = await grade_submission(
        user_sql=req.sql,
        reference_sql=reference_sql,
        db_name=db_name,
        order_matters=order_matters,
        rules=rules,
    )

    report_dict = report.to_dict()

    # 5. Persist attempt in SQLite
    # Get default user_id = 1 (single-user MVP)
    try:
        async with sqlite.execute("SELECT id FROM users LIMIT 1") as cur:
            user_row = await cur.fetchone()
        user_id = user_row["id"] if user_row else 1

        await sqlite.execute(
            """
            INSERT INTO attempts (task_id, user_id, sql_text, is_correct, report_json)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                task_id,
                user_id,
                req.sql,
                1 if report.verdict else 0,
                json.dumps(report_dict),
            ),
        )

        # Prune incorrect attempts: keep only last 5 per spec п. 6.1
        if not report.verdict:
            await sqlite.execute(
                """
                DELETE FROM attempts
                WHERE id IN (
                    SELECT id FROM attempts
                    WHERE task_id = ? AND user_id = ? AND is_correct = 0
                    ORDER BY created_at DESC
                    LIMIT -1 OFFSET 5
                )
                """,
                (task_id, user_id),
            )

        await sqlite.commit()
    except Exception:
        pass  # Persistence failure does not block the grading response

    return report_dict
