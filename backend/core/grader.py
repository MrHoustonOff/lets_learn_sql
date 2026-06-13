"""
grader.py — Core grading engine.

Reference: правила_сравнения (1).md — Алгоритм сравнения (Этапы 1 и 2)

Algorithm:
  Stage 1: Compare result sets via count+hash (fast) then EXCEPT ALL (exact).
            If order_matters=True — positional row comparison after muset match.
  Stage 2: AST rule checks (sqlglot) + EXPLAIN for performance rules.
  Verdict: passed iff Stage 1 passed AND all blocking rules in Stage 2 passed.
"""
from __future__ import annotations
import hashlib
import json
import time
from dataclasses import dataclass, field
from typing import Any

import asyncpg

from core.config import settings
from core.sql_checker import parse_sql, check_rule


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class RowSample:
    rows: list[list]          # up to 5 rows for the UI
    total: int                 # real count without limit


@dataclass
class Stage1Report:
    passed: bool
    user_row_count: int
    ref_row_count: int
    user_hash: str | None
    ref_hash: str | None
    hash_match: bool | None       # None = not computed (small result)
    except_ran: bool
    extra_rows: RowSample | None  # rows user has, ref doesn't
    missing_rows: RowSample | None  # rows ref has, user doesn't
    order_matters: bool
    order_passed: bool | None     # None = not checked


@dataclass
class RuleResult:
    rule_id: int
    category: str
    condition: str
    params: dict
    severity: str
    message: str
    sort_order: int
    passed: bool
    actual_value: Any
    detail_msg: str


@dataclass
class Stage2Report:
    ran: bool                     # False if Stage 1 failed
    rules: list[RuleResult]
    all_blocking_passed: bool


@dataclass
class GradeReport:
    verdict: bool                 # True = зачтено
    stage1: Stage1Report
    stage2: Stage2Report
    duration_ms: float
    error: str | None = None      # top-level error (e.g. syntax)

    def to_dict(self) -> dict:
        """Serialize to JSON-safe dict for API response and attempt storage."""
        def _sample(s: RowSample | None) -> dict | None:
            if s is None:
                return None
            return {"rows": s.rows, "total": s.total}

        def _rule(r: RuleResult) -> dict:
            return {
                "rule_id": r.rule_id,
                "category": r.category,
                "condition": r.condition,
                "params": r.params,
                "severity": r.severity,
                "message": r.message,
                "sort_order": r.sort_order,
                "passed": r.passed,
                "actual_value": r.actual_value,
                "detail_msg": r.detail_msg,
            }

        s1 = self.stage1
        s2 = self.stage2
        return {
            "verdict": self.verdict,
            "duration_ms": self.duration_ms,
            "error": self.error,
            "stage1": {
                "passed": s1.passed,
                "user_row_count": s1.user_row_count,
                "ref_row_count": s1.ref_row_count,
                "user_hash": s1.user_hash,
                "ref_hash": s1.ref_hash,
                "hash_match": s1.hash_match,
                "except_ran": s1.except_ran,
                "extra_rows": _sample(s1.extra_rows),
                "missing_rows": _sample(s1.missing_rows),
                "order_matters": s1.order_matters,
                "order_passed": s1.order_passed,
            },
            "stage2": {
                "ran": s2.ran,
                "all_blocking_passed": s2.all_blocking_passed,
                "rules": [_rule(r) for r in s2.rules],
            },
        }


# ---------------------------------------------------------------------------
# Postgres connection helper (supports any db by name)
# ---------------------------------------------------------------------------

async def _get_conn(db_name: str) -> asyncpg.Connection:
    return await asyncpg.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        database=db_name,
        timeout=5.0,
    )


# ---------------------------------------------------------------------------
# Stage 1: result comparison
# ---------------------------------------------------------------------------

# Threshold below which we skip the hash step and go straight to EXCEPT ALL
_HASH_SKIP_THRESHOLD = 2000


async def _run_readonly(conn: asyncpg.Connection, sql: str, params=None) -> list[asyncpg.Record]:
    """Execute SQL inside a transaction that is always rolled back."""
    class _Rollback(Exception):
        pass

    result = []
    try:
        async with conn.transaction():
            result = await conn.fetch(sql) if not params else await conn.fetch(sql, *params)
            raise _Rollback()
    except _Rollback:
        pass
    return result


def _records_to_rows(records: list[asyncpg.Record], limit: int | None = None) -> list[list]:
    out = []
    for rec in (records[:limit] if limit else records):
        row = []
        for v in rec.values():
            if isinstance(v, (str, int, float, bool, type(None))):
                row.append(v)
            else:
                row.append(str(v))
        out.append(row)
    return out


async def _count_and_hash(conn: asyncpg.Connection, user_sql: str, ref_sql: str) -> tuple[int, int, str, str]:
    """Compute row counts and md5 hashes for both queries via a single CTE."""
    # We use string_agg with a stable ORDER BY across all columns cast to text.
    hash_sql = f"""
        WITH
          _u AS ({user_sql}),
          _r AS ({ref_sql}),
          _uc AS (SELECT count(*) AS n FROM _u),
          _rc AS (SELECT count(*) AS n FROM _r),
          _uh AS (
            SELECT md5(string_agg(_row::text, ',' ORDER BY _row::text)) AS h
            FROM (SELECT row(_u.*) AS _row FROM _u) _
          ),
          _rh AS (
            SELECT md5(string_agg(_row::text, ',' ORDER BY _row::text)) AS h
            FROM (SELECT row(_r.*) AS _row FROM _r) _
          )
        SELECT _uc.n AS u_count, _rc.n AS r_count, _uh.h AS u_hash, _rh.h AS r_hash
        FROM _uc, _rc, _uh, _rh
    """
    row = await conn.fetchrow(hash_sql)
    return (
        int(row["u_count"]),
        int(row["r_count"]),
        row["u_hash"] or "",
        row["r_hash"] or "",
    )


async def _except_all(
    conn: asyncpg.Connection,
    user_sql: str,
    ref_sql: str,
    sample_limit: int = 50,
) -> tuple[RowSample, RowSample]:
    """
    Compute both EXCEPT ALL directions per spec шаг 2.
    Returns (extra_rows, missing_rows) as RowSample(rows=up_to_50, total=exact_count).
    """
    extra_sql = f"""
        WITH _u AS ({user_sql}), _r AS ({ref_sql})
        SELECT * FROM _u EXCEPT ALL SELECT * FROM _r
    """
    missing_sql = f"""
        WITH _u AS ({user_sql}), _r AS ({ref_sql})
        SELECT * FROM _r EXCEPT ALL SELECT * FROM _u
    """
    count_extra_sql = f"SELECT count(*) FROM ({extra_sql}) _"
    count_missing_sql = f"SELECT count(*) FROM ({missing_sql}) _"

    extra_records = await conn.fetch(f"{extra_sql} LIMIT {sample_limit}")
    missing_records = await conn.fetch(f"{missing_sql} LIMIT {sample_limit}")
    extra_total = int((await conn.fetchval(count_extra_sql)) or 0)
    missing_total = int((await conn.fetchval(count_missing_sql)) or 0)

    # UI gets max 5 rows per spec "Требования к выдаче на фронтенд"
    return (
        RowSample(rows=_records_to_rows(extra_records, limit=5), total=extra_total),
        RowSample(rows=_records_to_rows(missing_records, limit=5), total=missing_total),
    )


async def _check_order(conn: asyncpg.Connection, user_sql: str, ref_sql: str) -> bool:
    """
    Positional comparison via row_number() — spec п. 2.0.
    Both CTEs must NOT have an internal ORDER BY (we compare output position).
    """
    order_sql = f"""
        WITH
          _u AS (SELECT *, row_number() OVER () AS _rn FROM ({user_sql}) _u_inner),
          _r AS (SELECT *, row_number() OVER () AS _rn FROM ({ref_sql}) _r_inner)
        SELECT count(*) AS mismatches
        FROM _u
        FULL OUTER JOIN _r ON _u._rn = _r._rn
        WHERE _u::text IS DISTINCT FROM _r::text
    """
    # Simpler positional check: compare row-by-row using EXCEPT on numbered rows
    order_check_sql = f"""
        WITH
          _u AS (SELECT row_number() OVER () AS _pos, u.* FROM ({user_sql}) u),
          _r AS (SELECT row_number() OVER () AS _pos, r.* FROM ({ref_sql}) r)
        SELECT count(*) FROM (
            SELECT * FROM _u EXCEPT ALL SELECT * FROM _r
        ) diff
    """
    diff = int((await conn.fetchval(order_check_sql)) or 0)
    return diff == 0


async def run_stage1(
    conn: asyncpg.Connection,
    user_sql: str,
    ref_sql: str,
    order_matters: bool,
) -> Stage1Report:
    """Full Stage 1 comparison. All queries run inside rolled-back transactions."""

    class _Rollback(Exception):
        pass

    user_row_count = 0
    ref_row_count = 0
    user_hash = None
    ref_hash = None
    hash_match = None
    except_ran = False
    extra: RowSample | None = None
    missing: RowSample | None = None
    order_passed = None
    stage1_passed = False

    try:
        async with conn.transaction():
            # --- Step 1: count + hash ---
            try:
                u_count, r_count, u_hash, r_hash = await _count_and_hash(conn, user_sql, ref_sql)
            except Exception:
                # Hash step failed (e.g. column type issue) — fall through to EXCEPT ALL
                u_count, r_count = 0, 0
                u_hash, r_hash = None, None

            user_row_count = u_count
            ref_row_count = r_count

            if u_hash and r_hash:
                user_hash = u_hash
                ref_hash = r_hash
                hash_match = (u_hash == r_hash) and (u_count == r_count)

                if hash_match:
                    # Fast path: hashes match → data is identical
                    stage1_passed = True
                    if order_matters:
                        order_passed = await _check_order(conn, user_sql, ref_sql)
                        stage1_passed = order_passed
                    raise _Rollback()

            # --- Step 2: EXCEPT ALL ---
            except_ran = True
            extra, missing = await _except_all(conn, user_sql, ref_sql)

            if extra.total == 0 and missing.total == 0:
                stage1_passed = True
                extra = None
                missing = None
                if order_matters:
                    order_passed = await _check_order(conn, user_sql, ref_sql)
                    stage1_passed = order_passed
            else:
                stage1_passed = False

            raise _Rollback()

    except _Rollback:
        pass
    except asyncpg.PostgresError as e:
        # SQL error from user query — not a verdict failure but report the error
        return Stage1Report(
            passed=False,
            user_row_count=0,
            ref_row_count=0,
            user_hash=None,
            ref_hash=None,
            hash_match=None,
            except_ran=False,
            extra_rows=None,
            missing_rows=None,
            order_matters=order_matters,
            order_passed=None,
        )

    return Stage1Report(
        passed=stage1_passed,
        user_row_count=user_row_count,
        ref_row_count=ref_row_count,
        user_hash=user_hash,
        ref_hash=ref_hash,
        hash_match=hash_match,
        except_ran=except_ran,
        extra_rows=extra,
        missing_rows=missing,
        order_matters=order_matters,
        order_passed=order_passed,
    )


# ---------------------------------------------------------------------------
# Stage 2: AST rule checks
# ---------------------------------------------------------------------------

async def run_stage2(
    conn: asyncpg.Connection,
    user_sql: str,
    rules: list[dict],
) -> Stage2Report:
    """
    Check all task rules against user SQL.
    Reference: правила_сравнения (1).md — Этап 2, пп. 2.2–2.4
    """
    if not rules:
        return Stage2Report(ran=True, rules=[], all_blocking_passed=True)

    # Parse AST once
    try:
        ast = parse_sql(user_sql)
    except Exception as e:
        # Unparseable SQL — all rules fail
        results = [
            RuleResult(
                rule_id=r["id"],
                category=r["category"],
                condition=r["condition"],
                params=_parse_params(r),
                severity=r["severity"],
                message=r["message"],
                sort_order=r.get("sort_order", 0),
                passed=False,
                actual_value=None,
                detail_msg=f"SQL parse error: {e}",
            )
            for r in rules
        ]
        return Stage2Report(ran=True, rules=results, all_blocking_passed=False)

    # Fetch EXPLAIN plan once (needed for performance rules)
    explain_json = None
    has_performance_rule = any(r["category"] == "performance" for r in rules)
    if has_performance_rule:
        try:
            async with conn.transaction():
                rows = await conn.fetch(f"EXPLAIN (FORMAT JSON) {user_sql}")
                if rows:
                    explain_json = json.loads(rows[0][0])
                raise _RollbackStage2()
        except _RollbackStage2:
            pass
        except Exception:
            pass  # explain failed, performance rules will skip gracefully

    results = []
    for rule in sorted(rules, key=lambda r: r.get("sort_order", 0)):
        try:
            passed, actual_value, detail_msg = check_rule(ast, explain_json, rule)
        except Exception as e:
            passed, actual_value, detail_msg = False, None, f"Rule check error: {e}"

        results.append(RuleResult(
            rule_id=rule["id"],
            category=rule["category"],
            condition=rule["condition"],
            params=_parse_params(rule),
            severity=rule["severity"],
            message=rule["message"],
            sort_order=rule.get("sort_order", 0),
            passed=passed,
            actual_value=actual_value,
            detail_msg=detail_msg,
        ))

    all_blocking_passed = all(
        r.passed for r in results if r.severity == "blocking"
    )

    return Stage2Report(ran=True, rules=results, all_blocking_passed=all_blocking_passed)


class _RollbackStage2(Exception):
    pass


def _parse_params(rule: dict) -> dict:
    raw = rule.get("params_json") or rule.get("params") or {}
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return {}
    return raw


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

async def grade_submission(
    user_sql: str,
    reference_sql: str,
    db_name: str,
    order_matters: bool,
    rules: list[dict],
) -> GradeReport:
    """
    Full grading pipeline: Stage 1 (data comparison) + Stage 2 (rule checks).

    Reference: правила_сравнения (1).md — Дорожная карта реализации
    """
    start = time.monotonic()

    # Empty SQL guard
    if not user_sql.strip():
        dummy_s1 = Stage1Report(
            passed=False, user_row_count=0, ref_row_count=0,
            user_hash=None, ref_hash=None, hash_match=None,
            except_ran=False, extra_rows=None, missing_rows=None,
            order_matters=order_matters, order_passed=None,
        )
        dummy_s2 = Stage2Report(ran=False, rules=[], all_blocking_passed=False)
        return GradeReport(
            verdict=False, stage1=dummy_s1, stage2=dummy_s2,
            duration_ms=0, error="Empty SQL"
        )

    conn = await _get_conn(db_name)
    try:
        await conn.execute(f"SET statement_timeout = '{settings.QUERY_TIMEOUT_MS}ms'")

        # Stage 1
        try:
            stage1 = await run_stage1(conn, user_sql, reference_sql, order_matters)
        except asyncpg.PostgresError as e:
            dummy_s1 = Stage1Report(
                passed=False, user_row_count=0, ref_row_count=0,
                user_hash=None, ref_hash=None, hash_match=None,
                except_ran=False, extra_rows=None, missing_rows=None,
                order_matters=order_matters, order_passed=None,
            )
            dummy_s2 = Stage2Report(ran=False, rules=[], all_blocking_passed=False)
            return GradeReport(
                verdict=False, stage1=dummy_s1, stage2=dummy_s2,
                duration_ms=round((time.monotonic() - start) * 1000, 2),
                error=str(e),
            )

        # Stage 2 — always runs per spec (even if stage1 failed, rules are still evaluated)
        # But spec says "Если Этап 1 пройден — дополнительно запускается Этап 2"
        # So we only run stage 2 if stage 1 passed.
        if stage1.passed and rules:
            stage2 = await run_stage2(conn, user_sql, rules)
        else:
            stage2 = Stage2Report(ran=stage1.passed, rules=[], all_blocking_passed=True)

        # Verdict formula per spec п. 2.7:
        # зачтено = (Stage1 passed) AND (all blocking rules passed) AND (order ok if order_matters)
        verdict = (
            stage1.passed
            and stage2.all_blocking_passed
            and (stage1.order_passed is not False)
        )

    finally:
        await conn.close()

    duration_ms = round((time.monotonic() - start) * 1000, 2)
    return GradeReport(verdict=verdict, stage1=stage1, stage2=stage2, duration_ms=duration_ms)
