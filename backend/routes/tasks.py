from fastapi import APIRouter, HTTPException, Request, Query
from pydantic import BaseModel
from typing import Optional, List
from core.sqlite_db import get_sqlite_conn
import json

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
    tags: List[TagOut]
    courses: List[CourseOut]
    databases: List[dict]

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

# ---------------------------------------------------------------------------
# GET /tasks — list with filtering
# ---------------------------------------------------------------------------

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
        where_clauses.append("EXISTS(SELECT 1 FROM attempts a WHERE a.task_id=t.id AND a.user_id=? AND a.is_correct=1)")
        params.append(user_id)
    elif status == "unsolved":
        where_clauses.append("NOT EXISTS(SELECT 1 FROM attempts a WHERE a.task_id=t.id AND a.user_id=? AND a.is_correct=1)")
        params.append(user_id)
    elif status == "flagged":
        where_clauses.append("EXISTS(SELECT 1 FROM task_flags tf WHERE tf.task_id=t.id AND tf.user_id=?)")
        params.append(user_id)

    if tag_id_list:
        for tid in tag_id_list:
            where_clauses.append("EXISTS(SELECT 1 FROM task_tags tt WHERE tt.task_id=t.id AND tt.tag_id=?)")
            params.append(tid)

    if course_id_list:
        for cid in course_id_list:
            where_clauses.append("EXISTS(SELECT 1 FROM section_tasks st JOIN sections s ON s.id = st.section_id WHERE st.task_id=t.id AND s.course_id=?)")
            params.append(cid)

    where_sql = " AND ".join(where_clauses)
    sort_field = "t.created_at" if sort_by == "created" else "(SELECT MAX(a2.created_at) FROM attempts a2 WHERE a2.task_id=t.id AND a2.is_correct=1)"
    sort_direction = "ASC" if sort_dir == "asc" else "DESC"

    count_query = f"SELECT COUNT(*) as c FROM tasks t WHERE {where_sql}"
    async with sqlite.execute(count_query, params) as ccur:
        count_row = await ccur.fetchone()
        total_items = count_row["c"] if count_row else 0

    query = f"""
        SELECT
            t.id, t.title, t.difficulty, t.database_id, t.created_at,
            d.technical_name as db_name,
            d.display_name as db_display_name,
            EXISTS(SELECT 1 FROM attempts a WHERE a.task_id=t.id AND a.user_id=? AND a.is_correct=1) as is_solved,
            EXISTS(SELECT 1 FROM task_flags tf WHERE tf.task_id=t.id AND tf.user_id=?) as is_flagged,
            (SELECT MAX(a3.created_at) FROM attempts a3 WHERE a3.task_id=t.id AND a3.user_id=? AND a3.is_correct=1) as solved_at
        FROM tasks t
        JOIN databases d ON t.database_id = d.id
        WHERE {where_sql}
        ORDER BY {sort_field} {sort_direction}
        LIMIT ? OFFSET ?
    """
    offset = (page - 1) * page_size
    full_params = [user_id, user_id, user_id] + params + [page_size, offset]

    async with sqlite.execute(query, full_params) as cursor:
        rows = await cursor.fetchall()

    if rows:
        task_ids = [r["id"] for r in rows]
        placeholders = ",".join("?" * len(task_ids))
        tags_query = f"SELECT tt.task_id, tg.id as tag_id, tg.name FROM task_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.task_id IN ({placeholders})"
        async with sqlite.execute(tags_query, task_ids) as tcur:
            tag_rows = await tcur.fetchall()

        tags_map = {}
        for tr in tag_rows:
            tags_map.setdefault(tr["task_id"], []).append(TagOut(id=tr["tag_id"], name=tr["name"]))

        courses_query = f"SELECT st.task_id, c.id as course_id, c.title FROM section_tasks st JOIN sections s ON s.id = st.section_id JOIN courses c ON c.id = s.course_id WHERE st.task_id IN ({placeholders})"
        async with sqlite.execute(courses_query, task_ids) as ccur:
            course_rows = await ccur.fetchall()
            
        courses_map = {}
        for cr in course_rows:
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

    async with sqlite.execute("SELECT id, name FROM tags ORDER BY name") as tcur:
        all_tags = [TagOut(id=tr["id"], name=tr["name"]) for tr in await tcur.fetchall()]

    async with sqlite.execute("SELECT id, title FROM courses ORDER BY title") as ccur:
        all_courses = [CourseOut(id=cr["id"], title=cr["title"]) for cr in await ccur.fetchall()]

    async with sqlite.execute("SELECT id, technical_name, display_name FROM databases ORDER BY display_name") as dcur:
        all_dbs = [{"id": dr["id"], "technical_name": dr["technical_name"], "display_name": dr["display_name"]} for dr in await dcur.fetchall()]

    return TasksListResponse(tasks=tasks_out, total=total_items, tags=all_tags, courses=all_courses, databases=all_dbs)

# ---------------------------------------------------------------------------
# GET /tasks/{id} — task details
# ---------------------------------------------------------------------------

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
            
    hint = None
    if row["metadata_json"]:
        try:
            meta = json.loads(row["metadata_json"])
            hint = meta.get("hint")
        except Exception:
            pass
            
    async with sqlite.execute("SELECT tg.name FROM tags tg JOIN task_tags tt ON tg.id = tt.tag_id WHERE tt.task_id = ?", (id,)) as tcur:
        tags_list = [r["name"] for r in await tcur.fetchall()]

    async with sqlite.execute(
        """
        SELECT c.id, c.title
        FROM courses c
        JOIN sections s ON c.id = s.course_id
        JOIN section_tasks st ON s.id = st.section_id
        WHERE st.task_id = ?
        """, (id,)
    ) as ccur:
        courses_list = [{"id": r["id"], "title": r["title"]} for r in await ccur.fetchall()]

    async with sqlite.execute("SELECT category, condition, params_json, severity, message FROM task_rules WHERE task_id = ? ORDER BY sort_order", (id,)) as rcur:
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
