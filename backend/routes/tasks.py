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

class CourseOut(BaseModel):
    id: int
    title: str

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
    courses: List[CourseOut]
    created_at: str
    solved_at: Optional[str]

class TasksListResponse(BaseModel):
    tasks: List[TaskListItem]
    total: int
    tags: List[TagOut]          # All available tags for filter
    courses: List[CourseOut]    # All available courses for filter
    databases: List[dict]       # All databases for filter

# ---------------------------------------------------------------------------
# GET /studio/drafts — list of drafts
# ---------------------------------------------------------------------------

class DraftListItem(BaseModel):
    id: int
    type: str
    title: str
    step: str
    updatedAt: str
    difficulty: Optional[int] = None
    tags: Optional[List[dict]] = None

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


# ---------------------------------------------------------------------------
# GET /tasks — list with filtering
# ---------------------------------------------------------------------------

@router.get("/tasks", response_model=TasksListResponse)
async def list_tasks(
    request: Request,
    search: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),   # comma-separated ints e.g. "1,2,3"
    tag_ids: Optional[str] = Query(None),       # comma-separated ints
    course_ids: Optional[str] = Query(None),    # comma-separated ints
    database_id: Optional[int] = Query(None),
    status: str = Query("all"),                 # all | solved | unsolved | flagged
    sort_by: str = Query("created"),            # created | solved
    sort_dir: str = Query("desc"),              # asc | desc
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
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

    course_id_list: list[int] = []
    if course_ids:
        try:
            course_id_list = [int(x.strip()) for x in course_ids.split(",") if x.strip()]
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

    if course_id_list:
        for cid in course_id_list:
            where_clauses.append(
                "EXISTS(SELECT 1 FROM section_tasks st JOIN sections s ON s.id = st.section_id WHERE st.task_id=t.id AND s.course_id=?)"
            )
            params.append(cid)

    where_sql = " AND ".join(where_clauses)

    sort_field = "t.created_at" if sort_by == "created" else (
        "(SELECT MAX(a2.created_at) FROM attempts a2 WHERE a2.task_id=t.id AND a2.is_correct=1)"
    )
    sort_direction = "ASC" if sort_dir == "asc" else "DESC"

    # --- Count total items ---
    count_query = f"SELECT COUNT(*) as c FROM tasks t WHERE {where_sql}"
    async with sqlite.execute(count_query, params) as ccur:
        count_row = await ccur.fetchone()
        total_items = count_row["c"] if count_row else 0

    # --- Main query with pagination ---
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
        LIMIT ? OFFSET ?
    """
    # user_id appears 3 times (is_solved, is_flagged, solved_at subqueries)
    offset = (page - 1) * page_size
    full_params = [user_id, user_id, user_id] + params + [page_size, offset]

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

        # Fetch courses per task
        courses_query = f"""
            SELECT st.task_id, c.id as course_id, c.title
            FROM section_tasks st
            JOIN sections s ON s.id = st.section_id
            JOIN courses c ON c.id = s.course_id
            WHERE st.task_id IN ({placeholders})
        """
        async with sqlite.execute(courses_query, task_ids) as ccur:
            course_rows = await ccur.fetchall()
            
        courses_map: dict[int, list[CourseOut]] = {}
        for cr in course_rows:
            # We use a set or list? A task could theoretically appear in multiple sections of the SAME course.
            # It's better to just build it. We'll rely on DISTINCT-like logic if needed, but for now just append
            courses_list = courses_map.setdefault(cr["task_id"], [])
            if not any(c.id == cr["course_id"] for c in courses_list):
                courses_list.append(CourseOut(id=cr["course_id"], title=cr["title"]))
    else:
        tags_map = {}
        courses_map = {}

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
            courses=courses_map.get(r["id"], []),
            created_at=str(r["created_at"]),
            solved_at=str(r["solved_at"]) if r["solved_at"] else None,
        )
        for r in rows
    ]

    # All available tags for filter panel
    async with sqlite.execute("SELECT id, name FROM tags ORDER BY name") as tcur:
        all_tags = [TagOut(id=tr["id"], name=tr["name"]) for tr in await tcur.fetchall()]

    # All available courses for filter panel
    async with sqlite.execute("SELECT id, title FROM courses ORDER BY title") as ccur:
        all_courses = [CourseOut(id=cr["id"], title=cr["title"]) for cr in await ccur.fetchall()]

    # All databases for filter panel
    async with sqlite.execute("SELECT id, technical_name, display_name FROM databases ORDER BY display_name") as dcur:
        all_dbs = [{"id": dr["id"], "technical_name": dr["technical_name"], "display_name": dr["display_name"]} for dr in await dcur.fetchall()]

    return TasksListResponse(tasks=tasks_out, total=total_items, tags=all_tags, courses=all_courses, databases=all_dbs)



class TaskResponse(BaseModel):
    id: int
    title: Optional[str]
    difficulty: Optional[int]
    description: Optional[str]
    hint: Optional[str]
    database_id: Optional[int]
    db_name: Optional[str]
    is_bookmarked: bool
    is_solved: bool
    author_name: Optional[str] = None
    source_url: Optional[str] = None
    reference_sql: Optional[str] = None
    status: str
    order_matters: bool
    tags: List[str] = []
    courses: List[CourseOut] = []
    rules: List[dict] = []

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

class SolutionResponse(BaseModel):
    solution_sql: str
    columns: List[str]
    rows: List[List]
    row_count: int
    duration_ms: float

class CheckDuplicateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    exclude_id: Optional[int] = None

# ---------------------------------------------------------------------------
# Task Draft System
# ---------------------------------------------------------------------------

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

@router.post("/tasks/{id}/execute-reference", response_model=SolutionResponse)
async def execute_reference_sql(id: int, request: Request):
    return await get_task_solution(id)

class CheckRulesRequest(BaseModel):
    rules: List[RuleInput]

@router.post("/tasks/{id}/check_rules")
async def check_task_rules(id: int, req: CheckRulesRequest):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    async with sqlite.execute("SELECT t.reference_sql, d.technical_name as db_name FROM tasks t JOIN databases d ON t.database_id = d.id WHERE t.id = ?", (id,)) as cur:
        task_row = await cur.fetchone()
    
    if not task_row or not task_row["reference_sql"]:
        raise HTTPException(status_code=400, detail="SQL запрос (reference_sql) не задан")
        
    rules = []
    for i, r in enumerate(req.rules):
        rules.append({
            "id": i, # Temporary ID for matching
            "category": r.category,
            "condition": r.condition,
            "params": r.params,
            "severity": r.severity,
            "message": r.message
        })
    
    if not rules:
        return {"rules": []}

    from core.grader import _get_conn, run_stage2
    
    conn = await _get_conn(task_row["db_name"])
    try:
        stage2 = await run_stage2(conn, task_row["reference_sql"], rules)
        def _rule(r):
            return {
                "rule_id": r.rule_id, # This maps back to the index in req.rules
                "passed": r.passed,
                "severity": r.severity,
                "message": r.message,
                "detail_msg": getattr(r, "detail_msg", None)
            }
        return {"rules": [_rule(r) for r in stage2.rules]}
    finally:
        await conn.close()

@router.get("/tasks/{id}", response_model=TaskResponse)
async def get_task_details(id: int, request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    user_id = getattr(request.state, "user_id", 1)

    query = """
        SELECT t.id, t.title, t.difficulty, t.database_id, t.description, t.metadata_json, d.technical_name as db_name,
               t.author_name, t.source_url, t.reference_sql, t.status, t.order_matters,
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
        "SELECT tg.name FROM tags tg JOIN task_tags tt ON tg.id = tt.tag_id WHERE tt.task_id = ?",
        (id,)
    ) as tcur:
        tags_list = [r["name"] for r in await tcur.fetchall()]

    async with sqlite.execute(
        """
        SELECT c.id, c.title
        FROM courses c
        JOIN sections s ON c.id = s.course_id
        JOIN section_tasks st ON s.id = st.section_id
        WHERE st.task_id = ?
        """,
        (id,)
    ) as ccur:
        courses_list = [{"id": r["id"], "title": r["title"]} for r in await ccur.fetchall()]

    async with sqlite.execute(
        "SELECT category, condition, params_json, severity, message FROM task_rules WHERE task_id = ? ORDER BY sort_order",
        (id,)
    ) as rcur:
        rules_list = []
        for r in await rcur.fetchall():
            try:
                params = json.loads(r["params_json"])
            except:
                params = {}
            rules_list.append({
                "category": r["category"],
                "condition": r["condition"],
                "params": params,
                "severity": r["severity"],
                "message": r["message"]
            })

    is_solved = bool(row["is_solved"])

    return TaskResponse(
        id=row["id"],
        title=row["title"],
        difficulty=row["difficulty"],
        database_id=row["database_id"],
        description=row["description"],
        hint=hint,
        db_name=row["db_name"],
        is_bookmarked=bool(row["is_bookmarked"]),
        is_solved=is_solved,
        author_name=row["author_name"],
        source_url=row["source_url"],
        reference_sql=row["reference_sql"],
        status=row["status"],
        order_matters=bool(row["order_matters"]),
        tags=tags_list,
        courses=courses_list,
        rules=rules_list
    )

@router.delete("/tasks/{id}")
async def delete_task(id: int):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
    
    await sqlite.execute("DELETE FROM tasks WHERE id = ?", (id,))
    await sqlite.commit()
    return {"status": "ok"}


class RollbackTransaction(Exception):
    pass

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
    
    async def _run_with_rollback(conn):
        await conn.execute(f"SET statement_timeout = '{settings.QUERY_TIMEOUT_MS}ms'")
        try:
            async with conn.transaction():
                records = await conn.fetch(solution_sql)
                raise RollbackTransaction(records)
        except RollbackTransaction as e:
            return e.args[0]

    try:
        if db_name == settings.POSTGRES_DB:
            async with db_module.user_pool.acquire() as conn:
                records = await _run_with_rollback(conn)
        else:
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
                records = await _run_with_rollback(conn)
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
