import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { randomUUID } from 'crypto';

function parseDueAtPstInput(input) {
  if (!input) return null
  const normalized = String(input).trim()
  if (!normalized) return null
  // Teacher provides local Pakistan time in `YYYY-MM-DDTHH:mm`.
  // Pakistan is UTC+05:00 with no DST, so convert explicitly.
  const iso = normalized.endsWith('Z') || /[+\-]\d{2}:\d{2}$/.test(normalized)
    ? normalized
    : `${normalized}:00+05:00`
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString()
}

function normalizeClassroomIds(body) {
  const ids = Array.isArray(body.classroom_ids)
    ? body.classroom_ids
    : body.classroom_id
      ? [body.classroom_id]
      : []

  return [...new Set(ids.map((value) => String(value || '').trim()).filter(Boolean))]
}

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

  const body = await req.json();
  const { title, description, time_limit_mins, due_at } = body;
  const classroomIds = normalizeClassroomIds(body);
  if (!classroomIds.length || !title?.trim()) {
    return NextResponse.json({ error: 'At least one classroom and a title are required' }, { status: 400 });
  }

  const { data: classrooms, error: classroomError } = await supabaseAdmin
    .from('classrooms')
    .select('id, teacher_id')
    .in('id', classroomIds);
  if (classroomError) return NextResponse.json({ error: classroomError.message }, { status: 500 });
  if (!classrooms || classrooms.length !== classroomIds.length || classrooms.some((classroom) => classroom.teacher_id !== user.id)) {
    return NextResponse.json({ error: 'One or more selected classrooms are invalid for this teacher' }, { status: 403 });
  }

  const cloneGroupId = randomUUID();
  const insertRows = classroomIds.map((classroomId) => ({
    classroom_id: classroomId,
    clone_group_id: cloneGroupId,
    title: title.trim(),
    description: description?.trim() || null,
    time_limit_mins: time_limit_mins || null,
    due_at: parseDueAtPstInput(due_at),
  }));
  const { data, error } = await supabaseAdmin.from('tests').insert(insertRows).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ created_tests: data || [] }, { status: 201 });
}
