import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { executeQuery } from '@/lib/engine/execute';
import { evaluateAnswer } from '@/lib/engine/evaluate';

// POST /api/submissions/[id]/submit — evaluate and finalize submission
export async function POST(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  const { data: submission } = await supabaseAdmin.from('submissions').select('*').eq('id', resolvedParams.id).single();

  if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  if (submission.student_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (submission.status === 'submitted') return NextResponse.json({ error: 'Already submitted' }, { status: 409 });

  // Check time limit
  const { data: test } = await supabaseAdmin.from('tests').select('time_limit_mins').eq('id', submission.test_id).single();
  if (test?.time_limit_mins) {
    const elapsed = (Date.now() - new Date(submission.started_at).getTime()) / 60000;
    if (elapsed > test.time_limit_mins + 1) {
      return NextResponse.json({ error: 'Time limit exceeded' }, { status: 403 });
    }
  }

  // Get all answers
  const { data: answers } = await supabaseAdmin
    .from('submission_answers')
    .select('*, questions(expected_output, dataset_id, order_sensitive, points)')
    .eq('submission_id', params.id);

  let totalScore = 0;
  const updates = [];

  for (const answer of answers ?? []) {
    const { questions: q } = answer;
    if (!q || !answer.query_text) {
      updates.push({ id: answer.id, is_correct: false, score: 0, actual_output: [], evaluated_at: new Date().toISOString() });
      continue;
    }
    const result = await executeQuery(answer.query_text, q.dataset_id);
    const evaluation = evaluateAnswer(result.rows, q.expected_output, q.order_sensitive);
    const score = evaluation.isCorrect ? (q.points ?? 1) : 0;
    totalScore += score;
    updates.push({
      id: answer.id,
      is_correct: evaluation.isCorrect,
      actual_output: result.rows,
      score,
      evaluated_at: new Date().toISOString(),
    });
  }

  // Batch update answers
  for (const u of updates) {
    await supabaseAdmin.from('submission_answers').update({
      is_correct: u.is_correct, actual_output: u.actual_output, score: u.score, evaluated_at: u.evaluated_at,
    }).eq('id', u.id);
  }

  // Finalize submission
  const { data: final } = await supabaseAdmin.from('submissions').update({
    status: 'submitted', submitted_at: new Date().toISOString(), total_score: totalScore,
  }).eq('id', params.id).select().single();

  return NextResponse.json(final);
}
