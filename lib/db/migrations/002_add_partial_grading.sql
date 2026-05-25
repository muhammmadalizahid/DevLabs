-- Migration: add partial_grading to questions
BEGIN;

ALTER TABLE IF EXISTS questions
  ADD COLUMN IF NOT EXISTS partial_grading boolean DEFAULT false;

COMMIT;
