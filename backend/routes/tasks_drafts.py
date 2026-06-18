import json
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
from core.sqlite_db import get_sqlite_conn

router = APIRouter()

class RuleInput(BaseModel):
    category: str
    condition: str
    params: dict
    severity: str = "blocking"
    message: str = ""

class DraftUpdateInput(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    author_name: Optional[str] = None
    source_url: Optional[str] = None
    difficulty: Optional[str] = None
    database_id: Optional[int] = None
    reference_sql: Optional[str] = None
    order_matters: Optional[bool] = None
    tags: List[str] = []
    rules: List[RuleInput] = []

class CheckDuplicateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    exclude_id: Optional[int] = None

@router.post("/tasks/check_duplicate")
async def check_duplicate_task(payload: CheckDuplicateRequest):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    # We want to check both title count and exact match.
    # exact match requires both title and description to match.
    query = """
        SELECT 
            COUNT(id) as title_count,
            SUM(CASE WHEN description = ? THEN 1 ELSE 0 END) as exact_matches
        FROM tasks 
        WHERE title = ?
    """
    params = [payload.description or "", payload.title]

    if payload.exclude_id:
        query += " AND id != ?"
        params.append(payload.exclude_id)

    async with sqlite.execute(query, params) as cursor:
        row = await cursor.fetchone()

    return {
        "title_matches": row["title_count"] if row else 0,
        "is_exact_duplicate": (row["exact_matches"] or 0) > 0 if row else False
    }

@router.post("/tasks/draft")
async def create_task_draft(request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    async with sqlite.execute(
        "INSERT INTO tasks (title, description, reference_sql, database_id, status) VALUES ('', '', '', 1, 'draft')"
    ) as cursor:
        draft_id = cursor.lastrowid
        
    await sqlite.commit()
    return {"id": draft_id, "status": "draft"}

@router.put("/tasks/{id}")
async def update_task_draft(id: int, payload: DraftUpdateInput, request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    # Update base fields
    await sqlite.execute(
        """
        UPDATE tasks 
        SET title = COALESCE(?, title),
            description = COALESCE(?, description),
            author_name = COALESCE(?, author_name),
            source_url = COALESCE(?, source_url),
            difficulty = COALESCE(?, difficulty),
            database_id = COALESCE(?, database_id),
            reference_sql = COALESCE(?, reference_sql),
            order_matters = COALESCE(?, order_matters),
            updated_at = datetime('now')
        WHERE id = ?
        """,
        (payload.title, payload.description, payload.author_name, payload.source_url,
         payload.difficulty, payload.database_id, payload.reference_sql, payload.order_matters, id)
    )

    # Full Replace Tags
    await sqlite.execute("DELETE FROM task_tags WHERE task_id = ?", (id,))
    for tag_name in payload.tags:
        await sqlite.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))
        async with sqlite.execute("SELECT id FROM tags WHERE name = ?", (tag_name,)) as cursor:
            row = await cursor.fetchone()
            if row:
                await sqlite.execute("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)", (id, row["id"]))

    # Full Replace Rules
    await sqlite.execute("DELETE FROM task_rules WHERE task_id = ?", (id,))
    for i, rule in enumerate(payload.rules):
        await sqlite.execute(
            """
            INSERT INTO task_rules (task_id, category, condition, params_json, severity, message, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (id, rule.category, rule.condition, json.dumps(rule.params), rule.severity, rule.message, i)
        )

    await sqlite.commit()
    return {"status": "ok"}

@router.post("/tasks/{id}/publish")
async def publish_task(id: int, request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    async with sqlite.execute("SELECT * FROM tasks WHERE id = ?", (id,)) as cursor:
        task = await cursor.fetchone()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Validate required fields
    if not task["title"] or not task["description"] or not task["difficulty"] or not task["database_id"]:
        raise HTTPException(status_code=400, detail="Не все обязательные поля заполнены")

    if not task["reference_sql"]:
        raise HTTPException(status_code=400, detail="SQL запрос не заполнен")

    # Change status
    await sqlite.execute("UPDATE tasks SET status = 'published' WHERE id = ?", (id,))
    await sqlite.commit()
    return {"status": "published"}
