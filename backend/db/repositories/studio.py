import aiosqlite
from typing import List

class StudioRepository:
    def __init__(self, conn: aiosqlite.Connection):
        self.conn = conn

    async def get_task_drafts(self) -> List[aiosqlite.Row]:
        query = """
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
        async with self.conn.execute(query) as cursor:
            return await cursor.fetchall()

    async def get_course_drafts(self) -> List[aiosqlite.Row]:
        query = """
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
        async with self.conn.execute(query) as cursor:
            return await cursor.fetchall()
