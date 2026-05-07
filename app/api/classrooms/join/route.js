import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

// POST /api/classrooms/join — student requests to join via invite code
export async function POST(req) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: user } = await supabaseAdmin.from('users').select('id,role,email').eq('email', session.user.email).single();
  if (user?.role !== 'student') return NextResponse.json({ error: 'Only students can join classrooms' }, { status: 403 });

  const { invite_code } = await req.json();
  if (!invite_code?.trim()) return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });

  const { data: classroom } = await supabaseAdmin
    .from('classrooms')
    .select('id, email_domain, name')
    .eq('invite_code', invite_code.trim().toUpperCase())
    .single();

  if (!classroom) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });

  // Email domain restriction check
  if (classroom.email_domain && !user.email.endsWith(classroom.email_domain)) {
    return NextResponse.json({
      error: `This classroom requires an email ending in ${classroom.email_domain}`,
    }, { status: 403 });
  }

  // Check existing enrollment
  const { data: existing } = await supabaseAdmin
    .from('enrollments')
    .select('id, status')
    .eq('classroom_id', classroom.id)
    .eq('student_id', user.id)
    .single();

  if (existing) {
    const msgs = { pending: 'Request already pending', approved: 'Already enrolled', rejected: 'Your request was rejected' };
    return NextResponse.json({ error: msgs[existing.status] || 'Already requested' }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin.from('enrollments').insert({
    classroom_id: classroom.id,
    student_id: user.id,
    status: 'pending',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ...data, classroom_name: classroom.name }, { status: 201 });
}
