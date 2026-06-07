import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

async function getTeacherOwnedQuestion(questionId, email) {
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', email).single();
  if (user?.role !== 'teacher') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  const { data: question } = await supabaseAdmin
    .from('questions')
    .select('*, tests(classrooms(teacher_id))')
    .eq('id', questionId)
    .single();

  if (!question || question.tests?.classrooms?.teacher_id !== user.id) {
    return { error: NextResponse.json({ error: 'Question not found' }, { status: 404 }) };
  }

  return { question };
}

// PATCH /api/tests/[id]/questions/[qid]
export async function PATCH(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { question, error: authError } = await getTeacherOwnedQuestion(resolvedParams.qid, session.user.email);
  if (authError) return authError;

  const body = await req.json();
  const allowed = ['prompt', 'difficulty', 'expected_output', 'dataset_id', 'order_sensitive', 'points', 'position'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabaseAdmin
    .from('questions')
    .update(updates)
    .eq('question_group_id', question.question_group_id)
    .select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const currentQuestion = (data || []).find((row) => row.id === resolvedParams.qid) || data?.[0];
  if (!currentQuestion) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  return NextResponse.json(currentQuestion);
}

// DELETE /api/tests/[id]/questions/[qid]
export async function DELETE(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { question, error: authError } = await getTeacherOwnedQuestion(resolvedParams.qid, session.user.email);
  if (authError) return authError;

  const { error } = await supabaseAdmin.from('questions').delete().eq('question_group_id', question.question_group_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
