import aiosqlite
import json
from typing import List, Optional, Dict, Any

class CourseRepository:
    def __init__(self, conn: aiosqlite.Connection):
        self.conn = conn

    async def get_courses_by_status(self, status: str) -> List[aiosqlite.Row]:
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
        async with self.conn.execute(query, (status,)) as cursor:
            return await cursor.fetchall()

    async def get_course_by_id(self, course_id: int) -> Optional[aiosqlite.Row]:
        async with self.conn.execute("SELECT * FROM courses WHERE id = ?", (course_id,)) as cursor:
            return await cursor.fetchone()

    async def get_course_databases(self, course_id: int) -> List[str]:
        query = """
            SELECT DISTINCT d.display_name
            FROM section_tasks st
            JOIN sections s ON st.section_id = s.id
            JOIN tasks t ON st.task_id = t.id
            JOIN databases d ON t.database_id = d.id
            WHERE s.course_id = ?
        """
        async with self.conn.execute(query, (course_id,)) as cursor:
            rows = await cursor.fetchall()
            return [r["display_name"] for r in rows]

    async def get_course_sections(self, course_id: int) -> List[aiosqlite.Row]:
        query = "SELECT * FROM sections WHERE course_id = ? ORDER BY sort_order"
        async with self.conn.execute(query, (course_id,)) as cursor:
            return await cursor.fetchall()

    async def get_section_tasks(self, section_id: int) -> List[aiosqlite.Row]:
        query = """
            SELECT
                t.id, t.title,
                EXISTS(SELECT 1 FROM attempts a WHERE a.task_id = t.id AND a.is_correct = 1) as is_solved,
                EXISTS(SELECT 1 FROM task_flags tf WHERE tf.task_id = t.id) as is_bookmarked
            FROM section_tasks st
            JOIN tasks t ON st.task_id = t.id
            WHERE st.section_id = ?
            ORDER BY st.sort_order
        """
        async with self.conn.execute(query, (section_id,)) as cursor:
            return await cursor.fetchall()

    async def check_duplicate(self, title: str, description: Optional[str] = None, exclude_id: Optional[int] = None) -> Dict[str, Any]:
        query = """
            SELECT 
                COUNT(id) as title_count,
                SUM(CASE WHEN description = ? THEN 1 ELSE 0 END) as exact_matches
            FROM courses 
            WHERE title = ?
        """
        params = [description or "", title]
        if exclude_id:
            query += " AND id != ?"
            params.append(exclude_id)

        async with self.conn.execute(query, params) as cursor:
            row = await cursor.fetchone()

        return {
            "title_matches": row["title_count"] if row else 0,
            "is_exact_duplicate": (row["exact_matches"] or 0) > 0 if row else False
        }

    async def create_course(self, title: str, description: str, author_name: Optional[str], author_url: Optional[str], status: str, metadata_json: str, sections_data: List[Any]) -> int:
        async with self.conn.execute(
            """
            INSERT INTO courses (title, description, author_name, author_url, status, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (title, description, author_name, author_url, status, metadata_json),
        ) as cursor:
            course_id = cursor.lastrowid

        for sort_idx, section in enumerate(sections_data):
            async with self.conn.execute(
                """
                INSERT INTO sections (course_id, title, description, sort_order)
                VALUES (?, ?, ?, ?)
                """,
                (course_id, section.title, section.description, sort_idx),
            ) as cursor:
                section_id = cursor.lastrowid

            for task_idx, task_id in enumerate(section.task_ids):
                await self.conn.execute(
                    """
                    INSERT OR IGNORE INTO section_tasks (section_id, task_id, sort_order)
                    VALUES (?, ?, ?)
                    """,
                    (section_id, task_id, task_idx),
                )

        await self.conn.commit()
        return course_id

    async def update_course(self, course_id: int, title: str, description: str, author_name: Optional[str], author_url: Optional[str], status: str, metadata_json: str, sections_data: Optional[List[Any]]) -> None:
        await self.conn.execute(
            """
            UPDATE courses
            SET title = ?, description = ?, author_name = ?, author_url = ?,
                status = ?, metadata_json = ?, updated_at = datetime('now')
            WHERE id = ?
            """,
            (title, description, author_name, author_url, status, metadata_json, course_id),
        )

        if sections_data is not None:
            await self.conn.execute("DELETE FROM sections WHERE course_id = ?", (course_id,))

            for sort_idx, section in enumerate(sections_data):
                async with self.conn.execute(
                    """
                    INSERT INTO sections (course_id, title, description, sort_order)
                    VALUES (?, ?, ?, ?)
                    """,
                    (course_id, section.title, section.description, sort_idx),
                ) as cursor:
                    section_id = cursor.lastrowid

                for task_idx, task_id in enumerate(section.task_ids):
                    await self.conn.execute(
                        """
                        INSERT OR IGNORE INTO section_tasks (section_id, task_id, sort_order)
                        VALUES (?, ?, ?)
                        """,
                        (section_id, task_id, task_idx),
                    )

        await self.conn.commit()

    async def delete_course(self, course_id: int) -> None:
        await self.conn.execute("DELETE FROM courses WHERE id = ?", (course_id,))
        await self.conn.commit()

    async def get_course_tasks(self, course_id: int) -> List[int]:
        query = """
            SELECT DISTINCT task_id 
            FROM section_tasks st 
            JOIN sections s ON st.section_id = s.id 
            WHERE s.course_id = ?
        """
        async with self.conn.execute(query, (course_id,)) as cursor:
            rows = await cursor.fetchall()
            return [r["task_id"] for r in rows]

    async def get_task_usage_count(self, task_id: int) -> int:
        query = """
            SELECT COUNT(DISTINCT s.course_id) as c_count
            FROM section_tasks st
            JOIN sections s ON st.section_id = s.id
            WHERE st.task_id = ?
        """
        async with self.conn.execute(query, (task_id,)) as cursor:
            row = await cursor.fetchone()
            return row["c_count"] if row else 0

    async def delete_tasks(self, task_ids: List[int]) -> None:
        if not task_ids:
            return
        placeholders = ",".join(["?"] * len(task_ids))
        await self.conn.execute(f"DELETE FROM tasks WHERE id IN ({placeholders})", task_ids)
        await self.conn.commit()
