"""
sql_checker.py — AST-based rule checking for user SQL queries.

Reference: правила_сравнения (1).md — Этап 2, п. 2.2, 2.4
All category/condition logic follows the spec exactly.
"""
from __future__ import annotations
import json
from typing import Any
import sqlglot
import sqlglot.expressions as exp


# ---------------------------------------------------------------------------
# AST helpers
# ---------------------------------------------------------------------------

def parse_sql(sql: str) -> exp.Expression:
    """Parse SQL with postgres dialect. Returns the first parsed statement."""
    statements = sqlglot.parse(sql, dialect="postgres")
    if not statements:
        raise ValueError("Could not parse SQL")
    return statements[0]


def count_construct(ast: exp.Expression, target: str) -> int:
    """
    Count occurrences of a SQL construct in the AST.
    Targets match spec п. 2.4 exactly.
    """
    target = target.upper()

    if target == "JOIN":
        return len(list(ast.find_all(exp.Join)))

    elif target == "INNER_JOIN":
        return sum(
            1 for j in ast.find_all(exp.Join)
            if j.args.get("kind", "").upper() in ("", "INNER")
            and j.args.get("side", "") == ""
        )

    elif target == "LEFT_JOIN":
        return sum(
            1 for j in ast.find_all(exp.Join)
            if j.args.get("side", "").upper() == "LEFT"
        )

    elif target == "RIGHT_JOIN":
        return sum(
            1 for j in ast.find_all(exp.Join)
            if j.args.get("side", "").upper() == "RIGHT"
        )

    elif target == "FULL_JOIN":
        return sum(
            1 for j in ast.find_all(exp.Join)
            if j.args.get("side", "").upper() == "FULL"
        )

    elif target == "GROUP_BY":
        return len(list(ast.find_all(exp.Group)))

    elif target == "HAVING":
        return len(list(ast.find_all(exp.Having)))

    elif target == "SUBQUERY":
        # Subqueries are Subquery nodes inside FROM / WHERE / SELECT list
        return len(list(ast.find_all(exp.Subquery)))

    elif target == "WINDOW_FUNCTION":
        return len(list(ast.find_all(exp.Window)))

    elif target == "CTE":
        return len(list(ast.find_all(exp.With)))

    elif target == "DISTINCT":
        return len(list(ast.find_all(exp.Distinct)))

    elif target == "UNION":
        return len(list(ast.find_all(exp.Union)))

    elif target == "CASE":
        return len(list(ast.find_all(exp.Case)))

    elif target == "AGGREGATE_FUNCTION":
        agg_types = (exp.Count, exp.Sum, exp.Avg, exp.Min, exp.Max)
        return sum(len(list(ast.find_all(t))) for t in agg_types)

    return 0


def get_tables(ast: exp.Expression) -> set[str]:
    """Return all table names (lowercased) referenced in the query."""
    return {t.name.lower() for t in ast.find_all(exp.Table) if t.name}


def get_columns(ast: exp.Expression) -> set[str]:
    """Return all column names (lowercased) referenced in the query."""
    cols = set()
    for col in ast.find_all(exp.Column):
        if col.name:
            cols.add(col.name.lower())
        # Also add qualified form table.column
        if col.table and col.name:
            cols.add(f"{col.table.lower()}.{col.name.lower()}")
    return cols


def get_functions(ast: exp.Expression) -> set[str]:
    """Return uppercased names of all functions called in the query."""
    funcs = set()
    for node in ast.find_all(exp.Func):
        name = node.__class__.__name__.upper()
        # sqlglot maps functions to classes; use sql_name if available
        sql_name = getattr(node, "sql_name", None)
        if callable(sql_name):
            try:
                funcs.add(sql_name().upper())
            except Exception:
                funcs.add(name)
        else:
            funcs.add(name)
    # Also capture Anonymous functions (user-defined / less common)
    for node in ast.find_all(exp.Anonymous):
        if node.name:
            funcs.add(node.name.upper())
    return funcs


def has_select_star(ast: exp.Expression) -> bool:
    """Return True if SELECT * (or table.*) appears anywhere in the query."""
    return bool(ast.find(exp.Star))


def check_aliases(ast: exp.Expression, scope: str) -> tuple[bool, str]:
    """
    Check alias usage.
    scope: 'columns' | 'tables' | 'both'
    Returns (passed, detail_message)
    """
    col_ok = True
    tbl_ok = True
    col_detail = ""
    tbl_detail = ""

    if scope in ("columns", "both"):
        # Every item in the outermost SELECT list (except *) must be an Alias
        selects = list(ast.find_all(exp.Select))
        for sel in selects:
            for expr in sel.expressions:
                if isinstance(expr, exp.Star):
                    continue
                if not isinstance(expr, exp.Alias):
                    col_ok = False
                    col_detail = f"column '{expr.sql(dialect='postgres')}' without alias"
                    break
            if not col_ok:
                break

    if scope in ("tables", "both"):
        # Every Table node in FROM/JOIN must have an alias
        for tbl in ast.find_all(exp.Table):
            if not tbl.alias:
                tbl_ok = False
                tbl_detail = f"table '{tbl.name}' without alias"
                break

    if scope == "columns":
        return col_ok, col_detail
    elif scope == "tables":
        return tbl_ok, tbl_detail
    else:  # both
        if col_ok and tbl_ok:
            return True, ""
        return False, col_detail or tbl_detail


# ---------------------------------------------------------------------------
# Rule checker dispatcher
# ---------------------------------------------------------------------------

def check_rule(
    ast: exp.Expression,
    explain_json: list | None,
    rule: dict,
) -> tuple[bool, Any, str]:
    """
    Check a single task rule against the parsed AST (and explain plan).

    Returns:
        (passed: bool, actual_value: Any, detail_msg: str)

    Reference: правила_сравнения (1).md — п. 2.2, 2.4
    """
    category = rule["category"]
    condition = rule["condition"]
    params = rule.get("params_json") or rule.get("params") or {}
    if isinstance(params, str):
        try:
            params = json.loads(params)
        except Exception:
            params = {}

    # ---- A: construct -------------------------------------------------------
    if category == "construct":
        target = params.get("target", "")
        count = count_construct(ast, target)

        if condition == "required":
            passed = count >= 1
            detail = f"Found: {target} used {count} time(s)" if not passed else f"Found: {target} ({count})"
            return passed, count, detail

        elif condition == "forbidden":
            passed = count == 0
            detail = f"Found: {target} used {count} time(s)" if not passed else "Not found (correct)"
            return passed, count, detail

        elif condition == "count_min":
            value = int(params.get("value", 1))
            passed = count >= value
            detail = f"Found: {count} (required at least {value})"
            return passed, count, detail

        elif condition == "count_max":
            value = int(params.get("value", 1))
            passed = count <= value
            detail = f"Found: {count} (allowed at most {value})"
            return passed, count, detail

        elif condition == "count_exact":
            value = int(params.get("value", 1))
            passed = count == value
            detail = f"Found: {count} (required exactly {value})"
            return passed, count, detail

    # ---- B: object ----------------------------------------------------------
    elif category == "object":
        obj_type = params.get("object_type", "table")
        obj_name = params.get("object_name", "").lower()

        if obj_type == "table":
            names = get_tables(ast)
        else:
            names = get_columns(ast)

        found = obj_name in names

        if condition == "required":
            passed = found
            detail = f"Found: {obj_type} '{obj_name}'" if found else f"Not found: {obj_type} '{obj_name}'"
            return passed, found, detail

        elif condition == "forbidden":
            passed = not found
            detail = f"Found: {obj_type} '{obj_name}' (forbidden)" if found else "Not used (correct)"
            return passed, not found, detail

    # ---- C: function --------------------------------------------------------
    elif category == "function":
        func_name = params.get("function_name", "").upper()
        funcs = get_functions(ast)
        found = func_name in funcs

        if condition == "required":
            passed = found
            detail = f"Function {func_name} found" if found else f"Function {func_name} not found"
            return passed, found, detail

        elif condition == "forbidden":
            passed = not found
            detail = f"Function {func_name} used (forbidden)" if found else "Not used (correct)"
            return passed, not found, detail

    # ---- D: select_star -----------------------------------------------------
    elif category == "select_star":
        found = has_select_star(ast)
        if condition == "forbidden":
            passed = not found
            detail = "SELECT * found (forbidden)" if found else "No SELECT * (correct)"
            return passed, found, detail

    # ---- E: alias -----------------------------------------------------------
    elif category == "alias":
        scope = params.get("scope", "columns")
        if condition == "required":
            passed, detail = check_aliases(ast, scope)
            return passed, passed, detail if not passed else f"Aliases used ({scope})"

    # ---- F: performance -----------------------------------------------------
    elif category == "performance":
        if condition == "count_max" and explain_json is not None:
            max_cost = float(params.get("max_cost", 0))
            actual_cost = _extract_total_cost(explain_json)
            passed = actual_cost <= max_cost
            detail = f"Cost: {actual_cost:.1f} (allowed <= {max_cost})"
            return passed, actual_cost, detail

        elif condition == "no_seqscan" and explain_json is not None:
            table_name = params.get("table_name", "").lower()
            found_seqscan = _has_seqscan(explain_json, table_name)
            passed = not found_seqscan
            detail = f"Seq Scan on '{table_name}' found" if found_seqscan else f"No Seq Scan on '{table_name}' (correct)"
            return passed, found_seqscan, detail

        # explain_json not available — skip gracefully
        return True, None, "EXPLAIN not available"

    # Unknown category/condition — pass by default
    return True, None, "Unknown rule category"


def _extract_total_cost(explain_json: list) -> float:
    """Extract Total Cost from root node of EXPLAIN (FORMAT JSON) output."""
    try:
        return float(explain_json[0]["Plan"]["Total Cost"])
    except (KeyError, IndexError, TypeError):
        return 0.0


def _has_seqscan(explain_json: list, table_name: str) -> bool:
    """Recursively search EXPLAIN plan for Seq Scan on the given table."""
    try:
        plan = explain_json[0]["Plan"]
        return _seqscan_recursive(plan, table_name)
    except (KeyError, IndexError, TypeError):
        return False


def _seqscan_recursive(node: dict, table_name: str) -> bool:
    if (
        node.get("Node Type") == "Seq Scan"
        and node.get("Relation Name", "").lower() == table_name
    ):
        return True
    for child in node.get("Plans", []):
        if _seqscan_recursive(child, table_name):
            return True
    return False
