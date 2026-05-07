import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// GET /api/results/classroom/[id] — all submissions across all tests in a classroom
export async function GET(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await params;
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Verify teacher owns classroom
  const { data: classroom } = await supabaseAdmin.from('classrooms').select('teacher_id').eq('id', resolvedParams.id).single();
  if (!classroom || classroom.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Get all tests in classroom
  const { data: tests } = await supabaseAdmin.from('tests').select('id,title').eq('classroom_id', resolvedParams.id);
  const testIds = (tests ?? []).map(t => t.id);

  if (testIds.length === 0) return NextResponse.json([]);

  const { data, error } = await supabaseAdmin
    .from('submissions')
    .select('*, users(name, email), tests(title)')
    .in('test_id', testIds)
    .order('submitted_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
