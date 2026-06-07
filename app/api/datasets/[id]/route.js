import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { deprovisionDataset } from '@/lib/engine/provision';
import { buildDatasetStructure, buildDatasetTablePreview } from '@/lib/datasets/buildDatasetStructure';
import { normalizeDatasetStatus } from '@/lib/datasets/status';

// GET /api/datasets/[id] - dataset detail for teachers
export async function GET(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: dataset, error } = await supabaseAdmin
    .from('datasets')
    .select('id,name,description,is_platform,owner_id,created_at,table_count,row_count,status,error_message,metadata_cached_at,version_hash')
    .eq('id', resolvedParams.id)
    .single();

  if (error || !dataset) return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
  if (!dataset.is_platform && dataset.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const refresh = req.nextUrl.searchParams.get('refresh') === '1';
  const includeSql = req.nextUrl.searchParams.get('includeSql') === '1';
  const tableName = req.nextUrl.searchParams.get('table');
  const page = Number(req.nextUrl.searchParams.get('page') || '1');
  const limit = Number(req.nextUrl.searchParams.get('limit') || '10');

  if (includeSql) {
    const { data: sqlPayload } = await supabaseAdmin
      .from('datasets')
      .select('schema_sql,seed_sql')
      .eq('id', resolvedParams.id)
      .single();
    return NextResponse.json({
      id: dataset.id,
      source_sql: [sqlPayload?.schema_sql || '', sqlPayload?.seed_sql || '']
        .filter((part) => String(part || '').trim())
        .join('\n\n')
        .trim(),
    });
  }

  if (tableName) {
    const table = await buildDatasetTablePreview(dataset.id, tableName, { refresh, previewLimit: limit, page });
    if (!table) return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    return NextResponse.json({ table });
  }

  const tables = await buildDatasetStructure(dataset.id, { refresh, includeRows: true, previewLimit: 10 });
  const payload = {
    id: dataset.id,
    name: dataset.name,
    description: dataset.description,
    is_platform: dataset.is_platform,
    owner_id: dataset.owner_id,
    created_at: dataset.created_at,
    table_count: dataset.table_count,
    row_count: dataset.row_count,
    status: normalizeDatasetStatus(dataset),
    error_message: dataset.error_message,
    metadata_cached_at: dataset.metadata_cached_at,
    version_hash: dataset.version_hash,
    tables,
  };

  return NextResponse.json(payload);
}

// DELETE /api/datasets/[id]
export async function DELETE(req, { params }) {
  const resolvedParams = await params;
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  const { data: dataset } = await supabaseAdmin.from('datasets').select('owner_id,is_platform').eq('id', resolvedParams.id).single();
  if (!dataset || dataset.is_platform || dataset.owner_id !== user.id)
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try { await deprovisionDataset(resolvedParams.id); } catch (_) {}
  await supabaseAdmin.from('datasets').delete().eq('id', resolvedParams.id);
  return NextResponse.json({ ok: true });
}
