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

  // Do not depend on a DB-level unique constraint existing yet; update-or-insert manually.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('submission_answers')
    .select('id')
    .eq('submission_id', resolvedParams.id)
    .eq('question_id', question_id)
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  let data;
  let error;
  if (existing?.id) {
    const result = await supabaseAdmin
      .from('submission_answers')
      .update({ query_text: query_text ?? '' })
      .eq('id', existing.id)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    const result = await supabaseAdmin
      .from('submission_answers')
      .insert({
        submission_id: resolvedParams.id,
        question_id,
        query_text: query_text ?? '',
      })
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
