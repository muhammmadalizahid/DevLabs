import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// POST /api/submissions/[id]/answer — save/update a single answer draft
export async function POST(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', session.user.email).single();
  const { data: submission } = await supabaseAdmin.from('submissions').select('student_id,status').eq('id', resolvedParams.id).single();

  if (!submission || submission.student_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (submission.status === 'submitted')
    return NextResponse.json({ error: 'Submission already finalized' }, { status: 409 });

  const { question_id, query_text } = await req.json();
  if (!question_id) return NextResponse.json({ error: 'question_id required' }, { status: 400 });

  // Upsert answer draft
  const { data, error } = await supabaseAdmin.from('submission_answers').upsert({
    submission_id: resolvedParams.id,
    question_id,
    query_text: query_text ?? '',
  }, { onConflict: 'submission_id,question_id' }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
