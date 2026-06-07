import { getSupabaseAdmin } from '@/lib/db/supabase'
import { getTiDBPool } from '@/lib/db/tidb'
import { extractTableNames, rewriteTableNames, splitSqlStatements } from '@/lib/tidb/sql-utils'
import { physicalTableName, quoteIdentifier, tempTableName } from '@/lib/tidb/identifiers'
import crypto from 'node:crypto'

function safeSqlError(error) {
  const text = String(error?.message || 'Unknown SQL engine error')
  return text.replace(/(password|token|secret)\s*=\s*[^,\s)]+/gi, '$1=[redacted]')
}

async function updateDatasetStatus(datasetId, updates = {}) {
  const supabase = getSupabaseAdmin()
  try {
    await supabase.from('datasets').update(updates).eq('id', datasetId)
  } catch {}
}

async function dropTables(pool, tableNames = []) {
  for (const name of tableNames) {
    try {
      await pool.query(`DROP TABLE IF EXISTS ${quoteIdentifier(name)}`)
    } catch {}
  }
}

async function collectTableMetadata(pool, tableEntries = [], sampleLimit = 5) {
  const out = []
  for (const entry of tableEntries) {
    const [cols] = await pool.query(`SHOW COLUMNS FROM ${quoteIdentifier(entry.physical_table_name)}`)
    const [countRows] = await pool.query(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(entry.physical_table_name)}`)
    const [sampleRows] = await pool.query(`SELECT * FROM ${quoteIdentifier(entry.physical_table_name)} LIMIT ${sampleLimit}`)
    const estimatedRowSize = JSON.stringify(sampleRows?.[0] || {}).length || 0
    const rowCount = countRows?.[0]?.count ?? 0
    out.push({
      ...entry,
      columns_json: (cols || []).map((c) => ({
        name: c.Field,
        type: c.Type || 'TEXT',
        not_null: String(c.Null || '').toUpperCase() === 'NO',
        primary_key: String(c.Key || '').toUpperCase() === 'PRI',
        default_value: c.Default ?? null,
      })),
      row_count: rowCount,
      sample_rows_json: sampleRows || [],
      table_size_estimate: estimatedRowSize * Math.max(Number(rowCount) || 0, 1),
      last_refreshed_at: new Date().toISOString(),
    })
  }
  return out
}

export async function provisionDataset(datasetId, schemaSql, seedSql) {
  const pool = getTiDBPool()
  const supabase = getSupabaseAdmin()
  const combined = [schemaSql || '', seedSql || ''].join('\n')
  const versionHash = crypto.createHash('sha1').update(combined).digest('hex')
  const originals = extractTableNames(combined)
  if (originals.length === 0) throw new Error('No tables detected in dataset SQL.')

  const mapToTmp = new Map()
  const mapToFinal = new Map()
  const entries = []
  for (const original of originals) {
    const tempName = tempTableName(datasetId, original)
    const finalName = physicalTableName(datasetId, original)
    mapToTmp.set(original.toLowerCase(), tempName)
    mapToFinal.set(original.toLowerCase(), finalName)
    entries.push({
      original_table_name: original.toLowerCase(),
      physical_table_name: finalName,
      temp_table_name: tempName,
    })
  }

  const tmpNames = entries.map((e) => e.temp_table_name)
  const finalNames = entries.map((e) => e.physical_table_name)

  await updateDatasetStatus(datasetId, {
    status: 'PROCESSING',
    table_prefix: `ds_${String(datasetId).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 18)}_`,
    tidb_database_name: process.env.TIDB_DATABASE || 'devlabs_datasets',
    version_hash: versionHash,
    error_message: null,
  })

  try {
    await dropTables(pool, tmpNames)
    await dropTables(pool, finalNames)

    const rewrittenSchema = rewriteTableNames(schemaSql || '', mapToTmp)
    const rewrittenSeed = rewriteTableNames(seedSql || '', mapToTmp)

    for (const statement of splitSqlStatements(rewrittenSchema)) {
      await pool.query(statement)
    }
    for (const statement of splitSqlStatements(rewrittenSeed)) {
      await pool.query(statement)
    }

    for (const row of entries) {
      await pool.query(`RENAME TABLE ${quoteIdentifier(row.temp_table_name)} TO ${quoteIdentifier(row.physical_table_name)}`)
    }

    const metadata = await collectTableMetadata(pool, entries, 5)
    const totalRows = metadata.reduce((sum, t) => sum + (Number(t.row_count) || 0), 0)

    await supabase.from('dataset_tables').delete().eq('dataset_id', datasetId)
    await supabase.from('dataset_tables').insert(
      metadata.map((m) => ({
        dataset_id: datasetId,
        original_table_name: m.original_table_name,
        physical_table_name: m.physical_table_name,
        columns_json: m.columns_json,
        row_count: m.row_count,
        sample_rows_json: m.sample_rows_json,
        table_size_estimate: m.table_size_estimate,
        last_refreshed_at: m.last_refreshed_at,
      }))
    )

    await updateDatasetStatus(datasetId, {
      status: 'READY',
      table_count: metadata.length,
      row_count: totalRows,
      error_message: null,
      metadata_cached_at: new Date().toISOString(),
      table_name: metadata[0]?.physical_table_name || null,
      storage_path: null,
    })

    return { success: true, datasetId, tablesCreated: metadata.length }
  } catch (err) {
    await dropTables(pool, tmpNames)
    await updateDatasetStatus(datasetId, {
      status: 'FAILED',
      error_message: safeSqlError(err),
    })
    throw new Error(safeSqlError(err))
  }
}

export async function deprovisionDataset(datasetId) {
  const supabase = getSupabaseAdmin()
  const pool = getTiDBPool()
  const { data: tableRows } = await supabase
    .from('dataset_tables')
    .select('physical_table_name')
    .eq('dataset_id', datasetId)

  const names = (tableRows || []).map((r) => r.physical_table_name).filter(Boolean)
  await dropTables(pool, names)
  await supabase.from('dataset_tables').delete().eq('dataset_id', datasetId)
  await supabase.from('datasets').update({ status: 'DELETED' }).eq('id', datasetId)
}
