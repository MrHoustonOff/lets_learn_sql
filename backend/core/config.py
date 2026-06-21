from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # PostgreSQL
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "northwind"
    POSTGRES_ADMIN_USER: str = "llpg_admin"
    POSTGRES_ADMIN_PASSWORD: str = "llpg_admin_password"
    POSTGRES_USER: str = "llpg_user"
    POSTGRES_PASSWORD: str = "llpg_user_password"

    # SQLite
    SQLITE_DB_PATH: str = "/data/app.db"

    # Лимиты
    QUERY_TIMEOUT_MS: int = 5000     # 5 секунд макс на запрос
    QUERY_ROWS_LIMIT: int = 100      # макс строк в ответе
    MAX_SQL_LENGTH: int = 10000      # макс длина SQL строки

    # Окружение
    APP_ENV: str = "development"     # development | production

settings = Settings()
