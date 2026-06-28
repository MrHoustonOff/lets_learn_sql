from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from pydantic import BaseModel
from db.repositories.databases import DatabaseRepository
from services.dumps import DumpsService
from services import db_creation
from core.security import validate_db_name

router = APIRouter()

@router.get("/databases")
async def get_databases():
    return await DatabaseRepository.get_all_databases()

@router.get("/databases/validate")
async def validate_db_name_endpoint(name: str):
    """Live-проверка доступности имени БД."""
    if not validate_db_name(name):
        return {
            "available": False,
            "error": "Имя должно содержать только строчные буквы, цифры и '_', начинаться с буквы"
        }
    available, error = await db_creation.validate_db_name_available(name)
    return {"available": available, "error": error}


class CreateDatabaseRequest(BaseModel):
    technical_name: str
    display_name: str = ""
    init_sql: str = ""


@router.post("/databases")
async def create_database(req: CreateDatabaseRequest):
    """Создаёт новую базу данных в Postgres и регистрирует в системе."""
    # 1. Валидация имени
    if not validate_db_name(req.technical_name):
        raise HTTPException(400, "Невалидное техническое имя базы данных")

    display_name = req.display_name.strip() or req.technical_name

    available, error = await db_creation.validate_db_name_available(req.technical_name)
    if not available:
        raise HTTPException(409, error)

    db_created = False

    try:
        # 2. CREATE DATABASE
        await db_creation.create_postgres_db(req.technical_name)
        db_created = True

        # 3. Выполняем init SQL (если есть)
        if req.init_sql.strip():
            await db_creation.run_init_sql(req.technical_name, req.init_sql)

        # 4. Выдаём права пользователю
        await db_creation.grant_db_access(req.technical_name)

        # 5. Регистрируем в SQLite
        await db_creation.register_database(req.technical_name, display_name)

        # 6. Создаём init-дамп (неудаляемый слепок начального состояния)
        try:
            await DumpsService.create_dump(req.technical_name, is_init=True)
        except Exception as e:
            print(f"[WARNING] Failed to create init dump for '{req.technical_name}': {e}")

        return {"status": "ok", "technical_name": req.technical_name, "display_name": display_name}

    except HTTPException:
        # Если БД была создана но что-то пошло не так — откатываем
        if db_created:
            await db_creation.drop_postgres_db(req.technical_name)
        raise
    except Exception as e:
        if db_created:
            await db_creation.drop_postgres_db(req.technical_name)
        raise HTTPException(500, str(e))


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
    """Полное удаление базы данных (Postgres, реестр, задачи, дампы)."""
    if not validate_db_name(name):
        raise HTTPException(400, "Невалидное техническое имя базы данных")
        
    from core import sqlite_db
    async with sqlite_db.sqlite_pool.execute("SELECT * FROM databases WHERE technical_name = ?", (name,)) as cursor:
        db_info = await cursor.fetchone()
        
    if not db_info:
        raise HTTPException(404, "База данных не найдена в реестре")
        
    if db_info["is_builtin"]:
        raise HTTPException(403, "Нельзя удалить встроенную базу данных")

    try:
        from core.database import close_pools_for_db
        import shutil
        from core import sqlite_db
        
        # 1. Закрываем пулы
        await close_pools_for_db(name)
        
        # 2. Удаляем БД из Postgres
        await db_creation.delete_postgres_db(name)
        
        # 3. Удаляем связанные задачи из SQLite (принудительно, из-за ON DELETE RESTRICT в схеме)
        # Получаем ID БД
        async with sqlite_db.sqlite_pool.execute("SELECT id FROM databases WHERE technical_name = ?", (name,)) as cursor:
            row = await cursor.fetchone()
            if row:
                db_id = row["id"]
                await sqlite_db.sqlite_pool.execute("DELETE FROM tasks WHERE database_id = ?", (db_id,))
                
        # 4. Удаляем БД из реестра
        await sqlite_db.sqlite_pool.execute("DELETE FROM databases WHERE technical_name = ?", (name,))
        await sqlite_db.sqlite_pool.commit()
        
        # 5. Удаляем папку с дампами
        dump_dir = DumpsService.get_db_dumps_dir(name)
        if dump_dir.exists():
            shutil.rmtree(dump_dir)
            
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(500, f"Ошибка при удалении базы данных: {str(e)}")
