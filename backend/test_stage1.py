import asyncio
import os

# Environment variables are already set by Docker.

from core.grader import (
    _get_conn, _fetch_readonly, run_stage1
)

async def test_1_1_rollback(conn):
    print("\n--- Test 1.1: Safe Execution (ROLLBACK) ---")
    
    # a) Correct SELECT
    print("a) Correct SELECT")
    res = await _fetch_readonly(conn, "SELECT count(*) FROM customers")
    print(f"   Success, count={res[0][0]}")

    # b) Syntax error
    print("b) Syntax error")
    try:
        await _fetch_readonly(conn, "SELEC * FRM customers")
        print("   FAIL: Expected error")
    except Exception as e:
        print(f"   Pass: Caught expected error: {e}")

    # c) Destructive query
    print("c) Destructive query (DELETE)")
    count_before = (await _fetch_readonly(conn, "SELECT count(*) FROM customers"))[0][0]
    try:
        await _fetch_readonly(conn, "DELETE FROM customers")
        print("   Pass: DELETE query completed (rollback expected).")
    except Exception as e:
        print(f"   Note: DELETE failed (maybe permission?): {e}")
    count_after = (await _fetch_readonly(conn, "SELECT count(*) FROM customers"))[0][0]
    if count_before == count_after:
        print("   Pass: Data was rolled back properly.")
    else:
        print("   FAIL: Data was modified!")

async def test_1_2_fast_check(conn):
    print("\n--- Test 1.2: Fast Check (Count + Hash) ---")
    
    # a) Identical
    print("a) Identical queries")
    q = "SELECT customer_id, company_name FROM customers ORDER BY customer_id LIMIT 10"
    report = await run_stage1(conn, q, q, False)
    if report.hash_match and not report.except_ran:
        print("   Pass: Hash match, EXCEPT ALL skipped.")
    else:
        print("   FAIL:", report)

    # b) Different column order
    print("b) Different column order")
    q1 = "SELECT customer_id, company_name FROM customers ORDER BY customer_id LIMIT 10"
    q2 = "SELECT company_name, customer_id FROM customers ORDER BY customer_id LIMIT 10"
    report = await run_stage1(conn, q1, q2, False)
    if report.hash_match is False:
        print("   Pass: Hash mismatch detected.")
    else:
        print("   FAIL:", report)

    # c) Extra row
    print("c) Extra row (count mismatch)")
    q3 = "SELECT customer_id, company_name FROM customers ORDER BY customer_id LIMIT 11"
    report = await run_stage1(conn, q1, q3, False)
    if report.hash_match is False and report.user_row_count != report.ref_row_count:
        print("   Pass: Count mismatch detected, fast fail.")
    else:
        print("   FAIL:", report)

async def test_1_3_except_all(conn):
    print("\n--- Test 1.3 & 1.4: EXCEPT ALL and Limits ---")
    
    q_base = "SELECT * FROM customers"
    q_missing = "SELECT * FROM customers WHERE customer_id != 'ALFKI'"
    q_extra = "SELECT * FROM customers UNION ALL SELECT * FROM customers WHERE customer_id = 'ALFKI'"
    q_diff_100 = "SELECT * FROM customers LIMIT 1" # Reference has 91, user has 1. Difference 90.

    # Missing row
    print("a) Missing row")
    report = await run_stage1(conn, q_missing, q_base, False)
    if report.missing_rows and report.missing_rows.total == 1 and report.extra_rows.total == 0:
        print("   Pass: 1 missing row detected.")
    else:
        print("   FAIL:", report.missing_rows)

    # Extra row (duplicate)
    print("b) Extra row (duplicate)")
    report = await run_stage1(conn, q_extra, q_base, False)
    if report.extra_rows and report.extra_rows.total == 1 and report.missing_rows.total == 0:
        print("   Pass: 1 extra row detected (EXCEPT ALL handles duplicates).")
    else:
        print("   FAIL:", report.extra_rows)

    # Limits test
    print("c) Limits (diff > 50 in DB, > 5 returned)")
    report = await run_stage1(conn, q_diff_100, q_base, False)
    if report.missing_rows and report.missing_rows.total > 50:
        if len(report.missing_rows.rows) == 5:
            print(f"   Pass: Total missing is {report.missing_rows.total}, sample has {len(report.missing_rows.rows)} rows.")
        else:
            print(f"   FAIL: Sample length is {len(report.missing_rows.rows)}, expected 5.")
    else:
        print("   FAIL:", report)

async def test_1_5_order_matters(conn):
    print("\n--- Test 1.5: Order matters ---")
    
    # We need identical data but different order.
    # So we fetch same rows but in different order:
    q_ordered = "SELECT * FROM (SELECT * FROM customers LIMIT 10) x ORDER BY company_name DESC"
    q_unordered = "SELECT * FROM (SELECT * FROM customers LIMIT 10) x ORDER BY company_name ASC"

    # Order matters = True
    print("a) Order matters = True")
    report = await run_stage1(conn, q_unordered, q_ordered, True)
    if report.hash_match and report.order_passed is False:
        print("   Pass: Data matched but order failed.")
    else:
        print("   FAIL:", report)
        
    # Order matters = False
    print("b) Order matters = False")
    report = await run_stage1(conn, q_unordered, q_ordered, False)
    if report.hash_match and report.order_passed is None and report.passed is True:
        print("   Pass: Data matched and order ignored.")
    else:
        print("   FAIL:", report)

async def main():
    print("Connecting to DB...")
    conn = await _get_conn("northwind")
    try:
        await test_1_1_rollback(conn)
        await test_1_2_fast_check(conn)
        await test_1_3_except_all(conn)
        await test_1_5_order_matters(conn)
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
