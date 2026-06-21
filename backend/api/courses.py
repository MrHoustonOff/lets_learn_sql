from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from core.sqlite_db import get_sqlite_conn

from schemas.courses import (
    CourseListItem, CourseDetails,
    CourseCreateRequest, CourseUpdateRequest, CourseWriteResponse, CheckDuplicateCourseRequest
)
from db.repositories.courses import CourseRepository
from services.courses import CourseService

router = APIRouter()

@router.get("/courses", response_model=List[CourseListItem])
async def list_courses(status: Optional[str] = "published"):
    """Return courses, filtered by status (default: published only)."""
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = CourseRepository(sqlite)
    svc = CourseService(repo)
    return await svc.list_courses(status)


@router.get("/courses/{id}", response_model=CourseDetails)
async def get_course_details(id: str):
    if not id.isdigit():
        raise HTTPException(status_code=404, detail="Course not found")

    course_id = int(id)
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = CourseRepository(sqlite)
    svc = CourseService(repo)
    try:
        return await svc.get_course_details(course_id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


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
    svc = CourseService(repo)
    
    course_id = await svc.create_course(payload)
    return CourseWriteResponse(id=course_id, status=payload.status)


@router.put("/courses/{id}", response_model=CourseWriteResponse)
async def update_course(id: int, payload: CourseUpdateRequest):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = CourseRepository(sqlite)
    svc = CourseService(repo)
    try:
        await svc.update_course(id, payload)
        course = await repo.get_course_by_id(id)
        return CourseWriteResponse(id=id, status=course["status"])
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/courses/{id}")
async def delete_course(id: int):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = CourseRepository(sqlite)
    await repo.delete_course(id)
    return {"status": "ok"}
