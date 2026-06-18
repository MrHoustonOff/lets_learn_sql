-- Migration: add difficulty column to tasks + seed tags table
ALTER TABLE tasks ADD COLUMN difficulty INTEGER DEFAULT NULL;

-- Ensure tags table exists (already in 001, but safe for re-run)
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS task_tags (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- Seed some default tags
INSERT OR IGNORE INTO tags (name) VALUES
    ('JOIN'),
    ('GROUP BY'),
    ('Подзапросы'),
    ('Оконные функции'),
    ('Агрегаты'),
    ('CTE'),
    ('DISTINCT'),
    ('HAVING'),
    ('Индексы'),
    ('TBank'),
    ('Google'),
    ('Yandex'),
    ('Sber');
