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
  const scope = url.searchParams.get('scope');
  const classroomFilter = url.searchParams.get('classroomId');

  let classroomIds = [resolvedParams.id];
  if (scope === 'all') {
    const { data: classrooms, error: classroomsError } = await supabaseAdmin
      .from('classrooms')
      .select('id')
      .eq('teacher_id', user.id);

    if (classroomsError) return NextResponse.json({ error: classroomsError.message }, { status: 500 });
    classroomIds = (classrooms || []).map((item) => item.id);

    if (classroomFilter && classroomFilter !== 'all') {
      if (!classroomIds.includes(classroomFilter)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      classroomIds = [classroomFilter];
    }
  }

  let query = supabaseAdmin
    .from('enrollments')
    .select('*, users(id, name, email, avatar_url), classrooms(id, name)')
    .in('classroom_id', classroomIds.length ? classroomIds : ['00000000-0000-0000-0000-000000000000'])
    .order('requested_at', { ascending: false });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
