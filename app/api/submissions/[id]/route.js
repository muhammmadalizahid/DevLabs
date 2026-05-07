import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// GET /api/submissions/[id]
export async function GET(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  const { data: submission } = await supabaseAdmin
    .from('submissions')
    .select('*, submission_answers(*, questions(prompt, difficulty, points, expected_output, order_sensitive))')
    .eq('id', resolvedParams.id).single();
  if (!submission) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Only student owner or teacher can view
  if (submission.student_id !== user.id && user.role !== 'teacher')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(submission);
}
