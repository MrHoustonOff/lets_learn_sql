import time
import json
from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from core.sqlite_db import get_sqlite_conn
from core import database as db_module
from core.config import settings

router = APIRouter()

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class TagOut(BaseModel):
    id: int
    name: str

class TaskListItem(BaseModel):
    id: int
    title: str
    difficulty: Optional[int]
    database_id: int
    db_name: str
    db_display_name: str
    is_solved: bool
    is_flagged: bool
    tags: List[TagOut]
    created_at: str
    solved_at: Optional[str]

class TasksListResponse(BaseModel):
    tasks: List[TaskListItem]
    total: int
    tags: List[TagOut]          # All available tags for filter
    databases: List[dict]       # All databases for filter

# ---------------------------------------------------------------------------
# GET /tasks — list with filtering
# ---------------------------------------------------------------------------

@router.get("/tasks", response_model=TasksListResponse)
async def list_tasks(
    request: Request,
    search: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),   # comma-separated ints e.g. "1,2,3"
    tag_ids: Optional[str] = Query(None),       # comma-separated ints
    database_id: Optional[int] = Query(None),
    status: str = Query("all"),                 # all | solved | unsolved | flagged
    sort_by: str = Query("created"),            # created | solved
    sort_dir: str = Query("desc"),              # asc | desc
):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    user_id = getattr(request.state, "user_id", 1)

    # --- Parse filter params ---
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

    # --- Build query ---
    where_clauses = ["t.status = 'published'"]
    params: list = []

    if search:
        where_clauses.append("t.title LIKE ?")
        params.append(f"%{search}%")

    if difficulty_ids:
        placeholders = ",".join("?" * len(difficulty_ids))
        where_clauses.append(f"t.difficulty IN ({placeholders})")
        params.extend(difficulty_ids)

    if database_id:
        where_clauses.append("t.database_id = ?")
        params.append(database_id)

    if status == "solved":
        where_clauses.append(
            "EXISTS(SELECT 1 FROM attempts a WHERE a.task_id=t.id AND a.user_id=? AND a.is_correct=1)"
        )
        params.append(user_id)
    elif status == "unsolved":
        where_clauses.append(
            "NOT EXISTS(SELECT 1 FROM attempts a WHERE a.task_id=t.id AND a.user_id=? AND a.is_correct=1)"
        )
        params.append(user_id)
    elif status == "flagged":
        where_clauses.append(
            "EXISTS(SELECT 1 FROM task_flags tf WHERE tf.task_id=t.id AND tf.user_id=?)"
        )
        params.append(user_id)

    if tag_id_list:
        for tid in tag_id_list:
            where_clauses.append(
                "EXISTS(SELECT 1 FROM task_tags tt WHERE tt.task_id=t.id AND tt.tag_id=?)"
            )
            params.append(tid)

    where_sql = " AND ".join(where_clauses)

    sort_field = "t.created_at" if sort_by == "created" else (
        "(SELECT MAX(a2.created_at) FROM attempts a2 WHERE a2.task_id=t.id AND a2.is_correct=1)"
    )
    sort_direction = "ASC" if sort_dir == "asc" else "DESC"

    query = f"""
        SELECT
            t.id, t.title, t.difficulty, t.database_id, t.created_at,
            d.technical_name as db_name,
            d.display_name as db_display_name,
            EXISTS(
                SELECT 1 FROM attempts a WHERE a.task_id=t.id AND a.user_id=? AND a.is_correct=1
            ) as is_solved,
            EXISTS(
                SELECT 1 FROM task_flags tf WHERE tf.task_id=t.id AND tf.user_id=?
            ) as is_flagged,
            (
                SELECT MAX(a3.created_at) FROM attempts a3
                WHERE a3.task_id=t.id AND a3.user_id=? AND a3.is_correct=1
            ) as solved_at
        FROM tasks t
        JOIN databases d ON t.database_id = d.id
        WHERE {where_sql}
        ORDER BY {sort_field} {sort_direction}
    """
    # user_id appears 3 times (is_solved, is_flagged, solved_at subqueries)
    full_params = [user_id, user_id, user_id] + params

    async with sqlite.execute(query, full_params) as cursor:
        rows = await cursor.fetchall()

    # Fetch tags per task in one query
    if rows:
        task_ids = [r["id"] for r in rows]
        placeholders = ",".join("?" * len(task_ids))
        tags_query = f"""
            SELECT tt.task_id, tg.id as tag_id, tg.name
            FROM task_tags tt
            JOIN tags tg ON tg.id = tt.tag_id
            WHERE tt.task_id IN ({placeholders})
        """
        async with sqlite.execute(tags_query, task_ids) as tcur:
            tag_rows = await tcur.fetchall()

        # Build task_id -> tags map
        tags_map: dict[int, list[TagOut]] = {}
        for tr in tag_rows:
            tags_map.setdefault(tr["task_id"], []).append(
                TagOut(id=tr["tag_id"], name=tr["name"])
            )
    else:
        tags_map = {}

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
            tags=tags_map.get(r["id"], []),
            created_at=str(r["created_at"]),
            solved_at=str(r["solved_at"]) if r["solved_at"] else None,
        )
        for r in rows
    ]

    # All available tags for filter panel
    async with sqlite.execute("SELECT id, name FROM tags ORDER BY name") as tcur:
        all_tags = [TagOut(id=tr["id"], name=tr["name"]) for tr in await tcur.fetchall()]

    # All databases for filter panel
    async with sqlite.execute("SELECT id, technical_name, display_name FROM databases ORDER BY display_name") as dcur:
        all_dbs = [{"id": dr["id"], "technical_name": dr["technical_name"], "display_name": dr["display_name"]} for dr in await dcur.fetchall()]

    return TasksListResponse(tasks=tasks_out, total=len(tasks_out), tags=all_tags, databases=all_dbs)



class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    hint: Optional[str]
    db_name: str
    is_bookmarked: bool
    is_solved: bool
    author_name: Optional[str] = None
    author_url: Optional[str] = None
    reference_sql: Optional[str] = None
    tags: List[TagOut] = []

class SolutionResponse(BaseModel):
    solution_sql: str
    columns: List[str]
    rows: List[List]
    row_count: int
    duration_ms: float

@router.get("/tasks/{id}", response_model=TaskResponse)
async def get_task_details(id: int, request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    user_id = getattr(request.state, "user_id", 1)

    query = """
        SELECT t.id, t.title, t.description, t.metadata_json, d.technical_name as db_name,
               t.author_name, t.author_url, t.reference_sql,
               EXISTS(SELECT 1 FROM task_flags tf WHERE tf.task_id = t.id AND tf.user_id = ?) as is_bookmarked,
               EXISTS(SELECT 1 FROM attempts a WHERE a.task_id = t.id AND a.user_id = ? AND a.is_correct = 1) as is_solved
        FROM tasks t
        JOIN databases d ON t.database_id = d.id
        WHERE t.id = ?
    """
    
    async with sqlite.execute(query, (user_id, user_id, id)) as cursor:
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
            
    import json
    hint = None
    if row["metadata_json"]:
        try:
            meta = json.loads(row["metadata_json"])
            hint = meta.get("hint")
        except Exception:
            pass
            
    async with sqlite.execute(
        "SELECT tg.id, tg.name FROM tags tg JOIN task_tags tt ON tg.id = tt.tag_id WHERE tt.task_id = ?",
        (id,)
    ) as tcur:
        tags_list = [{"id": r["id"], "name": r["name"]} for r in await tcur.fetchall()]

    is_solved = bool(row["is_solved"])

    return TaskResponse(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        hint=hint,
        db_name=row["db_name"],
        is_bookmarked=bool(row["is_bookmarked"]),
        is_solved=is_solved,
        author_name=row["author_name"],
        author_url=row["author_url"],
        reference_sql=row["reference_sql"] if is_solved else None,
        tags=tags_list
    )

@router.delete("/tasks/{id}")
async def delete_task(id: int):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    await sqlite.execute("DELETE FROM tasks WHERE id = ?", (id,))
    await sqlite.commit()
    return {"status": "ok"}


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
    try:
        # Connect to Postgres (using the task's database)
        # Note: since user_pool is tied to settings.POSTGRES_DB (default "northwind"), 
        # for dynamic multi-db we can create a temporary connection if it's not the default db!
        # Wait, for now settings.POSTGRES_DB is "northwind", which matches row["db_name"]. 
        # If it's different, we can connect using asyncpg.connect()
        if db_name == settings.POSTGRES_DB:
            async with db_module.user_pool.acquire() as conn:
                await conn.execute(f"SET statement_timeout = '{settings.QUERY_TIMEOUT_MS}ms'")
                async with conn.transaction():
                    records = await conn.fetch(solution_sql)
        else:
            # Connect dynamically to the specific database
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
                await conn.execute(f"SET statement_timeout = '{settings.QUERY_TIMEOUT_MS}ms'")
                async with conn.transaction():
                    records = await conn.fetch(solution_sql)
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

# -----------------------------------------------------------------------------
# Attempts History
# -----------------------------------------------------------------------------

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
            report = json.loads(row["report_json"])
            duration = report.get("duration_ms", 0)
        except Exception:
            report = {}
            duration = 0

        # SQLite stores CURRENT_TIMESTAMP in UTC, but without 'Z' or 'T'
        created_at_str = str(row["created_at"]).replace(" ", "T")
        if not created_at_str.endswith("Z"):
            created_at_str += "Z"

        results.append({
            "id": row["id"],
            "attempt_id": str(row["id"]), # for frontend
            "sql": row["sql_text"],
            "verdict": bool(row["is_correct"]),
            "created_at": created_at_str,
            "date": created_at_str, # for frontend compat
            "duration_ms": duration,
            "report": report
        })

    return results

@router.delete("/tasks/{id}/attempts/{attempt_id}")
async def delete_task_attempt(id: int, attempt_id: int, request: Request):
    """Delete a specific attempt."""
    sqlite = await get_sqlite_conn()
    user_id = getattr(request.state, "user_id", 1)
    
    await sqlite.execute(
        "DELETE FROM attempts WHERE id = ? AND task_id = ? AND user_id = ?",
        (attempt_id, id, user_id)
    )
    await sqlite.commit()
    return {"status": "ok"}

@router.delete("/tasks/{id}/attempts")
async def delete_all_task_attempts(id: int, request: Request, type: str = "all"):
    """Mass delete attempts: 'all', 'correct', 'incorrect'."""
    sqlite = await get_sqlite_conn()
    user_id = getattr(request.state, "user_id", 1)

    if type == "all":
        await sqlite.execute("DELETE FROM attempts WHERE task_id = ? AND user_id = ?", (id, user_id))
    elif type == "correct":
        await sqlite.execute("DELETE FROM attempts WHERE task_id = ? AND user_id = ? AND is_correct = 1", (id, user_id))
    elif type == "incorrect":
        await sqlite.execute("DELETE FROM attempts WHERE task_id = ? AND user_id = ? AND is_correct = 0", (id, user_id))
    else:
        raise HTTPException(status_code=400, detail="Invalid type")

    await sqlite.commit()
    return {"status": "ok"}

@router.post("/tasks/{id}/bookmark")
async def toggle_bookmark(id: int, request: Request):
    """Toggle bookmark state for a task."""
    sqlite = await get_sqlite_conn()
    user_id = getattr(request.state, "user_id", 1)
    
    # Check if already bookmarked
    async with sqlite.execute("SELECT 1 FROM task_flags WHERE task_id = ? AND user_id = ?", (id, user_id)) as cursor:
        existing = await cursor.fetchone()
        
    if existing:
        await sqlite.execute("DELETE FROM task_flags WHERE task_id = ? AND user_id = ?", (id, user_id))
        is_bookmarked = False
    else:
        await sqlite.execute("INSERT INTO task_flags (task_id, user_id) VALUES (?, ?)", (id, user_id))
        is_bookmarked = True
        
    await sqlite.commit()
    return {"is_bookmarked": is_bookmarked}
