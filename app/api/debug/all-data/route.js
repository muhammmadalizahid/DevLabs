import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function GET() {
  const { data: allEnrollments } = await supabaseAdmin
    .from('enrollments')
    .select('id, status, classroom_id, student_id, classrooms(name), users!student_id(email, name)');

  const { data: allUsers } = await supabaseAdmin
    .from('users')
    .select('id, email, name, role');

  return NextResponse.json({
    users: allUsers,
    enrollments: allEnrollments,
  });
}
