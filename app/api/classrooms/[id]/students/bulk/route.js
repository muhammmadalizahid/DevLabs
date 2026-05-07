import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// POST /api/classrooms/[id]/students/bulk — bulk approve all pending
export async function POST(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await params; // Next.js 16+ requires awaiting params
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  const { data: classroom } = await supabaseAdmin.from('classrooms').select('teacher_id').eq('id', resolvedParams.id).single();
  if (!classroom || user?.role !== 'teacher' || classroom.teacher_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('classroom_id', resolvedParams.id)
    .eq('status', 'pending')
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ approved: data.length });
}
