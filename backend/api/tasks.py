from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional

from core.sqlite_db import get_sqlite_conn
from db.repositories.tasks import TaskRepository
from services.tasks import TaskService
from schemas.tasks import TasksListResponse, TaskResponse

router = APIRouter()

@router.get("/tasks", response_model=TasksListResponse)
async def list_tasks(
    request: Request,
    search: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    tag_ids: Optional[str] = Query(None),
    course_ids: Optional[str] = Query(None),
    database_id: Optional[int] = Query(None),
    status: str = Query("all"),
    sort_by: str = Query("created"),
    sort_dir: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    user_id = getattr(request.state, "user_id", 1)
    repo = TaskRepository(sqlite)
    svc = TaskService(repo)

    return await svc.list_tasks(
        search, difficulty, tag_ids, course_ids,
        database_id, status, sort_by, sort_dir, page, page_size, user_id
    )

@router.get("/tasks/{id}", response_model=TaskResponse)
async def get_task_details(id: int, request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    user_id = getattr(request.state, "user_id", 1)
    repo = TaskRepository(sqlite)
    svc = TaskService(repo)
    
    try:
        return await svc.get_task_details(id, user_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/tasks/{id}")
async def delete_task(id: int):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    repo = TaskRepository(sqlite)
    await repo.delete_task(id)
    return {"status": "ok"}

# -----------------------------------------------------------------------------
# Attempts History
# -----------------------------------------------------------------------------

@router.get("/tasks/{id}/attempts")
async def get_task_attempts(id: int, request: Request):
    """Fetch history of attempts for a specific task."""
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    user_id = getattr(request.state, "user_id", 1)
    repo = TaskRepository(sqlite)
    svc = TaskService(repo)
    return await svc.get_task_attempts(id, user_id)

@router.delete("/tasks/{id}/attempts/{attempt_id}")
async def delete_task_attempt(id: int, attempt_id: int, request: Request):
    """Delete a specific attempt."""
    sqlite = await get_sqlite_conn()
    user_id = getattr(request.state, "user_id", 1)
    repo = TaskRepository(sqlite)
    await repo.delete_task_attempt(id, attempt_id, user_id)
    return {"status": "ok"}

@router.delete("/tasks/{id}/attempts")
async def delete_all_task_attempts(id: int, request: Request, type: str = "all"):
    """Mass delete attempts: 'all', 'correct', 'incorrect'."""
    sqlite = await get_sqlite_conn()
    user_id = getattr(request.state, "user_id", 1)
    repo = TaskRepository(sqlite)
    await repo.delete_all_task_attempts(id, user_id, type)
    return {"status": "ok"}
