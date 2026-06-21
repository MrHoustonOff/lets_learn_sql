from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from core.sqlite_db import get_sqlite_conn
import json

from schemas.courses import (
    CourseListItem, TaskDetails, SectionDetails, CourseDetails,
    SectionInput, AuthorInput, CourseCreateRequest, CourseUpdateRequest,
    CourseWriteResponse, CheckDuplicateCourseRequest
)
from db.repositories.courses import CourseRepository

router = APIRouter()


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

    repo = CourseRepository(sqlite)
    rows = await repo.get_courses_by_status(status)

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

    repo = CourseRepository(sqlite)
    course = await repo.get_course_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    db_names = await repo.get_course_databases(course_id)
    section_rows = await repo.get_course_sections(course_id)

    sections_details = []
    total_tasks = 0
    completed_tasks = 0

    for sec in section_rows:
        task_rows = await repo.get_section_tasks(sec["id"])
        
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


@router.post("/courses/check_duplicate")
async def check_duplicate_course(payload: CheckDuplicateCourseRequest):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = CourseRepository(sqlite)
    return await repo.check_duplicate(payload.title, payload.description, payload.exclude_id)


@router.post("/courses", response_model=CourseWriteResponse, status_code=201)
async def create_course(payload: CourseCreateRequest):
    """
    Atomically create a course with sections and task assignments.
    Returns the new course id and its status.
    """
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = CourseRepository(sqlite)
    
    # Serialize authors into metadata_json
    authors_data = [a.model_dump() for a in payload.authors]
    metadata = json.dumps({"authors": authors_data})

    # Derive legacy author_name / author_url from first author for backwards compat
    first_author = payload.authors[0] if payload.authors else None
    author_name = first_author.name if first_author else None
    author_url = first_author.link if first_author else None

    course_id = await repo.create_course(
        payload.title, payload.description, author_name, author_url, 
        payload.status, metadata, payload.sections
    )

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

    repo = CourseRepository(sqlite)
    existing = await repo.get_course_by_id(course_id)
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

    await repo.update_course(
        course_id, title, description, author_name, author_url,
        status, metadata, payload.sections
    )

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

    repo = CourseRepository(sqlite)
    existing = await repo.get_course_by_id(course_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")

    if delete_tasks == "orphaned":
        course_tasks = await repo.get_course_tasks(course_id)
        
        tasks_to_delete = []
        for tid in course_tasks:
            usage_count = await repo.get_task_usage_count(tid)
            if usage_count <= 1:
                tasks_to_delete.append(tid)
        
        if tasks_to_delete:
            await repo.delete_tasks(tasks_to_delete)

    await repo.delete_course(course_id)
