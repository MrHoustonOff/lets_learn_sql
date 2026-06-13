import sqlite3
from pathlib import Path

def update_db():
    db_path = Path("A:/05_Coding/Apps/lets_learn_sql/backend/data/app.db")
    db = sqlite3.connect(db_path)
    
    db.execute("DELETE FROM tasks WHERE id IN (8, 9)")
    db.execute("DELETE FROM task_rules WHERE task_id IN (8, 9)")
    db.execute("DELETE FROM section_tasks WHERE task_id IN (8, 9)")
    
    # Insert 8
    db.execute(
        "INSERT INTO tasks (id, title, description, reference_sql, database_id, order_matters, status, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (8, "Топ-10 заказов клиентов из Германии по сумме", "Выведи 10 заказов клиентов из Германии с наибольшей суммой заказа. Для каждого заказа выведи: название компании-клиента (company), номер заказа (order_id) и итоговую сумму заказа (total) (с учётом скидки, округлённую до 2 знаков). Отсортируй по сумме по убыванию.", "SELECT c.company_name AS company, o.order_id AS order_id, ROUND(SUM(od.unit_price * od.quantity * (1 - od.discount))::numeric, 2) AS total FROM customers c JOIN orders o ON o.customer_id = c.customer_id JOIN order_details od ON od.order_id = o.order_id WHERE c.country = 'Germany' GROUP BY c.company_name, o.order_id ORDER BY total DESC LIMIT 10", 1, 1, "published", '{"hint": "Нужно соединить customers, orders и order_details. Не забудь группировку и сортировку!"}')
    )
    # Insert 9
    db.execute(
        "INSERT INTO tasks (id, title, description, reference_sql, database_id, order_matters, status, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (9, "Сотрудники с более чем 5 заказами", "Выведи имя и фамилию сотрудника (через пробел, в одной колонке employee_name) и количество обработанных им заказов (orders_count) — но только для тех сотрудников, у которых заказов больше 5. Отсортируй по количеству заказов по убыванию.", "SELECT e.first_name || ' ' || e.last_name AS employee_name, COUNT(o.order_id) AS orders_count FROM employees e JOIN orders o ON o.employee_id = e.employee_id GROUP BY e.employee_id, e.first_name, e.last_name HAVING COUNT(o.order_id) > 5 ORDER BY orders_count DESC", 1, 1, "published", '{"hint": "Фильтрация по агрегату (>5) делается через HAVING."}')
    )
    
    # Check if section 2 exists, otherwise 1
    cursor = db.execute("SELECT id FROM sections LIMIT 1")
    section_id = cursor.fetchone()[0]
    
    try:
        db.execute("INSERT INTO section_tasks (section_id, task_id, sort_order) VALUES (?, 8, 3), (?, 9, 4)", (section_id, section_id))
    except sqlite3.IntegrityError:
        pass # Ignore if unique constraint fails
    
    rules_data = [
        # Task 8
        (8, "construct", "count_min", '{"target": "JOIN", "value": 2}', "blocking", "Нужно соединить таблицы customers, orders и order_details — используй минимум 2 JOIN", 1),
        (8, "construct", "required", '{"target": "GROUP_BY"}', "blocking", "Без группировки не получится посчитать сумму по каждому заказу", 2),
        (8, "select_star", "forbidden", '{}', "blocking", "Перечисли явно нужные колонки вместо SELECT *", 3),
        (8, "alias", "required", '{"scope": "both"}', "warning", "Используй алиасы (AS) для таблиц и итоговых колонок — это улучшит читаемость", 4),
        (8, "function", "required", '{"function_name": "ROUND"}', "blocking", "Сумму нужно округлить с помощью ROUND", 5),
        (8, "object", "required", '{"object_type": "table", "object_name": "customers"}', "blocking", "Без таблицы customers не получить название компании и страну", 6),
        
        # Task 9
        (9, "construct", "required", '{"target": "HAVING"}', "blocking", "Фильтрация по агрегату (>5) делается через HAVING, а не WHERE", 1),
        (9, "construct", "required", '{"target": "AGGREGATE_FUNCTION"}', "blocking", "Нужна агрегатная функция для подсчёта количества заказов (COUNT)", 2),
        (9, "construct", "count_exact", '{"target": "JOIN", "value": 1}', "blocking", "Здесь достаточно ровно одного JOIN — между employees и orders", 3),
        (9, "function", "forbidden", '{"function_name": "DISTINCT"}', "warning", "DISTINCT здесь не нужен — группировка уже исключает дубликаты", 4),
        (9, "performance", "no_seqscan", '{"table_name": "orders"}', "warning", "Полное сканирование таблицы orders — для учебной задачи это нормально, но в проде стоило бы добавить индекс", 5)
    ]
    for t_id, cat, cond, params_json, sev, msg, sort_ord in rules_data:
        db.execute(
            "INSERT INTO task_rules (task_id, category, condition, params_json, severity, message, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (t_id, cat, cond, params_json, sev, msg, sort_ord)
        )
    db.commit()
    db.close()
    print("Tasks seeded successfully!")

update_db()
