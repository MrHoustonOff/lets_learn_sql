import json

def assign_node_ids(node: dict, path: str = "root"):
    node["node_id"] = path
    
    if "Plans" in node:
        for i, child in enumerate(node["Plans"]):
            assign_node_ids(child, f"{path}_{i}")

def extract_flat_nodes(node: dict) -> list:
    flat = []
    
    # We only care about cost and some basic info for the flat nodes list
    node_type = node.get("Node Type", "Unknown")
    
    # Sometimes it's a scan on a specific object
    relation = node.get("Relation Name")
    index = node.get("Index Name")
    target = f" → {index}" if index else (f" → {relation}" if relation else "")
    
    operation = f"{node_type}{target}"
    
    cost = node.get("Total Cost", 0.0)
    actual_time = node.get("Actual Total Time", cost) # Fallback to cost if no analyze
    
    flat.append({
        "node_id": node.get("node_id"),
        "operation": operation,
        "cost": cost,
        "actual_time": actual_time
    })
    
    if "Plans" in node:
        for child in node["Plans"]:
            flat.extend(extract_flat_nodes(child))
            
    return flat

def parse_plan(raw_json: list) -> dict:
    if not raw_json or len(raw_json) == 0:
        return {}
        
    root_plan = raw_json[0].get("Plan", {})
    
    assign_node_ids(root_plan)
    
    flat_nodes = extract_flat_nodes(root_plan)
    
    # Calculate percentages
    total_cost = root_plan.get("Total Cost", 1.0)
    total_time = root_plan.get("Actual Total Time", total_cost)
    
    # We want exclusive cost/time per node to be accurate, but for the MVP 
    # we can just use the total cost and let the frontend do the math or 
    # we can calculate approximate exclusive cost here.
    # PostgreSQL nodes contain "Total Cost" which is inclusive of children.
    # To get exclusive cost: Total Cost - sum(child.Total Cost)
    
    for i, node in enumerate(flat_nodes):
        # Let's find the original dict to compute exclusive
        # For simplicity, let's just pass the inclusive and let the UI deal with it
        # Actually, the user asked for a simple breakdown.
        # Let's just calculate a naive `cost_pct` based on inclusive cost for now 
        # (or exclusive if we do a better parser later).
        node["cost_pct"] = (node["cost"] / total_cost * 100) if total_cost > 0 else 0
        
    # Sort flat nodes by cost_pct descending
    flat_nodes.sort(key=lambda x: x["cost_pct"], reverse=True)
        
    return {
        "tree": root_plan,
        "flat_nodes": flat_nodes,
        "planning_time": raw_json[0].get("Planning Time", 0.0),
        "execution_time": raw_json[0].get("Execution Time", 0.0)
    }
