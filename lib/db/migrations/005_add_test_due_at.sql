-- Add due date/time support for tests (interpreted and displayed in Pakistan Standard Time)
alter table if exists tests
  add column if not exists due_at timestamptz;

create index if not exists idx_tests_classroom_due_at on tests(classroom_id, due_at);

