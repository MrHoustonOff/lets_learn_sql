from core.config import settings

FORBIDDEN_COMMANDS = [
    "create database", "drop database",
    "create role", "drop role", "alter role",
    "create user", "drop user",
    "pg_read_file", "pg_write_file",
    "copy to", "copy from",        # файловая система
]

def validate_sql(sql: str) -> tuple[bool, str | None]:
    """
    Возвращает (is_valid, error_message)
    """
    sql_lower = sql.lower().strip()

    if len(sql) > settings.MAX_SQL_LENGTH:
        return False, f"SQL слишком длинный (макс {settings.MAX_SQL_LENGTH} символов)"

    for cmd in FORBIDDEN_COMMANDS:
        if cmd in sql_lower:
            return False, f"Команда '{cmd}' недоступна"

    return True, None
