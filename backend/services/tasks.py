import json
from typing import List, Optional
from db.repositories.tasks import TaskRepository
from schemas.tasks import (
    TasksListResponse, TaskResponse, TaskListItem,
    TagOut, CourseOut
)

class TaskService:
    def __init__(self, repo: TaskRepository):
        self.repo = repo

    async def list_tasks(
        self, search: Optional[str], difficulty: Optional[str],
        tag_ids: Optional[str], course_ids: Optional[str],
        database_id: Optional[int], status: str, sort_by: str,
        sort_dir: str, page: int, page_size: int, user_id: int
    ) -> TasksListResponse:
        
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

        result = await self.repo.list_tasks(
            search, difficulty_ids, tag_id_list, course_id_list,
            database_id, status, sort_by, sort_dir, page, page_size, user_id
        )

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
                tags=[TagOut(**t) for t in result["tags_map"].get(r["id"], [])],
                courses=[CourseOut(**c) for c in result["courses_map"].get(r["id"], [])],
                created_at=str(r["created_at"]),
                solved_at=str(r["solved_at"]) if r["solved_at"] else None,
            )
            for r in result["rows"]
        ]

        all_tags = [TagOut(**t) for t in result["all_tags"]]
        all_courses = [CourseOut(**c) for c in result["all_courses"]]

        return TasksListResponse(
            tasks=tasks_out,
            total=result["total_items"],
            tags=all_tags,
            courses=all_courses,
            databases=result["all_dbs"]
        )

    async def get_task_details(self, task_id: int, user_id: int) -> TaskResponse:
        details = await self.repo.get_task_details(task_id, user_id)
        if not details:
            raise LookupError("Task not found")
            
        row = details["row"]
        hint = None
        if row["metadata_json"]:
            try:
                meta = json.loads(row["metadata_json"])
                hint = meta.get("hint")
            except Exception:
                pass

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
            tags=details["tags_list"],
            courses=details["courses_list"],
            rules=details["rules_list"]
        )

    async def get_task_attempts(self, task_id: int, user_id: int) -> List[dict]:
        rows = await self.repo.get_task_attempts(task_id, user_id)
        results = []
        for row in rows:
            try:
                report = json.loads(row["report_json"]) if row["report_json"] else None
                duration = report.get("duration_ms", 0) if report else 0
            except Exception:
                report = {}
                duration = 0

            created_at_str = str(row["created_at"]).replace(" ", "T")
            if not created_at_str.endswith("Z"):
                created_at_str += "Z"

            results.append({
                "id": row["id"],
                "attempt_id": str(row["id"]), 
                "sql": row["sql_text"],
                "verdict": bool(row["is_correct"]),
                "created_at": created_at_str,
                "date": created_at_str,
                "duration_ms": duration,
                "report": report
            })

        return results
