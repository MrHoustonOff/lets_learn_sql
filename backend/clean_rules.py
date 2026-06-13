import sqlite3
from pathlib import Path

def deduplicate_rules():
    db_path = Path("A:/05_Coding/Apps/lets_learn_sql/backend/data/app.db")
    db = sqlite3.connect(db_path)
    
    cursor = db.execute("SELECT id, task_id, category, condition FROM task_rules")
    rows = cursor.fetchall()
    
    seen = set()
    to_delete = []
    for row_id, task_id, category, condition in rows:
        key = (task_id, category, condition)
        if key in seen:
            to_delete.append(row_id)
        else:
            seen.add(key)
            
    if to_delete:
        print(f"Deleting duplicate rules: {to_delete}")
        db.execute(f"DELETE FROM task_rules WHERE id IN ({','.join(map(str, to_delete))})")
        db.commit()
    else:
        print("No duplicate rules found.")
        
    db.close()

if __name__ == '__main__':
    deduplicate_rules()
