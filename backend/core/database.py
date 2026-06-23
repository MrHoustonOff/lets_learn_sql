import asyncpg
import asyncio
from core.config import settings

# Динамические пулы соединений для разных баз данных (мультиарендность)
_admin_pools: dict[str, asyncpg.Pool] = {}
_user_pools: dict[str, asyncpg.Pool] = {}
_pool_lock = asyncio.Lock()

async def get_admin_pool(db_name: str | None = None) -> asyncpg.Pool:
    """Возвращает пул соединений для роли llpg_admin (управление, DDL)."""
    db = db_name or settings.POSTGRES_DB
    if db not in _admin_pools:
        async with _pool_lock:
            if db not in _admin_pools:
                _admin_pools[db] = await asyncpg.create_pool(
                    host=settings.POSTGRES_HOST,
                    port=settings.POSTGRES_PORT,
                    database=db,
                    user=settings.POSTGRES_ADMIN_USER,
                    password=settings.POSTGRES_ADMIN_PASSWORD,
                    min_size=1,
                    max_size=5,
                )
    return _admin_pools[db]

async def get_user_pool(db_name: str | None = None) -> asyncpg.Pool:
    """Возвращает пул соединений для роли llpg_user (изолированные запросы пользователей)."""
    db = db_name or settings.POSTGRES_DB
    if db not in _user_pools:
        async with _pool_lock:
            if db not in _user_pools:
                _user_pools[db] = await asyncpg.create_pool(
                    host=settings.POSTGRES_HOST,
                    port=settings.POSTGRES_PORT,
                    database=db,
                    user=settings.POSTGRES_USER,
                    password=settings.POSTGRES_PASSWORD,
                    min_size=2,
                    max_size=10,
                )
    return _user_pools[db]

async def init_pools():
    """Прогрев пулов для главной базы данных при старте приложения."""
    await get_admin_pool(settings.POSTGRES_DB)
    await get_user_pool(settings.POSTGRES_DB)

async def close_pools():
    """Закрывает все активные пулы при остановке сервера."""
    async with _pool_lock:
        for pool in _admin_pools.values():
            await pool.close()
        for pool in _user_pools.values():
            await pool.close()
        _admin_pools.clear()
        _user_pools.clear()
