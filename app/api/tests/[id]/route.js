import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

function parseDueAtPstInput(input) {
  if (input === null) return null
  if (input === undefined) return undefined
  const normalized = String(input).trim()
  if (!normalized) return null
  const iso = normalized.endsWith('Z') || /[+\-]\d{2}:\d{2}$/.test(normalized)
    ? normalized
    : `${normalized}:00+05:00`
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return undefined
  return dt.toISOString()
}

function normalizeClassroomIds(body) {
  if (!Array.isArray(body.classroom_ids)) return [];
  return [...new Set(body.classroom_ids.map((value) => String(value || '').trim()).filter(Boolean))];
}

async function verifyTeacherOwnsTest(testId, userId) {
  const { data: test } = await supabaseAdmin.from('tests').select('*, classrooms(teacher_id)').eq('id', testId).single();
  return test?.classrooms?.teacher_id === userId ? test : null;
}

async function cloneQuestionsToTests(sourceTestId, targetTests) {
  if (!targetTests?.length) return;

  const { data: questions, error: questionsError } = await supabaseAdmin
    .from('questions')
    .select('prompt, difficulty, expected_output, dataset_id, order_sensitive, points, position, question_group_id')
    .eq('test_id', sourceTestId)
    .order('position');

  if (questionsError) throw new Error(questionsError.message);
  if (!questions?.length) return;

  const questionRows = targetTests.flatMap((test) => (
    questions.map((question) => ({
      ...question,
      test_id: test.id,
    }))
  ));

  const { error: insertError } = await supabaseAdmin.from('questions').insert(questionRows);
  if (insertError) throw new Error(insertError.message);
}

// GET /api/tests/[id]
export async function GET(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resolvedParams = await params;
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  const { data: test } = await supabaseAdmin.from('tests').select('*, questions(*), classrooms(name,teacher_id)').eq('id', resolvedParams.id).single();
  if (!test) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (user?.role === 'teacher') {
    if (test.classrooms?.teacher_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { data: groupTests, error: groupError } = await supabaseAdmin
      .from('tests')
      .select('id,classroom_id')
      .eq('clone_group_id', test.clone_group_id || test.id);
    if (groupError) return NextResponse.json({ error: groupError.message }, { status: 500 });
    return NextResponse.json({
      ...test,
      clone_classroom_ids: (groupTests || []).map((row) => row.classroom_id),
      clone_test_ids: (groupTests || []).map((row) => row.id),
    });
  } else {
    const { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id,status')
      .eq('classroom_id', test.classroom_id)
      .eq('student_id', user?.id)
      .eq('status', 'approved')
      .single();
    if (!test.is_published || !enrollment) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(test);
}

// PATCH /api/tests/[id]
export async function PATCH(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resolvedParams = await params;
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const test = await verifyTeacherOwnsTest(resolvedParams.id, user.id);
  if (!test) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const allowed = ['title', 'description', 'time_limit_mins', 'is_published', 'due_at'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  const classroomIds = normalizeClassroomIds(body);
  if (updates.is_published) {
    const { count, error: countError } = await supabaseAdmin
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('test_id', resolvedParams.id);
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
    if ((count ?? 0) < 1) {
      return NextResponse.json(
        { error: 'Add at least one question before publishing this test.' },
        { status: 400 }
      );
    }
  }
  if (Object.prototype.hasOwnProperty.call(updates, 'due_at')) {
    const parsed = parseDueAtPstInput(updates.due_at)
    if (parsed === undefined) return NextResponse.json({ error: 'Invalid due date/time format' }, { status: 400 })
    updates.due_at = parsed
  }

  let cloneTargets = [];
  if (classroomIds.length > 0) {
    const extraClassroomIds = classroomIds.filter((classroomId) => classroomId !== test.classroom_id);
    if (extraClassroomIds.length > 0) {
      const { data: existingGroupTests, error: existingGroupError } = await supabaseAdmin
        .from('tests')
        .select('classroom_id')
        .eq('clone_group_id', test.clone_group_id)
        .in('classroom_id', extraClassroomIds);
      if (existingGroupError) return NextResponse.json({ error: existingGroupError.message }, { status: 500 });

      const existingClassroomIds = new Set((existingGroupTests || []).map((row) => row.classroom_id));
      const newClassroomIds = extraClassroomIds.filter((classroomId) => !existingClassroomIds.has(classroomId));
      if (newClassroomIds.length === 0) {
        cloneTargets = [];
      } else {
      const { data: classrooms, error: classroomError } = await supabaseAdmin
        .from('classrooms')
        .select('id, teacher_id')
        .in('id', newClassroomIds);
      if (classroomError) return NextResponse.json({ error: classroomError.message }, { status: 500 });
      if (!classrooms || classrooms.length !== newClassroomIds.length || classrooms.some((classroom) => classroom.teacher_id !== user.id)) {
        return NextResponse.json({ error: 'One or more selected classrooms are invalid for this teacher' }, { status: 403 });
      }
      cloneTargets = newClassroomIds;
      }
    }
  }

  const { data, error } = await supabaseAdmin.from('tests').update(updates).eq('id', resolvedParams.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Object.keys(updates).length > 0 && data.clone_group_id) {
    const { error: syncError } = await supabaseAdmin
      .from('tests')
      .update(updates)
      .eq('clone_group_id', data.clone_group_id);
    if (syncError) return NextResponse.json({ error: syncError.message }, { status: 500 });
  }

  let createdTests = [];
  if (cloneTargets.length > 0) {
    const cloneRows = cloneTargets.map((classroomId) => ({
      classroom_id: classroomId,
      clone_group_id: data.clone_group_id,
      title: data.title,
      description: data.description,
      time_limit_mins: data.time_limit_mins,
      due_at: data.due_at,
      is_published: data.is_published,
    }));

    const { data: cloneData, error: cloneError } = await supabaseAdmin.from('tests').insert(cloneRows).select();
    if (cloneError) return NextResponse.json({ error: cloneError.message }, { status: 500 });

    try {
      await cloneQuestionsToTests(resolvedParams.id, cloneData || []);
    } catch (cloneQuestionsError) {
      return NextResponse.json({ error: cloneQuestionsError.message }, { status: 500 });
    }

    createdTests = cloneData || [];
  }

  return NextResponse.json({ current_test: data, created_tests: createdTests });
}

// DELETE /api/tests/[id]
export async function DELETE(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resolvedParams = await params;
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const test = await verifyTeacherOwnsTest(resolvedParams.id, user.id);
  if (!test) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await supabaseAdmin.from('tests').delete().eq('id', resolvedParams.id);
  return NextResponse.json({ ok: true });
}
