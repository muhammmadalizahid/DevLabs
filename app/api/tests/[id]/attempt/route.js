import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// POST /api/tests/[id]/attempt — student starts a test attempt
export async function POST(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'student') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Check test is published
  const { data: test } = await supabaseAdmin.from('tests').select('*, questions(id,points)').eq('id', params.id).eq('is_published', true).single();
  if (!test) return NextResponse.json({ error: 'Test not found or not published' }, { status: 404 });

  // Check existing submission
  const { data: existing } = await supabaseAdmin.from('submissions').select('id,status').eq('test_id', params.id).eq('student_id', user.id).single();
  if (existing) return NextResponse.json(existing);

  const maxScore = test.questions.reduce((s, q) => s + (q.points ?? 1), 0);
  const { data: submission, error } = await supabaseAdmin.from('submissions').insert({
    test_id: params.id, student_id: user.id, max_score: maxScore,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(submission, { status: 201 });
}
