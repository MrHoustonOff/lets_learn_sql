import json
from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from core.sqlite_db import get_sqlite_conn

from db.repositories.studio import StudioRepository
from schemas.studio import DraftListItem

router = APIRouter()

@router.get("/studio/drafts", response_model=List[DraftListItem])
async def get_studio_drafts(request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = StudioRepository(sqlite)
    
    # ---- Task drafts ----
    task_rows = await repo.get_task_drafts()
    drafts = []
    
    for row in task_rows:
        title = row["title"] if row["title"] else "Без названия"

        if not row["database_id"] or not row["title"] or row["title"] == "Без названия":
            step = "Шаг 1 из 4 (Основное)"
        elif not row["reference_sql"]:
            step = "Шаг 2 из 4 (Решение)"
        elif row["rules_count"] == 0:
            step = "Шаг 3 из 4 (Правила)"
        else:
            step = "Шаг 4 из 4 (Превью)"

        meta = json.loads(row["metadata_json"]) if row["metadata_json"] else {}
        difficulty = meta.get("difficulty", None)
        
        # In case difficulty is a string in DB but model expects int, or vice-versa.
        # The schema uses Optional[int] initially but DB might have 'junior'.
        # We'll map it directly based on original logic.
        try:
            difficulty_int = int(difficulty) if difficulty is not None else None
        except ValueError:
            difficulty_int = None

        tags = []
        if row["tags_json"]:
            parsed_tags = json.loads(row["tags_json"])
            tags = [t for t in parsed_tags if t and t.get('id')]

        drafts.append(DraftListItem(
            id=row["id"],
            type="task",
            title=title,
            step=step,
            updatedAt=row["updated_at"] or row["created_at"] or "",
            difficulty=difficulty_int,
            tags=tags,
        ))

    # ---- Course drafts ----
    course_rows = await repo.get_course_drafts()
    
    for row in course_rows:
        title = row["title"] if row["title"] else "Без названия"
        sections_count = row["sections_count"] or 0
        tasks_count = row["tasks_count"] or 0

        if not row["title"] or row["title"] == "Без названия":
            step = "Шаг 1 из 3 (Информация)"
        elif sections_count == 0:
            step = "Шаг 2 из 3 (Программа)"
        else:
            step = f"Шаг 3 из 3 ({sections_count} разд., {tasks_count} задач)"

        drafts.append(DraftListItem(
            id=row["id"],
            type="course",
            title=title,
            step=step,
            updatedAt=row["updated_at"] or "",
            difficulty=None,
            tags=[]
        ))

    drafts.sort(key=lambda x: x.updatedAt, reverse=True)
    return drafts
