from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional, Literal
from core.sqlite_db import get_sqlite_conn
import json

router = APIRouter()


# ---------------------------------------------------------------------------
# Read models
# ---------------------------------------------------------------------------

class CourseListItem(BaseModel):
    id: int
    title: str
    description: Optional[str]
    author_name: Optional[str]
    author_url: Optional[str]
    authors: List[dict]
    status: str
    sectionsCount: int
    tasksCount: int
    dbNames: List[str]
    progress: int

class TaskDetails(BaseModel):
    id: int
    title: str
    status: str  # 'done' | 'todo'
    bookmarked: bool

class SectionDetails(BaseModel):
    id: int
    title: str
    description: Optional[str]
    completed: int
    total: int
    progress: int
    tasks: List[TaskDetails]

class CourseDetails(BaseModel):
    id: int
    title: str
    description: Optional[str]
    authors: List[dict]
    dbNames: List[str]
    totalTasks: int
    totalSections: int
    progress: int
    completedTasks: int
    sections: List[SectionDetails]
    status: str


# ---------------------------------------------------------------------------
# Write models
# ---------------------------------------------------------------------------

class SectionInput(BaseModel):
    title: str
    description: Optional[str] = None
    task_ids: List[int] = []

class AuthorInput(BaseModel):
    name: str
    link: Optional[str] = ""

class CourseCreateRequest(BaseModel):
    title: str
    description: str
    status: Literal["draft", "published"] = "published"
    authors: List[AuthorInput] = []
    sections: List[SectionInput] = []

class CourseUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["draft", "published"]] = None
    authors: Optional[List[AuthorInput]] = None
    sections: Optional[List[SectionInput]] = None

class CourseWriteResponse(BaseModel):
    id: int
    status: str


def _parse_authors(metadata_json: str) -> list:
    """Extract authors list from metadata_json."""
    try:
        meta = json.loads(metadata_json or "{}")
        return meta.get("authors", [])
    except Exception:
        return []


@router.get("/courses", response_model=List[CourseListItem])
async def list_courses(status: Optional[str] = "published"):
    """Return courses, filtered by status (default: published only)."""
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    query = """
        SELECT
            c.id, c.title, c.description, c.author_name, c.author_url,
            c.status, c.metadata_json,
            (SELECT COUNT(DISTINCT s.id) FROM sections s WHERE s.course_id = c.id) as sections_count,
            (SELECT COUNT(DISTINCT st.task_id) FROM section_tasks st JOIN sections s ON st.section_id = s.id WHERE s.course_id = c.id) as tasks_count,
            (
                SELECT GROUP_CONCAT(DISTINCT d.display_name)
                FROM section_tasks st
                JOIN sections s ON st.section_id = s.id
                JOIN tasks t ON st.task_id = t.id
                JOIN databases d ON t.database_id = d.id
                WHERE s.course_id = c.id
            ) as db_names_str,
            (
                SELECT COUNT(DISTINCT st.task_id)
                FROM section_tasks st
                JOIN sections s ON st.section_id = s.id
                JOIN attempts a ON st.task_id = a.task_id
                WHERE s.course_id = c.id AND a.is_correct = 1
            ) as completed_tasks_count
        FROM courses c
        WHERE c.status = ?
    """

    async with sqlite.execute(query, (status,)) as cursor:
        rows = await cursor.fetchall()

    result = []
    for row in rows:
        db_names = row["db_names_str"].split(",") if row["db_names_str"] else []
        tasks_count = row["tasks_count"]
        completed = row["completed_tasks_count"]
        progress = int((completed / tasks_count) * 100) if tasks_count > 0 else 0
        authors = _parse_authors(row["metadata_json"])

        result.append(CourseListItem(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            author_name=row["author_name"],
            author_url=row["author_url"],
            authors=authors,
            status=row["status"],
            sectionsCount=row["sections_count"],
            tasksCount=tasks_count,
            dbNames=db_names,
            progress=progress,
        ))
    return result


@router.get("/courses/{id}", response_model=CourseDetails)
async def get_course_details(id: str):
    if not id.isdigit():
        raise HTTPException(status_code=404, detail="Course not found")

    course_id = int(id)
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    async with sqlite.execute("SELECT * FROM courses WHERE id = ?", (course_id,)) as cursor:
        course = await cursor.fetchone()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")

    db_query = """
        SELECT DISTINCT d.display_name
        FROM section_tasks st
        JOIN sections s ON st.section_id = s.id
        JOIN tasks t ON st.task_id = t.id
        JOIN databases d ON t.database_id = d.id
        WHERE s.course_id = ?
    """
    async with sqlite.execute(db_query, (course_id,)) as cursor:
        db_rows = await cursor.fetchall()
        db_names = [r["display_name"] for r in db_rows]

    sections_query = "SELECT * FROM sections WHERE course_id = ? ORDER BY sort_order"
    async with sqlite.execute(sections_query, (course_id,)) as cursor:
        section_rows = await cursor.fetchall()

    sections_details = []
    total_tasks = 0
    completed_tasks = 0

    for sec in section_rows:
        tasks_query = """
            SELECT
                t.id, t.title,
                EXISTS(SELECT 1 FROM attempts a WHERE a.task_id = t.id AND a.is_correct = 1) as is_solved,
                EXISTS(SELECT 1 FROM task_flags tf WHERE tf.task_id = t.id) as is_bookmarked
            FROM section_tasks st
            JOIN tasks t ON st.task_id = t.id
            WHERE st.section_id = ?
            ORDER BY st.sort_order
        """
        async with sqlite.execute(tasks_query, (sec["id"],)) as cursor:
            task_rows = await cursor.fetchall()

        tasks = []
        sec_completed = 0
        sec_total = len(task_rows)

        for t_row in task_rows:
            solved = bool(t_row["is_solved"])
            if solved:
                sec_completed += 1
                completed_tasks += 1

            tasks.append(TaskDetails(
                id=t_row["id"],
                title=t_row["title"],
                status='done' if solved else 'todo',
                bookmarked=bool(t_row["is_bookmarked"])
            ))
            total_tasks += 1

        sec_progress = int((sec_completed / sec_total) * 100) if sec_total > 0 else 0

        sections_details.append(SectionDetails(
            id=sec["id"],
            title=sec["title"],
            description=sec["description"],
            completed=sec_completed,
            total=sec_total,
            progress=sec_progress,
            tasks=tasks
        ))

    course_progress = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0
    authors = _parse_authors(course["metadata_json"])

    return CourseDetails(
        id=course["id"],
        title=course["title"],
        description=course["description"],
        authors=authors,
        dbNames=db_names,
        totalTasks=total_tasks,
        totalSections=len(sections_details),
        progress=course_progress,
        completedTasks=completed_tasks,
        sections=sections_details,
        status=course["status"],
    )

class CheckDuplicateCourseRequest(BaseModel):
    title: str
    description: Optional[str] = None
    exclude_id: Optional[int] = None

@router.post("/courses/check_duplicate")
async def check_duplicate_course(payload: CheckDuplicateCourseRequest):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    query = """
        SELECT 
            COUNT(id) as title_count,
            SUM(CASE WHEN description = ? THEN 1 ELSE 0 END) as exact_matches
        FROM courses 
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


@router.post("/courses", response_model=CourseWriteResponse, status_code=201)
async def create_course(payload: CourseCreateRequest):
    """
    Atomically create a course with sections and task assignments.
    Returns the new course id and its status.
    """
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    # Serialize authors into metadata_json
    authors_data = [a.model_dump() for a in payload.authors]
    metadata = json.dumps({"authors": authors_data})

    # Derive legacy author_name / author_url from first author for backwards compat
    first_author = payload.authors[0] if payload.authors else None
    author_name = first_author.name if first_author else None
    author_url = first_author.link if first_author else None

    async with sqlite.execute(
        """
        INSERT INTO courses (title, description, author_name, author_url, status, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (payload.title, payload.description, author_name, author_url, payload.status, metadata),
    ) as cursor:
        course_id = cursor.lastrowid

    # Create sections and bind tasks
    for sort_idx, section in enumerate(payload.sections):
        async with sqlite.execute(
            """
            INSERT INTO sections (course_id, title, description, sort_order)
            VALUES (?, ?, ?, ?)
            """,
            (course_id, section.title, section.description, sort_idx),
        ) as cursor:
            section_id = cursor.lastrowid

        for task_idx, task_id in enumerate(section.task_ids):
            await sqlite.execute(
                """
                INSERT OR IGNORE INTO section_tasks (section_id, task_id, sort_order)
                VALUES (?, ?, ?)
                """,
                (section_id, task_id, task_idx),
            )

    await sqlite.commit()
    return CourseWriteResponse(id=course_id, status=payload.status)


@router.put("/courses/{id}", response_model=CourseWriteResponse)
async def update_course(id: str, payload: CourseUpdateRequest):
    """
    Fully replace a course's content.
    Sections and section_tasks are deleted and re-created from scratch.
    """
    if not id.isdigit():
        raise HTTPException(status_code=404, detail="Course not found")

    course_id = int(id)
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    async with sqlite.execute("SELECT * FROM courses WHERE id = ?", (course_id,)) as cursor:
        existing = await cursor.fetchone()
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")

    # Build updated values, falling back to existing where not provided
    title = payload.title if payload.title is not None else existing["title"]
    description = payload.description if payload.description is not None else existing["description"]
    status = payload.status if payload.status is not None else existing["status"]

    if payload.authors is not None:
        authors_data = [a.model_dump() for a in payload.authors]
        first_author = payload.authors[0] if payload.authors else None
    else:
        existing_meta = json.loads(existing["metadata_json"] or "{}")
        authors_data = existing_meta.get("authors", [])
        first_author_dict = authors_data[0] if authors_data else None
        first_author = type("A", (), first_author_dict)() if first_author_dict else None

    metadata = json.dumps({"authors": authors_data})
    author_name = first_author.name if first_author and hasattr(first_author, "name") else (first_author_dict.get("name") if "first_author_dict" in dir() else None)
    author_url = first_author.link if first_author and hasattr(first_author, "link") else None

    await sqlite.execute(
        """
        UPDATE courses
        SET title = ?, description = ?, author_name = ?, author_url = ?,
            status = ?, metadata_json = ?, updated_at = datetime('now')
        WHERE id = ?
        """,
        (title, description, author_name, author_url, status, metadata, course_id),
    )

    # Replace sections if provided
    if payload.sections is not None:
        # CASCADE delete handles section_tasks automatically
        await sqlite.execute("DELETE FROM sections WHERE course_id = ?", (course_id,))

        for sort_idx, section in enumerate(payload.sections):
            async with sqlite.execute(
                """
                INSERT INTO sections (course_id, title, description, sort_order)
                VALUES (?, ?, ?, ?)
                """,
                (course_id, section.title, section.description, sort_idx),
            ) as cursor:
                section_id = cursor.lastrowid

            for task_idx, task_id in enumerate(section.task_ids):
                await sqlite.execute(
                    """
                    INSERT OR IGNORE INTO section_tasks (section_id, task_id, sort_order)
                    VALUES (?, ?, ?)
                    """,
                    (section_id, task_id, task_idx),
                )

    await sqlite.commit()
    return CourseWriteResponse(id=course_id, status=status)


@router.delete("/courses/{id}", status_code=204)
async def delete_course(id: str, delete_tasks: str = Query("none")):
    """
    Delete a course.
    - delete_tasks="none" (default): Keep tasks in DB, just remove the course.
    - delete_tasks="orphaned": Delete tasks that belong ONLY to this course.
    """
    if not id.isdigit():
        raise HTTPException(status_code=404, detail="Course not found")

    course_id = int(id)
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    async with sqlite.execute("SELECT id FROM courses WHERE id = ?", (course_id,)) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=404, detail="Course not found")

    if delete_tasks == "orphaned":
        # Find all tasks in this course
        tasks_query = """
            SELECT DISTINCT task_id 
            FROM section_tasks st 
            JOIN sections s ON st.section_id = s.id 
            WHERE s.course_id = ?
        """
        async with sqlite.execute(tasks_query, (course_id,)) as cursor:
            course_tasks = [r["task_id"] for r in await cursor.fetchall()]
        
        # For each task, check if it's used in any OTHER course
        tasks_to_delete = []
        for tid in course_tasks:
            usage_query = """
                SELECT COUNT(DISTINCT s.course_id) as c_count
                FROM section_tasks st
                JOIN sections s ON st.section_id = s.id
                WHERE st.task_id = ?
            """
            async with sqlite.execute(usage_query, (tid,)) as cursor:
                usage_row = await cursor.fetchone()
                if usage_row and usage_row["c_count"] <= 1:
                    tasks_to_delete.append(tid)
        
        # Delete orphaned tasks
        if tasks_to_delete:
            placeholders = ",".join(["?"] * len(tasks_to_delete))
            await sqlite.execute(f"DELETE FROM tasks WHERE id IN ({placeholders})", tasks_to_delete)

    # Delete course itself (CASCADE removes sections and section_tasks)
    await sqlite.execute("DELETE FROM courses WHERE id = ?", (course_id,))
    await sqlite.commit()

