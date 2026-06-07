import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/db/supabase';
import { provisionDataset } from '@/lib/engine/provision';
import { testTiDBConnection } from '@/lib/db/tidb';
import { normalizeDatasetStatus } from '@/lib/datasets/status';

function splitSqlStatements(sql = '') {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseCombinedSql(sqlBundle) {
  const statements = splitSqlStatements(sqlBundle);
  const schemaStatements = [];
  const seedStatements = [];

  for (const raw of statements) {
    const s = raw.trim();
    if (!s) continue;
    const upper = s.toUpperCase();
    // Ignore MySQL wrapper/database selection statements for sandbox portability.
    if (
      upper.startsWith('CREATE DATABASE ') ||
      upper.startsWith('DROP DATABASE ') ||
      upper.startsWith('USE ') ||
      upper.startsWith('SET FOREIGN_KEY_CHECKS') ||
      upper.startsWith('LOCK TABLES') ||
      upper.startsWith('UNLOCK TABLES')
    ) {
      continue;
    }
    const isSchema =
      upper.startsWith('CREATE ') ||
      upper.startsWith('ALTER ') ||
      upper.startsWith('DROP ') ||
      upper.startsWith('PRAGMA ') ||
      upper.startsWith('BEGIN ') ||
      upper.startsWith('COMMIT ') ||
      upper.startsWith('END ');
    const isSeed =
      upper.startsWith('INSERT ') ||
      upper.startsWith('UPDATE ') ||
      upper.startsWith('DELETE ') ||
      upper.startsWith('REPLACE ');

    if (isSchema) schemaStatements.push(s);
    else if (isSeed) seedStatements.push(s);
    else schemaStatements.push(s);
  }

  return {
    schema_sql: schemaStatements.join(';\n') + (schemaStatements.length ? ';' : ''),
    seed_sql: seedStatements.join(';\n') + (seedStatements.length ? ';' : ''),
  };
}

function buildSourceSql(schemaSql = '', seedSql = '') {
  return [schemaSql || '', seedSql || '']
    .filter((part) => String(part || '').trim())
    .join('\n\n')
    .trim()
}

// GET /api/datasets
export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', session.user.email).single();
  const { data } = await supabaseAdmin
    .from('datasets').select('id,name,description,is_platform,created_at,owner_id,status,table_count,row_count,error_message')
    .or(`is_platform.eq.true,owner_id.eq.${user.id}`)
    .order('is_platform', { ascending: false })
    .order('created_at', { ascending: false });
  const normalized = (data || []).map((dataset) => ({
    ...dataset,
    status: normalizeDatasetStatus(dataset),
  }))
  return NextResponse.json(normalized);
}

// POST /api/datasets — upload custom dataset
export async function POST(req) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: user } = await supabaseAdmin.from('users').select('id,role').eq('email', session.user.email).single();
  if (user?.role !== 'teacher') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, description, sql_script, combined_sql } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const inputScript = sql_script || combined_sql || ''
  if (!inputScript.trim()) {
    return NextResponse.json({ error: 'A single SQL script is required' }, { status: 400 });
  }

  const parsed = parseCombinedSql(inputScript)
  const finalSchema = parsed.schema_sql
  const finalSeed = parsed.seed_sql

  if (!finalSchema?.trim()) {
    return NextResponse.json({ error: 'The SQL script must include table definitions.' }, { status: 400 });
  }

  try {
    await testTiDBConnection();
  } catch (err) {
    return NextResponse.json({ error: `SQL engine is unavailable: ${err.message}` }, { status: 503 });
  }

  const { data, error } = await supabaseAdmin.from('datasets').insert({
    name: name.trim(), description: description?.trim() || null,
    owner_id: user.id, is_platform: false,
    schema_sql: finalSchema, seed_sql: finalSeed,
    status: 'PROCESSING',
    tidb_database_name: process.env.TIDB_DATABASE || 'devlabs_datasets',
    table_count: 0,
    row_count: 0,
    error_message: null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Provision TiDB dataset tables
  try {
    await provisionDataset(data.id, finalSchema, finalSeed);
  } catch (err) {
    await supabaseAdmin.from('datasets').update({ status: 'FAILED', error_message: err.message }).eq('id', data.id);
    return NextResponse.json({ error: `Dataset SQL validation failed: ${err.message}` }, { status: 400 });
  }

  const { data: fresh } = await supabaseAdmin.from('datasets').select('*').eq('id', data.id).single();
  return NextResponse.json({
    ...(fresh || data),
    source_sql: buildSourceSql(finalSchema, finalSeed),
  }, { status: 201 });
}
