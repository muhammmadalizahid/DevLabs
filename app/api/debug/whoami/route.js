import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET() {
  const session = await getServerSession();
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id, email, role')
    .eq('email', session.user.email)
    .single();

  const { data: enrollments } = await supabaseAdmin
    .from('enrollments')
    .select('id, status, classroom_id')
    .eq('student_id', user.id);

  return NextResponse.json({
    session: {
      email: session.user.email,
      name: session.user.name,
    },
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    enrollments: {
      count: enrollments?.length || 0,
      data: enrollments,
    },
  });
}
