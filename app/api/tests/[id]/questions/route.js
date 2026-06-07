import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { randomUUID } from 'crypto';

async function getTeacherOwnedTest(testId, email) {
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', email).single();
  if (user?.role !== 'teacher') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  const { data: test } = await supabaseAdmin
    .from('tests')
    .select('id, clone_group_id, classrooms(teacher_id)')
    .eq('id', testId)
    .single();

  if (!test || test.classrooms?.teacher_id !== user.id) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { user, test };
}

// GET /api/tests/[id]/questions
export async function GET(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('questions').select('*, datasets(name)')
    .eq('test_id', resolvedParams.id).order('position');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/tests/[id]/questions
export async function POST(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { test, error: authError } = await getTeacherOwnedTest(resolvedParams.id, session.user.email);
  if (authError) return authError;

  const { prompt, difficulty, expected_output, dataset_id, order_sensitive, points } = await req.json();
  if (!prompt?.trim() || !expected_output) return NextResponse.json({ error: 'prompt and expected_output required' }, { status: 400 });

  const { data: groupTests, error: groupError } = await supabaseAdmin
    .from('tests')
    .select('id')
    .eq('clone_group_id', test.clone_group_id);
  if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });

  const groupTestIds = (groupTests || []).map((row) => row.id);
  const { count } = await supabaseAdmin
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('test_id', resolvedParams.id);

  const position = (count ?? 0) + 1;
  const questionGroupId = randomUUID();
  const questionRows = groupTestIds.map((testId) => ({
    test_id: testId,
    prompt: prompt.trim(),
    difficulty: difficulty || 'basic',
    expected_output,
    dataset_id: dataset_id || null,
    order_sensitive: order_sensitive ?? false,
    points: points ?? 1,
    position,
    question_group_id: questionGroupId,
  }));

  const { data, error } = await supabaseAdmin.from('questions').insert(questionRows).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const currentQuestion = (data || []).find((question) => question.test_id === resolvedParams.id) || data?.[0];
  return NextResponse.json(currentQuestion, { status: 201 });
}
