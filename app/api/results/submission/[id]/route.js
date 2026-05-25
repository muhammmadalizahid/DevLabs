import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// GET /api/results/submission/[id] — detailed view for teacher
export async function GET(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();

  const { data: submission } = await supabaseAdmin
    .from('submissions')
    .select('*, users(name,email,avatar_url), submission_answers(*, questions(prompt,difficulty,points,expected_output,order_sensitive,partial_grading))')
    .eq('id', params.id).single();

  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (user.role !== 'teacher' && submission.student_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json(submission);
}
