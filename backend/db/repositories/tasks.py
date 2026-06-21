import aiosqlite
import json
from typing import List, Optional, Dict, Any

class TaskRepository:
    def __init__(self, conn: aiosqlite.Connection):
        self.conn = conn

    async def list_tasks(
        self,
        search: Optional[str],
        difficulty_ids: List[int],
        tag_id_list: List[int],
        course_id_list: List[int],
        database_id: Optional[int],
        status: str,
        sort_by: str,
        sort_dir: str,
        page: int,
        page_size: int,
        user_id: int
    ) -> Dict[str, Any]:
        
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
        async with self.conn.execute(count_query, params) as ccur:
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

        async with self.conn.execute(query, full_params) as cursor:
            rows = await cursor.fetchall()

        if rows:
            task_ids = [r["id"] for r in rows]
            placeholders = ",".join("?" * len(task_ids))
            
            tags_query = f"SELECT tt.task_id, tg.id as tag_id, tg.name FROM task_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.task_id IN ({placeholders})"
            async with self.conn.execute(tags_query, task_ids) as tcur:
                tag_rows = await tcur.fetchall()
            tags_map = {}
            for tr in tag_rows:
                tags_map.setdefault(tr["task_id"], []).append({"id": tr["tag_id"], "name": tr["name"]})

            courses_query = f"SELECT st.task_id, c.id as course_id, c.title FROM section_tasks st JOIN sections s ON s.id = st.section_id JOIN courses c ON c.id = s.course_id WHERE st.task_id IN ({placeholders})"
            async with self.conn.execute(courses_query, task_ids) as ccur:
                course_rows = await ccur.fetchall()
            courses_map = {}
            for cr in course_rows:
                courses_list = courses_map.setdefault(cr["task_id"], [])
                if not any(c["id"] == cr["course_id"] for c in courses_list):
                    courses_list.append({"id": cr["course_id"], "title": cr["title"]})
        else:
            tags_map = {}
            courses_map = {}

        async with self.conn.execute("SELECT id, name FROM tags ORDER BY name") as tcur:
            all_tags = [{"id": tr["id"], "name": tr["name"]} for tr in await tcur.fetchall()]

        async with self.conn.execute("SELECT id, title FROM courses ORDER BY title") as ccur:
            all_courses = [{"id": cr["id"], "title": cr["title"]} for cr in await ccur.fetchall()]

        async with self.conn.execute("SELECT id, technical_name, display_name FROM databases ORDER BY display_name") as dcur:
            all_dbs = [{"id": dr["id"], "technical_name": dr["technical_name"], "display_name": dr["display_name"]} for dr in await dcur.fetchall()]

        return {
            "rows": rows,
            "tags_map": tags_map,
            "courses_map": courses_map,
            "total_items": total_items,
            "all_tags": all_tags,
            "all_courses": all_courses,
            "all_dbs": all_dbs
        }

    async def get_task_details(self, task_id: int, user_id: int) -> Optional[Dict[str, Any]]:
        query = """
            SELECT t.id, t.title, t.difficulty, t.database_id, t.description, t.metadata_json, d.technical_name as db_name,
                   t.author_name, t.source_url, t.reference_sql, t.status, t.order_matters,
                   EXISTS(SELECT 1 FROM task_flags tf WHERE tf.task_id = t.id AND tf.user_id = ?) as is_bookmarked,
                   EXISTS(SELECT 1 FROM attempts a WHERE a.task_id = t.id AND a.user_id = ? AND a.is_correct = 1) as is_solved
            FROM tasks t
            JOIN databases d ON t.database_id = d.id
            WHERE t.id = ?
        """
        async with self.conn.execute(query, (user_id, user_id, task_id)) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
                
        async with self.conn.execute("SELECT tg.name FROM tags tg JOIN task_tags tt ON tg.id = tt.tag_id WHERE tt.task_id = ?", (task_id,)) as tcur:
            tags_list = [r["name"] for r in await tcur.fetchall()]

        courses_query = """
            SELECT c.id, c.title
            FROM courses c
            JOIN sections s ON c.id = s.course_id
            JOIN section_tasks st ON s.id = st.section_id
            WHERE st.task_id = ?
        """
        async with self.conn.execute(courses_query, (task_id,)) as ccur:
            courses_list = [{"id": r["id"], "title": r["title"]} for r in await ccur.fetchall()]

        async with self.conn.execute("SELECT category, condition, params_json, severity, message FROM task_rules WHERE task_id = ? ORDER BY sort_order", (task_id,)) as rcur:
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

        return {
            "row": row,
            "tags_list": tags_list,
            "courses_list": courses_list,
            "rules_list": rules_list
        }

    async def delete_task(self, task_id: int) -> None:
        await self.conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
        await self.conn.commit()

    async def check_duplicate(self, title: str, description: Optional[str] = None, exclude_id: Optional[int] = None) -> Dict[str, Any]:
        query = """
            SELECT 
                COUNT(id) as title_count,
                SUM(CASE WHEN description = ? THEN 1 ELSE 0 END) as exact_matches
            FROM tasks 
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

    async def create_task_draft(self) -> int:
        async with self.conn.execute(
            "INSERT INTO tasks (title, description, reference_sql, database_id, status) VALUES ('', '', '', 1, 'draft')"
        ) as cursor:
            draft_id = cursor.lastrowid
        await self.conn.commit()
        return draft_id

    async def update_task_draft(self, task_id: int, title: Optional[str], description: Optional[str], author_name: Optional[str], source_url: Optional[str], difficulty: Optional[str], database_id: Optional[int], reference_sql: Optional[str], order_matters: Optional[bool], tags: List[str], rules: List[Any]) -> None:
        await self.conn.execute(
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
            (title, description, author_name, source_url, difficulty, database_id, reference_sql, order_matters, task_id)
        )

        await self.conn.execute("DELETE FROM task_tags WHERE task_id = ?", (task_id,))
        for tag_name in tags:
            await self.conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))
            async with self.conn.execute("SELECT id FROM tags WHERE name = ?", (tag_name,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    await self.conn.execute("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)", (task_id, row["id"]))

        await self.conn.execute("DELETE FROM task_rules WHERE task_id = ?", (task_id,))
        for i, rule in enumerate(rules):
            await self.conn.execute(
                """
                INSERT INTO task_rules (task_id, category, condition, params_json, severity, message, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (task_id, rule.category, rule.condition, json.dumps(rule.params), rule.severity, rule.message, i)
            )

        # Recalculate signature
        async with self.conn.execute("SELECT title, description FROM tasks WHERE id = ?", (task_id,)) as cur:
            t_row = await cur.fetchone()
            if t_row:
                import hashlib
                t_val = t_row["title"] or ""
                d_val = t_row["description"] or ""
                sig_val = hashlib.md5(f"{t_val}||{d_val}".encode("utf-8")).hexdigest()
                await self.conn.execute("UPDATE tasks SET task_signature = ? WHERE id = ?", (sig_val, task_id))

        await self.conn.commit()

    async def get_task_by_signature(self, signature: str) -> Optional[Dict[str, Any]]:
        async with self.conn.execute("SELECT id, title, status FROM tasks WHERE task_signature = ?", (signature,)) as cursor:
            row = await cursor.fetchone()
            if row:
                return dict(row)
            return None

    async def publish_task(self, task_id: int) -> Optional[aiosqlite.Row]:
        async with self.conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)) as cursor:
            task = await cursor.fetchone()

        if not task:
            return None

        if not task["title"] or not task["description"] or not task["difficulty"] or not task["database_id"] or not task["reference_sql"]:
            raise ValueError("Not all required fields are populated for publishing.")

        await self.conn.execute("UPDATE tasks SET status = 'published' WHERE id = ?", (task_id,))
        await self.conn.commit()
        return task

    async def get_task_reference(self, task_id: int) -> Optional[aiosqlite.Row]:
        query = """
            SELECT t.reference_sql, d.technical_name as db_name, t.id, t.order_matters
            FROM tasks t
            JOIN databases d ON t.database_id = d.id
            WHERE t.id = ?
        """
        async with self.conn.execute(query, (task_id,)) as cursor:
            return await cursor.fetchone()

    async def get_task_rules(self, task_id: int) -> List[dict]:
        rules_query = """
            SELECT id, category, condition, params_json, severity, message, sort_order
            FROM task_rules
            WHERE task_id = ?
            ORDER BY sort_order
        """
        async with self.conn.execute(rules_query, (task_id,)) as cur:
            rule_rows = await cur.fetchall()
        return [dict(r) for r in rule_rows]

    async def get_default_user_id(self) -> int:
        async with self.conn.execute("SELECT id FROM users LIMIT 1") as cur:
            user_row = await cur.fetchone()
        return user_row["id"] if user_row else 1

    async def save_attempt(self, task_id: int, user_id: int, sql_text: str, is_correct: bool, report_json: str) -> None:
        try:
            await self.conn.execute(
                """
                INSERT INTO attempts (task_id, user_id, sql_text, is_correct, report_json)
                VALUES (?, ?, ?, ?, ?)
                """,
                (task_id, user_id, sql_text, 1 if is_correct else 0, report_json),
            )

            if not is_correct:
                await self.conn.execute(
                    """
                    DELETE FROM attempts
                    WHERE id IN (
                        SELECT id FROM attempts
                        WHERE task_id = ? AND user_id = ? AND is_correct = 0
                        ORDER BY created_at DESC
                        LIMIT -1 OFFSET 5
                    )
                    """,
                    (task_id, user_id),
                )
            await self.conn.commit()
        except Exception:
            pass

    async def get_task_attempts(self, task_id: int, user_id: int) -> List[aiosqlite.Row]:
        query = """
            SELECT id, sql_text, is_correct, report_json, created_at
            FROM attempts
            WHERE task_id = ? AND user_id = ?
            ORDER BY created_at DESC
        """
        async with self.conn.execute(query, (task_id, user_id)) as cursor:
            return await cursor.fetchall()

    async def delete_task_attempt(self, task_id: int, attempt_id: int, user_id: int) -> None:
        await self.conn.execute(
            "DELETE FROM attempts WHERE id = ? AND task_id = ? AND user_id = ?",
            (attempt_id, task_id, user_id)
        )
        await self.conn.commit()

    async def delete_all_task_attempts(self, task_id: int, user_id: int, type: str) -> None:
        if type == "correct":
            await self.conn.execute("DELETE FROM attempts WHERE task_id = ? AND user_id = ? AND is_correct = 1", (task_id, user_id))
        elif type == "incorrect":
            await self.conn.execute("DELETE FROM attempts WHERE task_id = ? AND user_id = ? AND is_correct = 0", (task_id, user_id))
        else:
            await self.conn.execute("DELETE FROM attempts WHERE task_id = ? AND user_id = ?", (task_id, user_id))
        await self.conn.commit()

    async def get_database_id_by_name(self, db_name: str) -> Optional[int]:
        async with self.conn.execute("SELECT id FROM databases WHERE technical_name = ?", (db_name,)) as cursor:
            row = await cursor.fetchone()
            if row:
                return row["id"]
            return None

    async def import_task(
        self,
        title: str,
        description: str,
        difficulty: int,
        database_id: int,
        author_name: Optional[str],
        source_url: Optional[str],
        reference_sql: str,
        order_matters: bool,
        tags: List[str],
        rules: List[Any],
        signature: str,
        existing_id: Optional[int] = None
    ) -> int:
        if existing_id:
            task_id = existing_id
            await self.conn.execute(
                """
                UPDATE tasks
                SET title = ?,
                    description = ?,
                    difficulty = ?,
                    database_id = ?,
                    author_name = ?,
                    source_url = ?,
                    reference_sql = ?,
                    order_matters = ?,
                    task_signature = ?,
                    updated_at = datetime('now')
                WHERE id = ?
                """,
                (title, description, difficulty, database_id, author_name, source_url, reference_sql, order_matters, signature, task_id)
            )
        else:
            async with self.conn.execute(
                """
                INSERT INTO tasks (title, description, difficulty, database_id, author_name, source_url, reference_sql, order_matters, status, task_signature)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
                """,
                (title, description, difficulty, database_id, author_name, source_url, reference_sql, order_matters, signature)
            ) as cursor:
                task_id = cursor.lastrowid

        # Insert tags
        await self.conn.execute("DELETE FROM task_tags WHERE task_id = ?", (task_id,))
        for tag_name in tags:
            await self.conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?)", (tag_name,))
            async with self.conn.execute("SELECT id FROM tags WHERE name = ?", (tag_name,)) as cursor:
                row = await cursor.fetchone()
                if row:
                    await self.conn.execute("INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)", (task_id, row["id"]))

        # Insert rules
        await self.conn.execute("DELETE FROM task_rules WHERE task_id = ?", (task_id,))
        for i, rule in enumerate(rules):
            category = rule.get("category") if isinstance(rule, dict) else rule.category
            condition = rule.get("condition") if isinstance(rule, dict) else rule.condition
            params = rule.get("params") if isinstance(rule, dict) else rule.params
            severity = rule.get("severity", "blocking") if isinstance(rule, dict) else getattr(rule, "severity", "blocking")
            message = rule.get("message", "") if isinstance(rule, dict) else getattr(rule, "message", "")
            await self.conn.execute(
                """
                INSERT INTO task_rules (task_id, category, condition, params_json, severity, message, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (task_id, category, condition, json.dumps(params), severity, message, i)
            )

        await self.conn.commit()
        return task_id


