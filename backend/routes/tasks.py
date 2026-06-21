import json
from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional, List

from core.sqlite_db import get_sqlite_conn
from db.repositories.tasks import TaskRepository
from schemas.tasks import (
    TasksListResponse, TaskResponse, TaskListItem,
    TagOut, CourseOut
)

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

    difficulty_ids: list[int] = []
    if difficulty:
        try:
            difficulty_ids = [int(x.strip()) for x in difficulty.split(",") if x.strip()]
        except ValueError:
            pass

    tag_id_list: list[int] = []
    if tag_ids:
        try:
            tag_id_list = [int(x.strip()) for x in tag_ids.split(",") if x.strip()]
        except ValueError:
            pass

    course_id_list: list[int] = []
    if course_ids:
        try:
            course_id_list = [int(x.strip()) for x in course_ids.split(",") if x.strip()]
        except ValueError:
            pass

    result = await repo.list_tasks(
        search, difficulty_ids, tag_id_list, course_id_list,
        database_id, status, sort_by, sort_dir, page, page_size, user_id
    )

    tasks_out = [
        TaskListItem(
            id=r["id"],
            title=r["title"],
            difficulty=r["difficulty"],
            database_id=r["database_id"],
            db_name=r["db_name"],
            db_display_name=r["db_display_name"],
            is_solved=bool(r["is_solved"]),
            is_flagged=bool(r["is_flagged"]),
            tags=[TagOut(**t) for t in result["tags_map"].get(r["id"], [])],
            courses=[CourseOut(**c) for c in result["courses_map"].get(r["id"], [])],
            created_at=str(r["created_at"]),
            solved_at=str(r["solved_at"]) if r["solved_at"] else None,
        )
        for r in result["rows"]
    ]

    all_tags = [TagOut(**t) for t in result["all_tags"]]
    all_courses = [CourseOut(**c) for c in result["all_courses"]]

    return TasksListResponse(
        tasks=tasks_out,
        total=result["total_items"],
        tags=all_tags,
        courses=all_courses,
        databases=result["all_dbs"]
    )


@router.get("/tasks/{id}", response_model=TaskResponse)
async def get_task_details(id: int, request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    user_id = getattr(request.state, "user_id", 1)
    repo = TaskRepository(sqlite)
    
    details = await repo.get_task_details(id, user_id)
    if not details:
        raise HTTPException(status_code=404, detail="Task not found")
        
    row = details["row"]
    hint = None
    if row["metadata_json"]:
        try:
            meta = json.loads(row["metadata_json"])
            hint = meta.get("hint")
        except Exception:
            pass

    return TaskResponse(
        id=row["id"],
        title=row["title"],
        difficulty=row["difficulty"],
        database_id=row["database_id"],
        description=row["description"],
        hint=hint,
        db_name=row["db_name"],
        is_bookmarked=bool(row["is_bookmarked"]),
        is_solved=bool(row["is_solved"]),
        author_name=row["author_name"],
        source_url=row["source_url"],
        reference_sql=row["reference_sql"],
        status=row["status"],
        order_matters=bool(row["order_matters"]),
        tags=details["tags_list"],
        courses=details["courses_list"],
        rules=details["rules_list"]
    )

@router.delete("/tasks/{id}")
async def delete_task(id: int):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    repo = TaskRepository(sqlite)
    await repo.delete_task(id)
    return {"status": "ok"}
