-- Ensure one saved answer per submission/question pair.
-- Existing duplicates are collapsed by keeping the most recently evaluated row,
-- or the newest created row when evaluation timestamps are absent.

with ranked as (
  select
    id,
    row_number() over (
      partition by submission_id, question_id
      order by evaluated_at desc nulls last, id desc
    ) as rn
  from submission_answers
)
delete from submission_answers
where id in (
  select id from ranked where rn > 1
);

alter table if exists submission_answers
  add constraint submission_answers_submission_question_unique
  unique (submission_id, question_id);

