import json
from fastapi import APIRouter, HTTPException, Request

from core.sqlite_db import get_sqlite_conn
from db.repositories.tasks import TaskRepository
from schemas.tasks import DraftUpdateInput, CheckDuplicateRequest, BulkValidateRequest, BulkValidateResponse, BulkValidateTaskResult, RuleInput
from services.execution import TaskExecutionService

router = APIRouter()

@router.post("/tasks/check_duplicate")
async def check_duplicate_task(payload: CheckDuplicateRequest):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = TaskRepository(sqlite)
    return await repo.check_duplicate(payload.title, payload.description, payload.exclude_id)

@router.post("/tasks/draft")
async def create_task_draft(request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")
        
    repo = TaskRepository(sqlite)
    draft_id = await repo.create_task_draft()
    return {"id": draft_id, "status": "draft"}

@router.put("/tasks/{id}")
async def update_task_draft(id: int, payload: DraftUpdateInput, request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = TaskRepository(sqlite)
    await repo.update_task_draft(
        task_id=id,
        title=payload.title,
        description=payload.description,
        author_name=payload.author_name,
        source_url=payload.source_url,
        difficulty=payload.difficulty,
        database_id=payload.database_id,
        reference_sql=payload.reference_sql,
        order_matters=payload.order_matters,
        tags=payload.tags,
        rules=payload.rules
    )
    return {"status": "ok"}

@router.post("/tasks/{id}/publish")
async def publish_task(id: int, request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = TaskRepository(sqlite)
    try:
        task = await repo.publish_task(id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"status": "published"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/tasks/validate-bulk", response_model=BulkValidateResponse)
async def validate_bulk_tasks(payload: BulkValidateRequest, request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = TaskRepository(sqlite)
    exec_svc = TaskExecutionService(repo)
    
    results = []
    
    for rawTask in payload.tasks:
        dbName = rawTask.get('db_name') or rawTask.get('database_technical_name') or rawTask.get('database') or 'northwind'
        taskTitle = (rawTask.get('title') or '').strip()
        taskDesc = (rawTask.get('description') or '').strip()
        
        result_item = {
            "taskData": rawTask,
            "status": "failed",
            "taskId": None,
            "dbName": dbName,
            "errorMessage": None,
            "sqlResult": None
        }
        
        try:
            # Check duplicate
            existing = None
            if taskTitle:
                existing = await repo.check_duplicate(taskTitle, taskDesc)
            
            if existing and existing.get("exists"):
                result_item["status"] = "existing"
                result_item["taskId"] = existing.get("id")
                results.append(result_item)
                continue
                
            # Check DB
            db_id = await repo.get_database_id_by_name(dbName)
            if not db_id:
                result_item["status"] = "missing_db"
                result_item["errorMessage"] = f"Database '{dbName}' not found"
                results.append(result_item)
                continue
                
            # Parse difficulty
            raw_diff = rawTask.get('difficulty')
            parsedDifficulty = 0
            if isinstance(raw_diff, int):
                parsedDifficulty = raw_diff
            
            # Mapped rules
            rawRules = rawTask.get('rules') or []
            mappedRulesModels = []
            mappedRulesDicts = []
            for r in rawRules:
                rd = {
                    "category": r.get('category'),
                    "condition": r.get('condition'),
                    "params": r.get('params') or {},
                    "severity": r.get('severity') or 'blocking',
                    "message": r.get('message') or ''
                }
                mappedRulesDicts.append(rd)
                mappedRulesModels.append(RuleInput(**rd))
                
            # Create draft
            draft_id = await repo.create_task_draft()
            result_item["taskId"] = draft_id
            
            # Update draft
            await repo.update_task_draft(
                task_id=draft_id,
                title=taskTitle,
                description=taskDesc,
                author_name=rawTask.get('author_name') or '',
                source_url=rawTask.get('source_url') or '',
                difficulty=parsedDifficulty,
                database_id=db_id,
                reference_sql=rawTask.get('reference_sql') or '',
                order_matters=bool(rawTask.get('order_matters')),
                tags=rawTask.get('tags') or [],
                rules=mappedRulesDicts
            )
            
            # Execute SQL
            sql_data = await exec_svc.get_solution(draft_id)
            sql_dict = sql_data.model_dump()
            result_item["sqlResult"] = sql_dict
            
            # Check rules
            if mappedRulesModels:
                rules_res = await exec_svc.check_rules(draft_id, mappedRulesModels)
                rules_array = rules_res.get("rules", [])
                has_blocking_error = any(not r.get("passed") and r.get("severity") == "blocking" for r in rules_array)
                if has_blocking_error:
                    raise ValueError("Failed one or more blocking rules.")
                    
            if sql_data.row_count == 0 or not sql_data.rows:
                result_item["status"] = "zero_rows"
            else:
                result_item["status"] = "success"
                
            results.append(result_item)
            
        except Exception as e:
            result_item["status"] = "failed"
            result_item["errorMessage"] = str(e)
            results.append(result_item)
            
    return BulkValidateResponse(results=[BulkValidateTaskResult(**r) for r in results])
