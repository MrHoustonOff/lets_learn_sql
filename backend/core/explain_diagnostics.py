def analyze_plan(root_plan: dict) -> list:
    diagnostics = []
    
    def traverse(node):
        node_type = node.get("Node Type", "")
        relation = node.get("Relation Name", "")
        
        # 1. Seq Scan на больших таблицах (эвристика: больше 1000 строк)
        if node_type == "Seq Scan":
            rows = node.get("Actual Rows", node.get("Plan Rows", 0))
            if rows > 1000:
                diagnostics.append({
                    "severity": "warning",
                    "message": f"Seq Scan на большой таблице '{relation}' (строк: {rows}). Возможно, не хватает индекса."
                })
                
        # 2. Сортировка на диске (очень медленно)
        if node_type == "Sort":
            sort_space_type = node.get("Sort Space Type", "")
            if sort_space_type == "Disk":
                diagnostics.append({
                    "severity": "critical",
                    "message": f"Дисковая сортировка (Disk Sort). Увеличьте work_mem или оптимизируйте ORDER BY."
                })
                
        # 3. Фильтрация отбрасывает слишком много строк
        rows_removed = node.get("Rows Removed by Filter", 0)
        if rows_removed > 1000:
            diagnostics.append({
                "severity": "warning",
                "message": f"Фильтр отбросил {rows_removed} строк. Индекс мог бы помочь избежать лишнего чтения."
            })
            
        # 4. Hash Join может потребовать много памяти (если Actual Rows велико)
        if node_type == "Hash Join":
            cost = node.get("Total Cost", 0)
            if cost > 10000:
                 diagnostics.append({
                    "severity": "info",
                    "message": f"Тяжелый Hash Join (стоимость {cost}). Убедитесь, что условия соединения оптимальны."
                })

        if "Plans" in node:
            for child in node["Plans"]:
                traverse(child)

    traverse(root_plan)
    
    # Если план хороший и нет ошибок
    if not diagnostics:
        diagnostics.append({
            "severity": "success",
            "message": "План выполнения выглядит оптимально (явных узких мест не найдено)."
        })
        
    return diagnostics

