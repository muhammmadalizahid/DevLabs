import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { randomBytes } from 'crypto';

// GET /api/classrooms — list teacher's classrooms
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  console.log('📊 Classrooms endpoint - User:', { id: user.id, role: user.role, email: session.user.email });

  if (user.role === 'teacher') {
    const { data, error } = await supabaseAdmin
      .from('classrooms')
      .select('*, enrollments(count)')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Student — return all classrooms (pending, approved, rejected)
  console.log('📚 Fetching enrollments for student:', user.id);
  
  // First, get all enrollments for this student
  const { data: enrollments, error: enrollError } = await supabaseAdmin
    .from('enrollments')
    .select('id, status, classroom_id, requested_at')
    .eq('student_id', user.id);
  
  console.log('📋 Enrollments found:', { count: enrollments?.length, enrollError });
  
  if (enrollError) {
    console.error('❌ Enrollment fetch error:', enrollError);
    return NextResponse.json({ error: enrollError.message }, { status: 500 });
  }
  
  if (!enrollments || enrollments.length === 0) {
    console.log('✅ No enrollments found, returning empty array');
    return NextResponse.json([]);
  }
  
  // Then, get all classrooms
  const classroomIds = enrollments.map(e => e.classroom_id);
  const { data: classroomsData, error: classError } = await supabaseAdmin
    .from('classrooms')
    .select('id, name, description, teacher_id, invite_code, created_at')
    .in('id', classroomIds);
  
  console.log('🏫 Classrooms found:', { count: classroomsData?.length, classError });
  
  if (classError) {
    console.error('❌ Classroom fetch error:', classError);
    return NextResponse.json({ error: classError.message }, { status: 500 });
  }
  
  // Map enrollments to classrooms with status
  const result = enrollments.map(e => {
    const classroom = classroomsData?.find(c => c.id === e.classroom_id);
    return {
      ...classroom,
      enrollment_id: e.id,
      enrollment_status: e.status,
      requested_at: e.requested_at,
    };
  }).filter(c => c.id); // Remove any null classrooms
  
  console.log('✅ Returning classrooms:', result.length, result);
  return NextResponse.json(result);
}

// POST /api/classrooms — create classroom (teacher only)
export async function POST(req) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, description, email_domain } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Classroom name is required' }, { status: 400 });

  const invite_code = randomBytes(4).toString('hex').toUpperCase();

  const { data, error } = await supabaseAdmin.from('classrooms').insert({
    name: name.trim(),
    description: description?.trim() || null,
    teacher_id: user.id,
    email_domain: email_domain?.trim() || null,
    invite_code,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
