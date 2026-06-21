-- Migration 005: add task_signature column to tasks
-- This allows checking for duplicates based on a hash of the title and description.

ALTER TABLE tasks ADD COLUMN task_signature TEXT;

CREATE INDEX idx_tasks_signature ON tasks(task_signature);
