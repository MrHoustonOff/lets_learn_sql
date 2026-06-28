from fastapi import APIRouter
from db.repositories.databases import DatabaseRepository

router = APIRouter()

@router.get("/databases")
async def get_databases():
    return await DatabaseRepository.get_all_databases()

# TODO: MVP+ — управление БД
# POST /api/databases
# DELETE /api/databases/{name}
