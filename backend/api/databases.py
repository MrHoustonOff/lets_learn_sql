from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from db.repositories.databases import DatabaseRepository
from services.dumps import DumpsService

router = APIRouter()

@router.get("/databases")
async def get_databases():
    return await DatabaseRepository.get_all_databases()

@router.get("/databases/{name}/dumps")
async def list_dumps(name: str):
    try:
        return await DumpsService.get_dumps(name)
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/databases/{name}/dumps")
async def create_dump(name: str):
    try:
        return await DumpsService.create_dump(name)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@router.post("/databases/{name}/reset")
async def reset_database(name: str, dump_filename: str):
    try:
        await DumpsService.restore_dump(name, dump_filename)
        return {"status": "ok"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))

@router.get("/databases/{name}/dumps/{filename}/download")
async def download_dump(name: str, filename: str):
    filepath = DumpsService.get_db_dumps_dir(name) / filename
    if not filepath.exists():
        raise HTTPException(404, "Dump file not found")
    return FileResponse(path=filepath, filename=f"{name}_{filename}", media_type="application/sql")

@router.delete("/databases/{name}")
async def delete_database(name: str):
    # TODO: Implement full database deletion in MVP+
    raise HTTPException(501, "Not implemented yet")
