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
from db.repositories.tasks import TaskRepository

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

    repo = TaskRepository(sqlite)
    task_row = await repo.get_task_reference(id)

    if not task_row:
        raise HTTPException(status_code=404, detail="Task not found")

    task_id = task_row["id"]
    reference_sql = task_row["reference_sql"]
    order_matters = bool(task_row["order_matters"])
    db_name = task_row["db_name"]

    # 3. Fetch task rules
    rules = await repo.get_task_rules(task_id)

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
    user_id = await repo.get_default_user_id()
    await repo.save_attempt(
        task_id=task_id,
        user_id=user_id,
        sql_text=req.sql,
        is_correct=report.verdict,
        report_json=json.dumps(report_dict)
    )

    return report_dict
