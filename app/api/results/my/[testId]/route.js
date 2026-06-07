import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { gradeSubmission } from '@/lib/engine/gradeSubmission';

// GET /api/results/my/[testId] — student's own result
export async function GET(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resolvedParams = await params;
  const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', session.user.email).single();
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data: submission, error: submissionError } = await supabaseAdmin
    .from('submissions')
    .select('*')
    .eq('test_id', resolvedParams.testId)
    .eq('student_id', user.id)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (submissionError) return NextResponse.json({ error: submissionError.message }, { status: 500 });
  if (!submission) return NextResponse.json({ error: 'No submitted result found for this test.' }, { status: 404 });

  let currentSubmission = submission;
  let { data: answerRows, error: answersError } = await supabaseAdmin
    .from('submission_answers')
    .select('id,submission_id,question_id,query_text,actual_output,is_correct,score,evaluated_at')
    .eq('submission_id', currentSubmission.id);

  if (answersError) return NextResponse.json({ error: answersError.message }, { status: 500 });

  if ((answerRows || []).some((answer) => answer.is_correct === null || answer.evaluated_at === null)) {
    const graded = await gradeSubmission(supabaseAdmin, currentSubmission.id);
    if (graded.error) return NextResponse.json({ error: graded.error }, { status: 500 });
    currentSubmission = graded.submission || currentSubmission;

    const refreshed = await supabaseAdmin
      .from('submission_answers')
      .select('id,submission_id,question_id,query_text,actual_output,is_correct,score,evaluated_at')
      .eq('submission_id', currentSubmission.id);
    if (refreshed.error) return NextResponse.json({ error: refreshed.error.message }, { status: 500 });
    answerRows = refreshed.data || [];
  }

  const questionIds = [...new Set((answerRows || []).map((a) => a.question_id).filter(Boolean))];
  let questionMap = new Map();
  if (questionIds.length > 0) {
    const { data: questionRows, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('id,prompt,difficulty,points,position')
      .in('id', questionIds);

    if (questionsError) return NextResponse.json({ error: questionsError.message }, { status: 500 });
    questionMap = new Map((questionRows || []).map((q) => [q.id, { ...q, partial_grading: false }]));
  }

  const submissionAnswers = (answerRows || [])
    .map((answer) => ({
      ...answer,
      questions: questionMap.get(answer.question_id) || null,
    }))
    .sort((a, b) => {
      const aPos = a.questions?.position ?? Number.MAX_SAFE_INTEGER;
      const bPos = b.questions?.position ?? Number.MAX_SAFE_INTEGER;
      return aPos - bPos;
    });

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('name,email')
    .eq('id', user.id)
    .maybeSingle();

  const { data: cohort } = await supabaseAdmin
    .from('submissions')
    .select('id, student_id, total_score, max_score, status')
    .eq('test_id', resolvedParams.testId)
    .eq('status', 'submitted');

  const submitted = (cohort ?? []).filter((s) => (s.max_score ?? 0) > 0);
  const classAveragePct = submitted.length > 0
    ? Math.round(submitted.reduce((sum, s) => sum + ((s.total_score / s.max_score) * 100), 0) / submitted.length)
    : null;
  const myPct = currentSubmission.max_score > 0 ? Math.round((currentSubmission.total_score / currentSubmission.max_score) * 100) : 0;
  const rank = submitted.length > 0
    ? (submitted.filter((s) => ((s.total_score / s.max_score) * 100) > myPct).length + 1)
    : null;

  return NextResponse.json({
    ...currentSubmission,
    users: profile || { name: session.user.name || null, email: session.user.email },
    submission_answers: submissionAnswers,
    analytics: {
      class_average_pct: classAveragePct,
      cohort_size: submitted.length,
      rank,
    },
  });
}
