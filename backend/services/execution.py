import time
import json
from typing import Dict, Any, List
from pydantic import BaseModel

from core.grader import grade_submission, run_stage2
from core.security import validate_sql
from db.repositories.tasks import TaskRepository
from schemas.tasks import SolutionResponse
from core.config import settings
from core.exceptions import RollbackTransaction
from core import database as db_module

class TaskExecutionService:
    def __init__(self, repo: TaskRepository):
        self.repo = repo

    async def submit_answer(self, task_id: int, user_sql: str) -> Dict[str, Any]:
        """Validates user SQL, grades it, and saves the attempt."""
        is_valid, err = validate_sql(user_sql)
        if not is_valid:
            raise ValueError(err)

        task_row = await self.repo.get_task_reference(task_id)
        if not task_row:
            raise LookupError("Task not found")

        reference_sql = task_row["reference_sql"]
        order_matters = bool(task_row["order_matters"])
        db_name = task_row["db_name"]

        rules = await self.repo.get_task_rules(task_id)

        report = await grade_submission(
            user_sql=user_sql,
            reference_sql=reference_sql,
            db_name=db_name,
            order_matters=order_matters,
            rules=rules,
        )

        report_dict = report.to_dict()

        user_id = await self.repo.get_default_user_id()
        await self.repo.save_attempt(
            task_id=task_id,
            user_id=user_id,
            sql_text=user_sql,
            is_correct=report.verdict,
            report_json=json.dumps(report_dict)
        )

        return report_dict

    async def check_rules(self, task_id: int, rules_input: List[BaseModel]) -> Dict[str, Any]:
        """Checks rules logic without full grading."""
        task_row = await self.repo.get_task_reference(task_id)
        if not task_row:
            raise LookupError("Task not found")
        if not task_row["reference_sql"]:
            raise ValueError("No reference SQL available")

        parsed_rules = []
        for i, r in enumerate(rules_input):
            d = r.model_dump()
            d["id"] = i  # Fake ID to satisfy run_stage2
            parsed_rules.append(d)

        if not parsed_rules:
            return {"rules": []}

        pool = await db_module.get_user_pool(task_row["db_name"])
        async with pool.acquire() as conn:
            stage2 = await run_stage2(conn, task_row["reference_sql"], parsed_rules)
            def _rule(r):
                return {
                    "rule_id": r.rule_id,
                    "passed": r.passed,
                    "severity": r.severity,
                    "message": r.message,
                    "detail_msg": getattr(r, "detail_msg", None)
                }
            return {"rules": [_rule(r) for r in stage2.rules]}

    async def get_solution(self, task_id: int) -> SolutionResponse:
        """Executes reference SQL in an isolated transaction to get expected output."""
        row = await self.repo.get_task_reference(task_id)
        if not row:
            raise LookupError("Task not found")
            
        solution_sql = row["reference_sql"]
        db_name = row["db_name"]
        
        pool = await db_module.get_user_pool(db_name)
        
        start = time.monotonic()
        
        async def _run_with_rollback(conn):
            await conn.execute(f"SET statement_timeout = '{settings.QUERY_TIMEOUT_MS}ms'")
            try:
                async with conn.transaction():
                    records = await conn.fetch(solution_sql)
                    raise RollbackTransaction(records)
            except RollbackTransaction as e:
                return e.args[0]

        async with pool.acquire() as conn:
            records = await _run_with_rollback(conn)
            
        duration_ms = (time.monotonic() - start) * 1000
        
        if not records:
            return SolutionResponse(solution_sql=solution_sql, columns=[], rows=[], row_count=0, duration_ms=duration_ms)
            
        columns = list(records[0].keys())
        rows_data = []
        for record in records[:settings.QUERY_ROWS_LIMIT]:
            row = []
            for v in record.values():
                if isinstance(v, (str, int, float, bool, type(None))):
                    row.append(v)
                else:
                    row.append(str(v))
            rows_data.append(row)
        
        return SolutionResponse(
            solution_sql=solution_sql,
            columns=columns,
            rows=rows_data,
            row_count=len(records),
            duration_ms=duration_ms
        )
