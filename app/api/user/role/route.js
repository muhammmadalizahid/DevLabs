import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function POST(req) {
  const session = await getServerSession();
  console.log('[role route] Session:', { email: session?.user?.email, role: session?.user?.role });
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { role } = await req.json();
  if (!['teacher', 'student'].includes(role))
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  console.log('[role route] Updating user role:', { email: session.user.email, role });
  const { error, data } = await supabaseAdmin
    .from('users')
    .update({ role })
    .eq('email', session.user.email)
    .select('id, email, role');

  if (error) {
    console.error('[role route] Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  console.log('[role route] Role updated successfully:', { email: session.user.email, newRole: role, data });
  return NextResponse.json({ ok: true, user: data?.[0] });
}
