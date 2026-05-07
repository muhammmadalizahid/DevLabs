import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// PATCH /api/classrooms/[id]/students/[sid] — approve/reject/remove
export async function PATCH(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await params; // Next.js 16+ requires awaiting params
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  const { data: classroom } = await supabaseAdmin.from('classrooms').select('teacher_id').eq('id', resolvedParams.id).single();
  if (!classroom || user?.role !== 'teacher' || classroom.teacher_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { action } = await req.json(); // 'approve' | 'reject' | 'remove'

  if (action === 'remove') {
    await supabaseAdmin.from('enrollments').delete()
      .eq('classroom_id', resolvedParams.id).eq('student_id', resolvedParams.sid);
    return NextResponse.json({ ok: true });
  }

  const status = action === 'approve' ? 'approved' : 'rejected';
  const { data, error } = await supabaseAdmin
    .from('enrollments')
    .update({ status, approved_at: action === 'approve' ? new Date().toISOString() : null })
    .eq('classroom_id', resolvedParams.id)
    .eq('student_id', resolvedParams.sid)
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
