import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

async function verifyTeacherOwnsTest(testId, userId) {
  const { data: test } = await supabaseAdmin.from('tests').select('*, classrooms(teacher_id)').eq('id', testId).single();
  return test?.classrooms?.teacher_id === userId ? test : null;
}

// GET /api/tests/[id]
export async function GET(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resolvedParams = await params;
  const { data: test } = await supabaseAdmin.from('tests').select('*, questions(*), classrooms(name,teacher_id)').eq('id', resolvedParams.id).single();
  if (!test) return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
  const allowed = ['title', 'description', 'time_limit_mins', 'is_published'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabaseAdmin.from('tests').update(updates).eq('id', resolvedParams.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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
