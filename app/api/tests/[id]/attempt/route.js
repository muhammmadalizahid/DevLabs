import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// POST /api/tests/[id]/attempt — student starts a test attempt
export async function POST(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Check test is published
  const { data: test } = await supabaseAdmin.from('tests').select('*, questions(id,points)').eq('id', resolvedParams.id).eq('is_published', true).single();
  if (!test) return NextResponse.json({ error: 'Test not found or not published' }, { status: 404 });

  // Reuse the newest attempt. Some older databases may not have the unique
  // constraint applied yet, so do not use .single() here; duplicates should not
  // prevent students from reaching their submitted result.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('submissions')
    .select('id,status,started_at,submitted_at')
    .eq('test_id', resolvedParams.id)
    .eq('student_id', user.id)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });
  if (existing) return NextResponse.json(existing);

  if (test.due_at) {
    const dueAt = new Date(test.due_at).getTime()
    if (Number.isFinite(dueAt) && Date.now() > dueAt) {
      return NextResponse.json({ error: 'This test is closed. Due date/time (PKT) has passed.' }, { status: 403 })
    }
  }

  const maxScore = test.questions.reduce((s, q) => s + (q.points ?? 1), 0);
  const { data: submission, error } = await supabaseAdmin.from('submissions').insert({
    test_id: resolvedParams.id, student_id: user.id, max_score: maxScore,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(submission, { status: 201 });
}
