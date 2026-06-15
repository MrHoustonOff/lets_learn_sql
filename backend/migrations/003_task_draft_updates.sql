-- Migration: task draft schema updates
-- 1. rename author_url to source_url in tasks
-- SQLite ignores column types anyway, so an INTEGER column (difficulty) can store TEXT strings like 'EASY-1'.

ALTER TABLE tasks RENAME COLUMN author_url TO source_url;
