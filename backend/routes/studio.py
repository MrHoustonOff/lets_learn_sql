import json
from fastapi import APIRouter, HTTPException, Request
from typing import List, Optional
from core.sqlite_db import get_sqlite_conn

from schemas.studio import DraftListItem

router = APIRouter()

@router.get("/studio/drafts", response_model=List[DraftListItem])
async def get_studio_drafts(request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    # ---- Task drafts ----
    task_query = """
        SELECT t.id, t.title, t.created_at, t.updated_at, t.reference_sql, t.database_id, t.metadata_json,
               (SELECT COUNT(*) FROM task_rules r WHERE r.task_id = t.id) as rules_count,
               (
                   SELECT json_group_array(json_object('id', tags.id, 'name', tags.name))
                   FROM task_tags
                   JOIN tags ON task_tags.tag_id = tags.id
                   WHERE task_tags.task_id = t.id
               ) as tags_json
        FROM tasks t
        WHERE t.status = 'draft'
        ORDER BY t.updated_at DESC
    """

    async with sqlite.execute(task_query) as cursor:
        task_rows = await cursor.fetchall()

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

        tags = []
        if row["tags_json"]:
            parsed_tags = json.loads(row["tags_json"])
            tags = [t for t in parsed_tags if t and t.get('id')]

        drafts.append({
            "id": row["id"],
            "type": "task",
            "title": title,
            "step": step,
            "updatedAt": row["updated_at"] or row["created_at"],
            "difficulty": difficulty,
            "tags": tags,
        })

    # ---- Course drafts ----
    course_query = """
        SELECT c.id, c.title, c.updated_at,
               (SELECT COUNT(*) FROM sections s WHERE s.course_id = c.id) as sections_count,
               (
                   SELECT COUNT(DISTINCT st.task_id)
                   FROM section_tasks st
                   JOIN sections s ON st.section_id = s.id
                   WHERE s.course_id = c.id
               ) as tasks_count
        FROM courses c
        WHERE c.status = 'draft'
        ORDER BY c.updated_at DESC
    """

    async with sqlite.execute(course_query) as cursor:
        course_rows = await cursor.fetchall()

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

        drafts.append({
            "id": row["id"],
            "type": "course",
            "title": title,
            "step": step,
            "updatedAt": row["updated_at"],
            "difficulty": None,
            "tags": [],
        })

    # Sort all drafts by updatedAt desc
    drafts.sort(key=lambda x: x["updatedAt"] or "", reverse=True)

    return drafts
