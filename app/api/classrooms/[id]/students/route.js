import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// GET /api/classrooms/[id]/students — list enrollments
export async function GET(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const resolvedParams = await params; // Next.js 16+ requires awaiting params
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  const { data: classroom } = await supabaseAdmin.from('classrooms').select('teacher_id').eq('id', resolvedParams.id).single();

  if (!classroom || user?.role !== 'teacher' || classroom.teacher_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const status = url.searchParams.get('status'); // pending | approved | rejected

  let query = supabaseAdmin
    .from('enrollments')
    .select('*, users(id, name, email, avatar_url)')
    .eq('classroom_id', resolvedParams.id)
    .order('requested_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
