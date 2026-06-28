import re
from core.config import settings

FORBIDDEN_COMMANDS = [
    "create database", "drop database",
    "create role", "drop role", "alter role",
    "create user", "drop user",
    "pg_read_file", "pg_write_file",
    "copy to", "copy from",        # файловая система
]

def validate_db_name(name: str) -> bool:
    """
    Проверяет имя базы данных на соответствие требованиям безопасности:
    - Только строчные латинские буквы, цифры и подчеркивание.
    - Начинается с буквы.
    - Длина от 1 до 63 символов (ограничение Postgres).
    """
    if not name or len(name) > 63:
        return False
    return bool(re.match(r"^[a-z][a-z0-9_]*$", name))

def validate_sql(sql: str, is_admin: bool = False) -> tuple[bool, str | None]:
    """
    Возвращает (is_valid, error_message)
    """
    sql_lower = sql.lower().strip()

    if not is_admin and len(sql) > settings.MAX_SQL_LENGTH:
        return False, f"SQL слишком длинный (макс {settings.MAX_SQL_LENGTH} символов)"

    for cmd in FORBIDDEN_COMMANDS:
        if cmd in sql_lower:
            return False, f"Команда '{cmd}' недоступна"

    return True, None
