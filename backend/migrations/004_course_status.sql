-- Migration 004: add status column to courses
-- This allows distinguishing drafts from published courses.

ALTER TABLE courses ADD COLUMN status TEXT NOT NULL DEFAULT 'published';

CREATE INDEX idx_courses_status ON courses(status);
