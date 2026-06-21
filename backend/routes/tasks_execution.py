from fastapi import APIRouter, HTTPException, Request
from core.sqlite_db import get_sqlite_conn
from db.repositories.tasks import TaskRepository
from services.execution import TaskExecutionService
from schemas.tasks import SolutionResponse, CheckRulesRequest

router = APIRouter()

@router.post("/tasks/{id}/execute-reference", response_model=SolutionResponse)
async def execute_reference_sql(id: int, request: Request):
    return await get_task_solution(id)

@router.post("/tasks/{id}/check_rules")
async def check_task_rules(id: int, req: CheckRulesRequest):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    repo = TaskRepository(sqlite)
    svc = TaskExecutionService(repo)
    try:
        return await svc.check_rules(id, req.rules)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/tasks/{id}/solution", response_model=SolutionResponse)
async def get_task_solution(id: int):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    repo = TaskRepository(sqlite)
    svc = TaskExecutionService(repo)
    try:
        return await svc.get_solution(id)
    except LookupError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
