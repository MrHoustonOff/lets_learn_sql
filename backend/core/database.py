import asyncpg
from core.config import settings

# Два пула — главное правило проекта
admin_pool: asyncpg.Pool = None  # llpg_admin — управление
user_pool: asyncpg.Pool = None   # llpg_user  — запросы пользователя

async def init_pools():
    global admin_pool, user_pool

    admin_pool = await asyncpg.create_pool(
        host=settings.POSTGRES_HOST,
        database=settings.POSTGRES_DB,
        user=settings.POSTGRES_ADMIN_USER,
        password=settings.POSTGRES_ADMIN_PASSWORD,
        min_size=1,
        max_size=5,
    )

    user_pool = await asyncpg.create_pool(
        host=settings.POSTGRES_HOST,
        database=settings.POSTGRES_DB,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        min_size=2,
        max_size=10,
    )

async def close_pools():
    await admin_pool.close()
    await user_pool.close()
