import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// PATCH /api/tests/[id]/questions/[qid]
export async function PATCH(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const allowed = ['prompt', 'difficulty', 'expected_output', 'dataset_id', 'order_sensitive', 'points', 'position', 'partial_grading'];
  const updates = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabaseAdmin.from('questions').update(updates).eq('id', resolvedParams.qid).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
  return NextResponse.json(data);
}

// DELETE /api/tests/[id]/questions/[qid]
export async function DELETE(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { error } = await supabaseAdmin.from('questions').delete().eq('id', resolvedParams.qid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
