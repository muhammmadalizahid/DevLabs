-- Migration: create plagiarism_flags table
CREATE TABLE IF NOT EXISTS plagiarism_flags (
  id serial PRIMARY KEY,
  test_id uuid NOT NULL,
  a_submission_id uuid NOT NULL,
  b_submission_id uuid NOT NULL,
  status varchar(32) NOT NULL DEFAULT 'flagged', -- flagged | ignored | reviewed
  reviewer_id uuid NULL,
  note text NULL,
  score numeric NULL,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz NULL,
  UNIQUE (test_id, LEAST(a_submission_id::text, b_submission_id::text), GREATEST(a_submission_id::text, b_submission_id::text))
);
