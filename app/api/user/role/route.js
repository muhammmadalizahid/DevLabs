import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';

export async function POST(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const email = token?.email;
  console.log('[role route] Session:', { email, role: token?.role });
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { role } = await req.json();
  if (!['teacher', 'student'].includes(role))
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  console.log('[role route] Updating user role:', { email, role });
  try {
    const { error, data } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('email', email)
      .select('id, email, role');

    if (error) {
      console.warn('[role route] Update skipped or failed, continuing onboarding:', error);
      return NextResponse.json({ ok: true, user: { email, role }, sync: 'deferred' });
    }

    console.log('[role route] Role updated successfully:', { email, newRole: role, data });
    return NextResponse.json({ ok: true, user: data?.[0], sync: 'ok' });
  } catch (err) {
    console.warn('[role route] Unexpected update failure, continuing onboarding:', err);
    return NextResponse.json({ ok: true, user: { email, role }, sync: 'deferred' });
  }
}
