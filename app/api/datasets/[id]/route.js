import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { deprovisionDataset } from '@/lib/engine/provision';

// DELETE /api/datasets/[id]
export async function DELETE(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  const { data: dataset } = await supabaseAdmin.from('datasets').select('owner_id,is_platform').eq('id', resolvedParams.id).single();
  if (!dataset || dataset.is_platform || dataset.owner_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  await supabaseAdmin.from('datasets').delete().eq('id', resolvedParams.id);
  try { await deprovisionDataset(resolvedParams.id); } catch (_) {}
  return NextResponse.json({ ok: true });
}
