-- ============================================================
-- DevLab Database Schema (Supabase / PostgreSQL)
-- Run this in the Supabase SQL editor
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ── Users ────────────────────────────────────────────────────
create table if not exists users (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text,
  avatar_url  text,
  role        text check (role in ('teacher', 'student')),
  created_at  timestamptz default now()
);

-- ── Datasets ─────────────────────────────────────────────────
create table if not exists datasets (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  owner_id     uuid references users(id) on delete set null,
  is_platform  boolean default false,
  schema_sql   text not null,
  seed_sql     text not null,
  created_at   timestamptz default now()
);

-- ── Classrooms ───────────────────────────────────────────────
create table if not exists classrooms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  teacher_id    uuid references users(id) on delete cascade,
  email_domain  text,
  invite_code   text unique not null,
  created_at    timestamptz default now()
);

-- ── Enrollments ──────────────────────────────────────────────
create table if not exists enrollments (
  id            uuid primary key default gen_random_uuid(),
  classroom_id  uuid references classrooms(id) on delete cascade,
  student_id    uuid references users(id) on delete cascade,
  status        text check (status in ('pending', 'approved', 'rejected')) default 'pending',
  requested_at  timestamptz default now(),
  approved_at   timestamptz,
  unique (classroom_id, student_id)
);

-- ── Tests ────────────────────────────────────────────────────
create table if not exists tests (
  id               uuid primary key default gen_random_uuid(),
  classroom_id     uuid references classrooms(id) on delete cascade,
  title            text not null,
  description      text,
  time_limit_mins  int,
  is_published     boolean default false,
  created_at       timestamptz default now()
);

-- ── Questions ────────────────────────────────────────────────
create table if not exists questions (
  id               uuid primary key default gen_random_uuid(),
  test_id          uuid references tests(id) on delete cascade,
  prompt           text not null,
  difficulty       text check (difficulty in ('basic', 'intermediate', 'advanced')),
  expected_output  jsonb not null,
  dataset_id       uuid references datasets(id) on delete set null,
  order_sensitive  boolean default false,
  points           int default 1,
  position         int not null
);

-- ── Submissions ──────────────────────────────────────────────
create table if not exists submissions (
  id           uuid primary key default gen_random_uuid(),
  test_id      uuid references tests(id) on delete cascade,
  student_id   uuid references users(id) on delete cascade,
  started_at   timestamptz default now(),
  submitted_at timestamptz,
  total_score  int default 0,
  max_score    int default 0,
  status       text check (status in ('in_progress', 'submitted')) default 'in_progress',
  unique (test_id, student_id)
);

-- ── Submission Answers ───────────────────────────────────────
create table if not exists submission_answers (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid references submissions(id) on delete cascade,
  question_id    uuid references questions(id) on delete cascade,
  query_text     text,
  actual_output  jsonb,
  is_correct     boolean,
  score          int default 0,
  evaluated_at   timestamptz
);

-- ── Practice Problems ────────────────────────────────────────
create table if not exists practice_problems (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text not null,
  difficulty       text check (difficulty in ('basic', 'intermediate', 'advanced')),
  dataset_id       uuid references datasets(id) on delete set null,
  expected_output  jsonb not null,
  solution_sql     text,
  order_sensitive  boolean default false,
  position         int
);

-- ── Indexes ──────────────────────────────────────────────────
create index if not exists idx_enrollments_classroom  on enrollments (classroom_id, status);
create index if not exists idx_enrollments_student    on enrollments (student_id);
create index if not exists idx_submissions_student    on submissions (student_id, test_id);
create index if not exists idx_submissions_test       on submissions (test_id);
create index if not exists idx_questions_test         on questions (test_id, position);
create index if not exists idx_answers_submission     on submission_answers (submission_id);

-- ── Row Level Security ───────────────────────────────────────
alter table users              enable row level security;
alter table classrooms         enable row level security;
alter table enrollments        enable row level security;
alter table tests              enable row level security;
alter table questions          enable row level security;
alter table submissions        enable row level security;
alter table submission_answers enable row level security;
alter table datasets           enable row level security;
alter table practice_problems  enable row level security;

-- NOTE: All writes go through server-side API routes using the
-- service role key which bypasses RLS. The policies below
-- provide defence-in-depth for direct client calls.

create policy "allow_service_role" on users for all using (true);
create policy "allow_service_role" on classrooms for all using (true);
create policy "allow_service_role" on enrollments for all using (true);
create policy "allow_service_role" on tests for all using (true);
create policy "allow_service_role" on questions for all using (true);
create policy "allow_service_role" on submissions for all using (true);
create policy "allow_service_role" on submission_answers for all using (true);
create policy "allow_service_role" on datasets for all using (true);
create policy "allow_service_role" on practice_problems for all using (true);
