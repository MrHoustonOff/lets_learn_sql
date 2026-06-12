import json
from core.explain_diagnostics import analyze_plan

def assign_node_ids(node: dict, path: str = "root"):
    node["node_id"] = path
    
    if "Plans" in node:
        for i, child in enumerate(node["Plans"]):
            assign_node_ids(child, f"{path}_{i}")

def extract_flat_nodes(node: dict, order_counter: list) -> list:
    flat = []
    
    # Сначала рекурсивно обходим детей (post-order traversal - снизу вверх)
    if "Plans" in node:
        for child in node["Plans"]:
            flat.extend(extract_flat_nodes(child, order_counter))
            
    # Затем обрабатываем сам узел
    node_type = node.get("Node Type", "Unknown")
    
    relation = node.get("Relation Name")
    index = node.get("Index Name")
    target = f" → {index}" if index else (f" → {relation}" if relation else "")
    
    operation = f"{node_type}{target}"
    
    cost = node.get("Total Cost", 0.0)
    actual_time = node.get("Actual Total Time", cost)
    
    # Увеличиваем счетчик шагов
    order_counter[0] += 1
    
    flat.append({
        "node_id": node.get("node_id"),
        "step_number": order_counter[0],
        "operation": operation,
        "cost": cost,
        "actual_time": actual_time
    })
            
    return flat

def parse_plan(raw_json: list) -> dict:
    if not raw_json or len(raw_json) == 0:
        return {}
        
    root_plan = raw_json[0].get("Plan", {})
    
    assign_node_ids(root_plan)
    
    order_counter = [0]
    flat_nodes = extract_flat_nodes(root_plan, order_counter)
    
    total_cost = root_plan.get("Total Cost", 1.0)
    
    for node in flat_nodes:
        node["cost_pct"] = (node["cost"] / total_cost * 100) if total_cost > 0 else 0
        
    # Не сортируем по cost_pct, оставляем хронологический порядок (снизу вверх)
    
    # Анализируем план на антипаттерны
    diagnostics = analyze_plan(root_plan)
        
    return {
        "tree": root_plan,
        "flat_nodes": flat_nodes,
        "planning_time": raw_json[0].get("Planning Time", 0.0),
        "execution_time": raw_json[0].get("Execution Time", 0.0),
        "diagnostics": diagnostics
    }
