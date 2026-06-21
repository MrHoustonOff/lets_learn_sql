import json
from typing import List, Optional
from db.repositories.courses import CourseRepository
from schemas.courses import (
    CourseListItem, CourseDetails, SectionDetails, TaskDetails,
    CourseCreateRequest, CourseUpdateRequest
)

class CourseService:
    def __init__(self, repo: CourseRepository):
        self.repo = repo

    def _parse_authors(self, metadata_json: str) -> list:
        try:
            meta = json.loads(metadata_json or "{}")
            return meta.get("authors", [])
        except Exception:
            return []

    async def list_courses(self, status: Optional[str] = "published") -> List[CourseListItem]:
        rows = await self.repo.get_courses_by_status(status)
        result = []
        for row in rows:
            db_names = row["db_names_str"].split(",") if row["db_names_str"] else []
            tasks_count = row["tasks_count"]
            completed = row["completed_tasks_count"]
            progress = int((completed / tasks_count) * 100) if tasks_count > 0 else 0
            authors = self._parse_authors(row["metadata_json"])

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

    async def get_course_details(self, course_id: int) -> CourseDetails:
        course = await self.repo.get_course_by_id(course_id)
        if not course:
            raise LookupError("Course not found")

        db_names = await self.repo.get_course_databases(course_id)
        section_rows = await self.repo.get_course_sections(course_id)

        sections_details = []
        total_tasks = 0
        completed_tasks = 0

        for sec in section_rows:
            task_rows = await self.repo.get_section_tasks(sec["id"])
            
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
        authors = self._parse_authors(course["metadata_json"])

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

    async def create_course(self, payload: CourseCreateRequest) -> int:
        metadata_json = json.dumps({"authors": [a.model_dump() for a in payload.authors]})
        course_id = await self.repo.create_course(
            title=payload.title,
            description=payload.description,
            status=payload.status,
            metadata_json=metadata_json
        )

        for i, sec in enumerate(payload.sections):
            section_id = await self.repo.create_section(course_id, sec.title, sec.description, i)
            for j, t_id in enumerate(sec.task_ids):
                await self.repo.add_task_to_section(section_id, t_id, j)
                
        return course_id

    async def update_course(self, course_id: int, payload: CourseUpdateRequest) -> None:
        course = await self.repo.get_course_by_id(course_id)
        if not course:
            raise LookupError("Course not found")

        title = payload.title if payload.title is not None else course["title"]
        description = payload.description if payload.description is not None else course["description"]
        status = payload.status if payload.status is not None else course["status"]

        metadata_json = course["metadata_json"]
        if payload.authors is not None:
            metadata_json = json.dumps({"authors": [a.model_dump() for a in payload.authors]})

        await self.repo.update_course(course_id, title, description, status, metadata_json)

        if payload.sections is not None:
            await self.repo.clear_sections(course_id)
            for i, sec in enumerate(payload.sections):
                section_id = await self.repo.create_section(course_id, sec.title, sec.description, i)
                for j, t_id in enumerate(sec.task_ids):
                    await self.repo.add_task_to_section(section_id, t_id, j)
