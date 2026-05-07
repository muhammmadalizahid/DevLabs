import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// GET /api/tests — list tests for a classroom
export async function GET(req) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const classroomId = url.searchParams.get('classroomId');
  if (!classroomId) return NextResponse.json({ error: 'classroomId required' }, { status: 400 });

  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();

  let query = supabaseAdmin.from('tests').select('*, questions(count)').eq('classroom_id', classroomId).order('created_at', { ascending: false });
  
  if (user?.role === 'student') {
    // Students must have an 'approved' enrollment to see tests
    const { data: enrollment, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .select('id, status')
      .eq('classroom_id', classroomId)
      .eq('student_id', user.id)
      .eq('status', 'approved')
      .single();
    
    if (enrollError || !enrollment) {
      return NextResponse.json({ error: 'You must be approved to view this classroom\'s tests' }, { status: 403 });
    }
    
    query = query.eq('is_published', true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/tests — create a test
export async function POST(req) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { classroom_id, title, description, time_limit_mins } = await req.json();
  if (!classroom_id || !title?.trim()) return NextResponse.json({ error: 'classroom_id and title are required' }, { status: 400 });

  // Verify teacher owns classroom
  const { data: classroom } = await supabaseAdmin.from('classrooms').select('teacher_id').eq('id', classroom_id).single();
  if (!classroom || classroom.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabaseAdmin.from('tests').insert({
    classroom_id, title: title.trim(), description: description?.trim() || null,
    time_limit_mins: time_limit_mins || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
