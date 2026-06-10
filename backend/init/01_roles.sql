-- Создаём роли
-- llpg_admin — управление базами данных
-- llpg_user  — пользовательские запросы (с роллбеком)

CREATE ROLE llpg_admin WITH LOGIN PASSWORD 'llpg_admin_password' SUPERUSER;
CREATE ROLE llpg_user  WITH LOGIN PASSWORD 'llpg_user_password';
