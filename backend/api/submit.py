"""
submit.py — Submit endpoint.

POST /api/tasks/{id}/submit
  Body: { "sql": "<user query>" }

Reference: правила_сравнения (1).md
"""
from fastapi import APIRouter, HTTPException
from core.sqlite_db import get_sqlite_conn

from schemas.execution import SubmitRequest
from db.repositories.tasks import TaskRepository
from services.execution import TaskExecutionService

router = APIRouter()

@router.post("/tasks/{id}/submit")
async def submit_answer(id: int, req: SubmitRequest):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="SQLite not available")

    repo = TaskRepository(sqlite)
    svc = TaskExecutionService(repo)

    try:
        return await svc.submit_answer(id, req.sql)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
