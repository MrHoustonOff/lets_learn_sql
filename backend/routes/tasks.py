import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from core.sqlite_db import get_sqlite_conn
from core import database as db_module
from core.config import settings

router = APIRouter()

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    hint: Optional[str]
    db_name: str
    is_bookmarked: bool
    is_solved: bool

class SolutionResponse(BaseModel):
    solution_sql: str
    columns: List[str]
    rows: List[List]
    row_count: int
    duration_ms: float

@router.get("/tasks/{id}", response_model=TaskResponse)
async def get_task_details(id: int):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    query = """
        SELECT t.id, t.title, t.description, t.metadata_json, d.technical_name as db_name,
               EXISTS(SELECT 1 FROM task_flags tf WHERE tf.task_id = t.id) as is_bookmarked,
               EXISTS(SELECT 1 FROM attempts a WHERE a.task_id = t.id AND a.is_correct = 1) as is_solved
        FROM tasks t
        JOIN databases d ON t.database_id = d.id
        WHERE t.id = ?
    """
    
    async with sqlite.execute(query, (id,)) as cursor:
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
            
    import json
    hint = None
    if row["metadata_json"]:
        try:
            meta = json.loads(row["metadata_json"])
            hint = meta.get("hint")
        except Exception:
            pass
            
    return TaskResponse(
        id=row["id"],
        title=row["title"],
        description=row["description"],
        hint=hint,
        db_name=row["db_name"],
        is_bookmarked=bool(row["is_bookmarked"]),
        is_solved=bool(row["is_solved"])
    )

@router.post("/tasks/{id}/solution", response_model=SolutionResponse)
async def get_task_solution(id: int):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    # 1. Fetch task reference_sql and database name
    query_str = """
        SELECT t.reference_sql, d.technical_name as db_name
        FROM tasks t
        JOIN databases d ON t.database_id = d.id
        WHERE t.id = ?
    """
    async with sqlite.execute(query_str, (id,)) as cursor:
        row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
            
    solution_sql = row["reference_sql"]
    db_name = row["db_name"]
    
    # 2. Run the solution query on Postgres to return the reference result
    if db_module.user_pool is None:
        raise HTTPException(status_code=500, detail="Database pool not initialized")
        
    start = time.monotonic()
    try:
        # Connect to Postgres (using the task's database)
        # Note: since user_pool is tied to settings.POSTGRES_DB (default "northwind"), 
        # for dynamic multi-db we can create a temporary connection if it's not the default db!
        # Wait, for now settings.POSTGRES_DB is "northwind", which matches row["db_name"]. 
        # If it's different, we can connect using asyncpg.connect()
        if db_name == settings.POSTGRES_DB:
            async with db_module.user_pool.acquire() as conn:
                await conn.execute(f"SET statement_timeout = '{settings.QUERY_TIMEOUT_MS}ms'")
                async with conn.transaction():
                    records = await conn.fetch(solution_sql)
        else:
            # Connect dynamically to the specific database
            import asyncpg
            conn = await asyncpg.connect(
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD,
                database=db_name,
                timeout=5.0
            )
            try:
                await conn.execute(f"SET statement_timeout = '{settings.QUERY_TIMEOUT_MS}ms'")
                async with conn.transaction():
                    records = await conn.fetch(solution_sql)
            finally:
                await conn.close()
                
        duration_ms = (time.monotonic() - start) * 1000
        
        if not records:
            columns, rows, row_count = [], [], 0
        else:
            columns = list(records[0].keys())
            rows = []
            for record in records[:settings.QUERY_ROWS_LIMIT]:
                row_data = []
                for v in record.values():
                    if isinstance(v, (str, int, float, bool, type(None))):
                        row_data.append(v)
                    else:
                        row_data.append(str(v))
                rows.append(row_data)
            row_count = len(records)
            
        return SolutionResponse(
            solution_sql=solution_sql,
            columns=columns,
            rows=rows,
            row_count=row_count,
            duration_ms=round(duration_ms, 2)
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Reference SQL error: {str(e)}")
