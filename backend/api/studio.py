from fastapi import APIRouter, HTTPException, Request
from typing import List
from core.sqlite_db import get_sqlite_conn
from db.repositories.studio import StudioRepository
from services.studio import StudioService
from schemas.studio import DraftListItem

router = APIRouter()

@router.get("/studio/drafts", response_model=List[DraftListItem])
async def get_studio_drafts(request: Request):
    sqlite = await get_sqlite_conn()
    if not sqlite:
        raise HTTPException(status_code=500, detail="Database connection not available")

    repo = StudioRepository(sqlite)
    svc = StudioService(repo)
    return await svc.get_studio_drafts()
