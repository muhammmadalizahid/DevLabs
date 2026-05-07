import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// GET /api/results/my/[testId] — student's own result
export async function GET(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resolvedParams = await params;
  const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', session.user.email).single();

  const { data } = await supabaseAdmin
    .from('submissions')
    .select('*, submission_answers(*, questions(prompt, difficulty, points))')
    .eq('test_id', resolvedParams.testId)
    .eq('student_id', user.id)
    .single();

  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}
