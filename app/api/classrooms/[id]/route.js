import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

async function getActorAndClassroom(classroomId, email) {
  const [{ data: user }, { data: classroom }] = await Promise.all([
    supabaseAdmin.from('users').select('id,role').eq('email', email).single(),
    supabaseAdmin.from('classrooms').select('*').eq('id', classroomId).single(),
  ]);
  return { user, classroom };
}

// GET /api/classrooms/[id] — get classroom details
export async function GET(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resolvedParams = await params; // Next.js 16+ requires awaiting params
  const { user, classroom } = await getActorAndClassroom(resolvedParams.id, session.user.email);
  if (!classroom) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (user?.role !== 'teacher' || classroom.teacher_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(classroom);
}

// PATCH /api/classrooms/[id] — update classroom
export async function PATCH(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resolvedParams = await params; // Next.js 16+ requires awaiting params
  const { user, classroom } = await getActorAndClassroom(resolvedParams.id, session.user.email);
  if (!classroom || user?.role !== 'teacher' || classroom.teacher_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json();
  const allowed = ['name', 'description', 'email_domain'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabaseAdmin.from('classrooms').update(updates).eq('id', resolvedParams.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/classrooms/[id] — delete classroom
export async function DELETE(req, { params }) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const resolvedParams = await params; // Next.js 16+ requires awaiting params
  const { user, classroom } = await getActorAndClassroom(resolvedParams.id, session.user.email);
  if (!classroom || user?.role !== 'teacher' || classroom.teacher_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { error } = await supabaseAdmin.from('classrooms').delete().eq('id', resolvedParams.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
