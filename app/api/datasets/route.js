import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { provisionDataset, deprovisionDataset } from '@/lib/engine/provision';

// GET /api/datasets
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', session.user.email).single();
  const { data } = await supabaseAdmin
    .from('datasets').select('id,name,description,is_platform,created_at,owner_id')
    .or(`is_platform.eq.true,owner_id.eq.${user.id}`)
    .order('is_platform', { ascending: false })
    .order('created_at', { ascending: false });
  return NextResponse.json(data ?? []);
}

// POST /api/datasets — upload custom dataset
export async function POST(req) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, description, schema_sql, seed_sql } = await req.json();
  if (!name?.trim() || !schema_sql?.trim()) return NextResponse.json({ error: 'name and schema_sql required' }, { status: 400 });

  const { data, error } = await supabaseAdmin.from('datasets').insert({
    name: name.trim(), description: description?.trim() || null,
    owner_id: user.id, is_platform: false,
    schema_sql, seed_sql: seed_sql || '',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Provision MySQL sandbox
  try {
    await provisionDataset(data.id, schema_sql, seed_sql || '');
  } catch (err) {
    // Rollback DB record
    await supabaseAdmin.from('datasets').delete().eq('id', data.id);
    return NextResponse.json({ error: 'Failed to provision sandbox: ' + err.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
