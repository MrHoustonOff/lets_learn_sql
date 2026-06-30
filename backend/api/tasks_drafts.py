import json
from fastapi import APIRouter, HTTPException, Request

from core.sqlite_db import get_sqlite_conn
from db.repositories.tasks import TaskRepository
from schemas.tasks import DraftUpdateInput, CheckDuplicateRequest, BulkValidateRequest, BulkValidateResponse, BulkValidateTaskResult, RuleCheckDetail, RuleInput
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
            "sqlResult": None,
            "rulesResult": None
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
            for r in rawRules:
                rd = {
                    "category": r.get('category'),
                    "condition": r.get('condition'),
                    "params": r.get('params') or {},
                    "severity": r.get('severity') or 'blocking',
                    "message": r.get('message') or ''
                }
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
                rules=mappedRulesModels
            )
            
            # Execute SQL
            sql_data = await exec_svc.get_solution(draft_id)
            sql_dict = sql_data.model_dump()
            result_item["sqlResult"] = sql_dict
            
            # Check rules — always check ALL rules, never stop at first failure
            if mappedRulesModels:
                rules_res = await exec_svc.check_rules(draft_id, mappedRulesModels)
                rules_array = rules_res.get("rules", [])
                
                # Build detailed per-rule result list
                rule_details = [
                    RuleCheckDetail(
                        rule_id=r.get("rule_id", idx),
                        category=r.get("category", ""),
                        condition=r.get("condition", ""),
                        severity=r.get("severity", "blocking"),
                        message=r.get("message", ""),
                        passed=bool(r.get("passed")),
                        actual_value=r.get("actual_value"),
                        detail_msg=r.get("detail_msg"),
                    )
                    for idx, r in enumerate(rules_array)
                ]
                result_item["rulesResult"] = [rd.model_dump() for rd in rule_details]
                
                # Collect all blocking failures
                failed_blocking = [rd for rd in rule_details if not rd.passed and rd.severity == "blocking"]
                if failed_blocking:
                    # Build a rich multi-line error message
                    lines = [f"Failed {len(failed_blocking)} blocking rule(s) out of {len(rule_details)}:"]
                    for rd in failed_blocking:
                        lines.append(f"  [{rd.category.upper()} / {rd.condition}] {rd.message}")
                        if rd.detail_msg:
                            lines.append(f"    → {rd.detail_msg}")
                        if rd.actual_value is not None:
                            lines.append(f"    actual_value={rd.actual_value}")
                    result_item["errorMessage"] = "\n".join(lines)
                    result_item["status"] = "failed"
                    results.append(result_item)
                    continue
                    
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
