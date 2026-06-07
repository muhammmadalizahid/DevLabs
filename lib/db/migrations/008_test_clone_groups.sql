-- Keep cloned classroom-specific tests and their questions linked.
-- Each classroom still has its own test row, submissions, and results.
alter table tests add column if not exists clone_group_id uuid;
alter table questions add column if not exists question_group_id uuid;

update tests
set clone_group_id = id
where clone_group_id is null;

update questions
set question_group_id = id
where question_group_id is null;

alter table tests alter column clone_group_id set default gen_random_uuid();
alter table questions alter column question_group_id set default gen_random_uuid();

create index if not exists idx_tests_clone_group on tests (clone_group_id);
create index if not exists idx_questions_question_group on questions (question_group_id);
