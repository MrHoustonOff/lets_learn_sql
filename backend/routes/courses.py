from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from core.sqlite_db import get_sqlite_conn

router = APIRouter()

class CourseListItem(BaseModel):
    id: int
    title: str
    description: Optional[str]
    author_name: Optional[str]
    author_url: Optional[str]
    sectionsCount: int
    tasksCount: int
    dbNames: List[str]
    progress: int  # Вычисляемый прогресс в процентах

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
    dbNames: List[str]
    totalTasks: int
    totalSections: int
    progress: int
    completedTasks: int
    sections: List[SectionDetails]

@router.get("/courses", response_model=List[CourseListItem])
async def list_courses():
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    query = """
        SELECT 
            c.id, c.title, c.description, c.author_name, c.author_url,
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
    """
    
    async with sqlite.execute(query) as cursor:
        rows = await cursor.fetchall()
        
    result = []
    for row in rows:
        db_names = row["db_names_str"].split(",") if row["db_names_str"] else []
        
        # Calculate progress percentage
        tasks_count = row["tasks_count"]
        completed = row["completed_tasks_count"]
        progress = int((completed / tasks_count) * 100) if tasks_count > 0 else 0
        
        result.append(CourseListItem(
            id=row["id"],
            title=row["title"],
            description=row["description"],
            author_name=row["author_name"],
            author_url=row["author_url"],
            sectionsCount=row["sections_count"],
            tasksCount=tasks_count,
            dbNames=db_names,
            progress=progress
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
        
    # 1. Fetch course details
    async with sqlite.execute("SELECT * FROM courses WHERE id = ?", (course_id,)) as cursor:
        course = await cursor.fetchone()
        if not course:
            raise HTTPException(status_code=404, detail="Course not found")
            
    # 2. Fetch all database names associated with the course tasks
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

    # 3. Fetch sections
    sections_query = "SELECT * FROM sections WHERE course_id = ? ORDER BY sort_order"
    async with sqlite.execute(sections_query, (course_id,)) as cursor:
        section_rows = await cursor.fetchall()
        
    sections_details = []
    total_tasks = 0
    completed_tasks = 0
    
    for sec in section_rows:
        # Fetch tasks in this section
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
    
    return CourseDetails(
        id=course["id"],
        title=course["title"],
        description=course["description"],
        dbNames=db_names,
        totalTasks=total_tasks,
        totalSections=len(sections_details),
        progress=course_progress,
        completedTasks=completed_tasks,
        sections=sections_details
    )
