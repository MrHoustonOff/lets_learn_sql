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
import json
import time
from dataclasses import dataclass, field
from typing import Any

import asyncpg
import asyncpg.exceptions

from core.config import settings
from core.sql_checker import parse_sql, check_rule


# ---------------------------------------------------------------------------
# Data structures
# ---------------------------------------------------------------------------

@dataclass
class RowSample:
    rows: list[list]   # up to 5 rows for the UI
    total: int         # real count without limit


@dataclass
class Stage1Report:
    passed: bool
    user_row_count: int
    ref_row_count: int
    user_hash: str | None
    ref_hash: str | None
    hash_match: bool | None       # None = not computed
    except_ran: bool
    extra_rows: RowSample | None  # rows user has, ref doesn't
    missing_rows: RowSample | None  # rows ref has, user doesn't
    order_matters: bool
    order_passed: bool | None     # None = not checked
    sql_error: str | None = None  # error message if user SQL failed


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
    ran: bool
    rules: list[RuleResult]
    all_blocking_passed: bool


@dataclass
class GradeReport:
    verdict: bool
    stage1: Stage1Report
    stage2: Stage2Report
    duration_ms: float
    error: str | None = None

    def to_dict(self) -> dict:
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
                "sql_error": s1.sql_error,
            },
            "stage2": {
                "ran": s2.ran,
                "all_blocking_passed": s2.all_blocking_passed,
                "rules": [_rule(r) for r in s2.rules],
            },
        }


# ---------------------------------------------------------------------------
# Helpers
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


def _wrap_subquery(sql: str) -> str:
    """
    Wrap a SQL statement in a subquery to neutralize ORDER BY / LIMIT at top level.
    PostgreSQL requires this before EXCEPT ALL — top-level ORDER BY is not allowed inside CTE.
    """
    s = sql.strip().rstrip(";")
    return f"SELECT * FROM ({s}) _wrapped_q"


# ---------------------------------------------------------------------------
# Stage 1: result comparison
# Each sub-step runs in its own transaction that is always rolled back.
# We never share a single transaction across steps to avoid
# InFailedSQLTransactionError cascade when one step fails.
# ---------------------------------------------------------------------------

async def _fetch_readonly(conn: asyncpg.Connection, sql: str) -> list[asyncpg.Record]:
    """Run a query in a transaction that is always rolled back."""
    sp = conn.transaction()
    await sp.start()
    try:
        result = await conn.fetch(sql)
    except Exception:
        await sp.rollback()
        raise
    await sp.rollback()
    return result


async def _fetchval_readonly(conn: asyncpg.Connection, sql: str):
    """Run a scalar query in a transaction that is always rolled back."""
    sp = conn.transaction()
    await sp.start()
    try:
        result = await conn.fetchval(sql)
    except Exception:
        await sp.rollback()
        raise
    await sp.rollback()
    return result


async def _fetchrow_readonly(conn: asyncpg.Connection, sql: str):
    sp = conn.transaction()
    await sp.start()
    try:
        result = await conn.fetchrow(sql)
    except Exception:
        await sp.rollback()
        raise
    await sp.rollback()
    return result


async def _get_row_count(conn: asyncpg.Connection, sql: str) -> int:
    """Get row count of a query result."""
    count_sql = f"SELECT count(*) FROM ({_wrap_subquery(sql)}) _cnt"
    val = await _fetchval_readonly(conn, count_sql)
    return int(val or 0)


async def _compute_hash(conn: asyncpg.Connection, sql: str) -> str:
    """Compute md5 hash of the sorted string representation of all rows."""
    hash_sql = f"""
        SELECT coalesce(
            md5(string_agg(_t::text, '|' ORDER BY _t::text)),
            'EMPTY'
        ) AS h
        FROM (
            SELECT row_to_json(q)::text AS _t
            FROM ({_wrap_subquery(sql)}) q
        ) _hash_inner
    """
    val = await _fetchval_readonly(conn, hash_sql)
    return str(val or "EMPTY")


async def _except_all_counts(
    conn: asyncpg.Connection,
    user_sql: str,
    ref_sql: str,
    sample_limit: int = 50,
) -> tuple[RowSample, RowSample]:
    """
    EXCEPT ALL in both directions.
    Each wrapped to handle ORDER BY / LIMIT at top level.
    Reference: правила_сравнения (1).md — Шаг 2
    """
    u = _wrap_subquery(user_sql)
    r = _wrap_subquery(ref_sql)

    extra_sql   = f"({u}) EXCEPT ALL ({r})"
    missing_sql = f"({r}) EXCEPT ALL ({u})"

    extra_records   = await _fetch_readonly(conn, f"{extra_sql} LIMIT {sample_limit}")
    missing_records = await _fetch_readonly(conn, f"{missing_sql} LIMIT {sample_limit}")

    extra_total   = int((await _fetchval_readonly(conn, f"SELECT count(*) FROM ({extra_sql}) _e")) or 0)
    missing_total = int((await _fetchval_readonly(conn, f"SELECT count(*) FROM ({missing_sql}) _m")) or 0)

    # UI: max 5 rows per spec "Требования к выдаче на фронтенд"
    return (
        RowSample(rows=_records_to_rows(extra_records, limit=5), total=extra_total),
        RowSample(rows=_records_to_rows(missing_records, limit=5), total=missing_total),
    )


async def _check_order(conn: asyncpg.Connection, user_sql: str, ref_sql: str) -> bool:
    """
    Positional comparison via row_number().
    Reference: правила_сравнения (1).md — п. 2.0
    """
    u = _wrap_subquery(user_sql)
    r = _wrap_subquery(ref_sql)

    order_check_sql = f"""
        WITH
          _u AS (SELECT row_number() OVER () AS _pos, u.* FROM ({u}) u),
          _r AS (SELECT row_number() OVER () AS _pos, r.* FROM ({r}) r)
        SELECT count(*) FROM (
            SELECT * FROM _u EXCEPT ALL SELECT * FROM _r
        ) _diff
    """
    diff = int((await _fetchval_readonly(conn, order_check_sql)) or 0)
    return diff == 0


async def _run_preflight(conn: asyncpg.Connection, user_sql: str, ref_sql: str) -> str | None:
    """
    Stage 0: Preflight checks.
    Catches syntax errors, timeouts, and metadata mismatches (column count/types)
    before running the expensive and strict EXCEPT ALL operations.
    Returns an error string if preflight fails, else None.
    """
    import asyncpg.exceptions

    u_query = f"SELECT * FROM ({_wrap_subquery(user_sql)}) _validate LIMIT 0"
    r_query = f"SELECT * FROM ({_wrap_subquery(ref_sql)}) _validate LIMIT 0"

    # 1. User query syntax/runtime/timeout
    sp = conn.transaction()
    await sp.start()
    try:
        stmt_user = await conn.prepare(u_query)
        user_cols = stmt_user.get_attributes()
    except asyncpg.exceptions.QueryCanceledError:
        await sp.rollback()
        return "PREFLIGHT:TIMEOUT"
    except asyncpg.PostgresError as e:
        await sp.rollback()
        return f"PREFLIGHT:SYNTAX|{e}"
    except Exception as e:
        await sp.rollback()
        return f"PREFLIGHT:RUNTIME|{e}"
    await sp.rollback()

    # 2. Reference query syntax (Bug in task!)
    sp = conn.transaction()
    await sp.start()
    try:
        stmt_ref = await conn.prepare(r_query)
        ref_cols = stmt_ref.get_attributes()
    except Exception as e:
        await sp.rollback()
        return f"PREFLIGHT:PLATFORM|{e}"
    await sp.rollback()

    # 3. Compare column counts
    if len(user_cols) != len(ref_cols):
        return f"PREFLIGHT:COL_COUNT|{len(user_cols)}|{len(ref_cols)}"

    # 4. Compare column types positionally
    types_mismatch = False
    col_info = []
    for i in range(len(user_cols)):
        u_type = user_cols[i].type.name
        r_type = ref_cols[i].type.name
        match = (u_type == r_type)
        if not match:
            types_mismatch = True
        col_info.append({
            "pos": i + 1,
            "name": user_cols[i].name,
            "u_type": u_type,
            "r_type": r_type,
            "match": match
        })
    
    if types_mismatch:
        import json
        return f"PREFLIGHT:COL_TYPES|{json.dumps(col_info)}"

    return None


async def run_stage1(
    conn: asyncpg.Connection,
    user_sql: str,
    ref_sql: str,
    order_matters: bool,
) -> Stage1Report:
    """
    Full Stage 1 comparison.
    Each sub-step runs in its own rolled-back transaction to avoid
    cascading failures.
    """

    # --- Preflight (Stage 0) ---
    preflight_error = await _run_preflight(conn, user_sql, ref_sql)
    if preflight_error:
        return Stage1Report(
            passed=False,
            user_row_count=0, ref_row_count=0,
            user_hash=None, ref_hash=None, hash_match=None,
            except_ran=False, extra_rows=None, missing_rows=None,
            order_matters=order_matters, order_passed=None,
            sql_error=preflight_error,
        )

    # --- Count rows for both ---
    try:
        user_row_count = await _get_row_count(conn, user_sql)
        ref_row_count  = await _get_row_count(conn, ref_sql)
    except asyncpg.PostgresError as e:
        return Stage1Report(
            passed=False,
            user_row_count=0, ref_row_count=0,
            user_hash=None, ref_hash=None, hash_match=None,
            except_ran=False, extra_rows=None, missing_rows=None,
            order_matters=order_matters, order_passed=None,
            sql_error=str(e),
        )

    user_hash = None
    ref_hash = None
    hash_match = None
    except_ran = False
    extra = None
    missing = None
    order_passed = None
    stage1_passed = False

    # --- Step 1: Fast hash check (spec Шаг 1) ---
    # Skip hash for empty results — go directly to EXCEPT ALL
    if user_row_count > 0 or ref_row_count > 0:
        try:
            user_hash = await _compute_hash(conn, user_sql)
            ref_hash  = await _compute_hash(conn, ref_sql)
            hash_match = (user_hash == ref_hash) and (user_row_count == ref_row_count)

            if hash_match:
                # Fast path: data identical
                stage1_passed = True
                if order_matters:
                    order_passed = await _check_order(conn, user_sql, ref_sql)
                    stage1_passed = order_passed

                return Stage1Report(
                    passed=stage1_passed,
                    user_row_count=user_row_count, ref_row_count=ref_row_count,
                    user_hash=user_hash, ref_hash=ref_hash, hash_match=hash_match,
                    except_ran=False, extra_rows=None, missing_rows=None,
                    order_matters=order_matters, order_passed=order_passed,
                )

            # If they don't match, we fall through to EXCEPT ALL to generate the diff report

        except Exception:
            # Hash step failed — fall through to EXCEPT ALL
            user_hash = ref_hash = None
            hash_match = None
    else:
        # Both returned 0 rows → match immediately
        stage1_passed = True
        return Stage1Report(
            passed=True,
            user_row_count=0, ref_row_count=0,
            user_hash=None, ref_hash=None, hash_match=None,
            except_ran=False, extra_rows=None, missing_rows=None,
            order_matters=order_matters, order_passed=None,
        )

    # --- Step 2: EXCEPT ALL (spec Шаг 2) ---
    except_ran = True
    try:
        extra, missing = await _except_all_counts(conn, user_sql, ref_sql)
    except asyncpg.PostgresError as e:
        return Stage1Report(
            passed=False,
            user_row_count=user_row_count, ref_row_count=ref_row_count,
            user_hash=user_hash, ref_hash=ref_hash, hash_match=hash_match,
            except_ran=True, extra_rows=None, missing_rows=None,
            order_matters=order_matters, order_passed=None,
            sql_error=f"EXCEPT ALL error: {e}",
        )

    if extra.total == 0 and missing.total == 0:
        stage1_passed = True
        extra = None
        missing = None
        if order_matters:
            try:
                order_passed = await _check_order(conn, user_sql, ref_sql)
                stage1_passed = order_passed
            except Exception:
                order_passed = None
    else:
        stage1_passed = False

    return Stage1Report(
        passed=stage1_passed,
        user_row_count=user_row_count, ref_row_count=ref_row_count,
        user_hash=user_hash, ref_hash=ref_hash, hash_match=hash_match,
        except_ran=except_ran, extra_rows=extra, missing_rows=missing,
        order_matters=order_matters, order_passed=order_passed,
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

    try:
        ast = parse_sql(user_sql)
    except Exception as e:
        results = [
            RuleResult(
                rule_id=r["id"], category=r["category"], condition=r["condition"],
                params=_parse_params(r), severity=r["severity"], message=r["message"],
                sort_order=r.get("sort_order", 0), passed=False,
                actual_value=None, detail_msg=f"SQL parse error: {e}",
            )
            for r in rules
        ]
        return Stage2Report(ran=True, rules=results, all_blocking_passed=False)

    # Fetch EXPLAIN plan once for performance rules
    explain_json = None
    has_performance_rule = any(r["category"] == "performance" for r in rules)
    if has_performance_rule:
        try:
            explain_sql = f"EXPLAIN (FORMAT JSON) {_wrap_subquery(user_sql)}"
            rows = await _fetch_readonly(conn, explain_sql)
            if rows:
                explain_json = json.loads(rows[0][0])
        except Exception:
            pass

    results = []
    for rule in sorted(rules, key=lambda r: r.get("sort_order", 0)):
        try:
            passed, actual_value, detail_msg = check_rule(ast, explain_json, rule)
        except Exception as e:
            passed, actual_value, detail_msg = False, None, f"Rule check error: {e}"

        results.append(RuleResult(
            rule_id=rule["id"], category=rule["category"], condition=rule["condition"],
            params=_parse_params(rule), severity=rule["severity"], message=rule["message"],
            sort_order=rule.get("sort_order", 0), passed=passed,
            actual_value=actual_value, detail_msg=detail_msg,
        ))

    all_blocking_passed = all(r.passed for r in results if r.severity == "blocking")
    return Stage2Report(ran=True, rules=results, all_blocking_passed=all_blocking_passed)


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

    if not user_sql.strip():
        dummy_s1 = Stage1Report(
            passed=False, user_row_count=0, ref_row_count=0,
            user_hash=None, ref_hash=None, hash_match=None,
            except_ran=False, extra_rows=None, missing_rows=None,
            order_matters=order_matters, order_passed=None, sql_error="Empty SQL",
        )
        return GradeReport(
            verdict=False, stage1=dummy_s1,
            stage2=Stage2Report(ran=False, rules=[], all_blocking_passed=False),
            duration_ms=0, error="Empty SQL",
        )

    conn = await _get_conn(db_name)
    try:
        await conn.execute(f"SET statement_timeout = '{settings.QUERY_TIMEOUT_MS}ms'")

        # Stage 1
        stage1 = await run_stage1(conn, user_sql, reference_sql, order_matters)

        # Stage 2: only if Stage 1 passed (per spec)
        if stage1.passed and rules:
            stage2 = await run_stage2(conn, user_sql, rules)
        else:
            stage2 = Stage2Report(ran=stage1.passed, rules=[], all_blocking_passed=True)

        # Verdict formula per spec п. 2.7
        verdict = (
            stage1.passed
            and stage2.all_blocking_passed
            and (stage1.order_passed is not False)
        )

    except asyncpg.exceptions.QueryCanceledError:
        err_msg = "PREFLIGHT:TIMEOUT"
        dummy_s1 = Stage1Report(
            passed=False, user_row_count=0, ref_row_count=0,
            user_hash=None, ref_hash=None, hash_match=None,
            except_ran=False, extra_rows=None, missing_rows=None,
            order_matters=order_matters, order_passed=None, sql_error=err_msg,
        )
        return GradeReport(
            verdict=False, stage1=dummy_s1,
            stage2=Stage2Report(ran=False, rules=[], all_blocking_passed=False),
            duration_ms=round((time.monotonic() - start) * 1000, 2),
            error=err_msg,
        )
    except Exception as e:
        dummy_s1 = Stage1Report(
            passed=False, user_row_count=0, ref_row_count=0,
            user_hash=None, ref_hash=None, hash_match=None,
            except_ran=False, extra_rows=None, missing_rows=None,
            order_matters=order_matters, order_passed=None, sql_error=f"Ошибка выполнения запроса: {e}",
        )
        return GradeReport(
            verdict=False, stage1=dummy_s1,
            stage2=Stage2Report(ran=False, rules=[], all_blocking_passed=False),
            duration_ms=round((time.monotonic() - start) * 1000, 2),
            error=str(e),
        )
    finally:
        await conn.close()

    duration_ms = round((time.monotonic() - start) * 1000, 2)
    return GradeReport(verdict=verdict, stage1=stage1, stage2=stage2, duration_ms=duration_ms)
