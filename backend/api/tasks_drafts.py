import json
from fastapi import APIRouter, HTTPException, Request

from core.sqlite_db import get_sqlite_conn
from db.repositories.tasks import TaskRepository
from schemas.tasks import DraftUpdateInput, CheckDuplicateRequest

router = APIRouter()

@router.post("/tasks/check_duplicate")
async def check_duplicate_task(payload: CheckDuplicateRequest):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = TaskRepository(sqlite)
    return await repo.check_duplicate(payload.title, payload.description, payload.exclude_id)

@router.post("/tasks/draft")
async def create_task_draft(request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    repo = TaskRepository(sqlite)
    draft_id = await repo.create_task_draft()
    return {"id": draft_id, "status": "draft"}

@router.put("/tasks/{id}")
async def update_task_draft(id: int, payload: DraftUpdateInput, request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = TaskRepository(sqlite)
    await repo.update_task_draft(
        task_id=id,
        title=payload.title,
        description=payload.description,
        author_name=payload.author_name,
        source_url=payload.source_url,
        difficulty=payload.difficulty,
        database_id=payload.database_id,
        reference_sql=payload.reference_sql,
        order_matters=payload.order_matters,
        tags=payload.tags,
        rules=payload.rules
    )
    return {"status": "ok"}

@router.post("/tasks/{id}/publish")
async def publish_task(id: int, request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = TaskRepository(sqlite)
    try:
        task = await repo.publish_task(id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"status": "published"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
