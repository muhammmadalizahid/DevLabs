import crypto from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/db/supabase'
import { getTiDBPool } from '@/lib/db/tidb'
import { cacheGet, cacheSet, withInFlight } from '@/lib/cache/runtimeCache'
import { physicalTableName, quoteIdentifier } from '@/lib/tidb/identifiers'
import { extractSchemaTables, extractTableNames } from '@/lib/tidb/sql-utils'

const DEFAULT_PREVIEW_LIMIT = 10
const MAX_PREVIEW_LIMIT = 25
const TABLE_PREVIEW_TTL_SEC = parseInt(process.env.EXEC_DATASET_CACHE_TTL_SEC || '900', 10)

function normalizeColumns(cols = []) {
  return (cols || []).map((c) => ({
    name: c.Field || c.name,
    type: c.Type || c.type || 'TEXT',
    not_null: String(c.Null || '').toUpperCase() === 'NO' || !!c.notnull,
    primary_key: String(c.Key || '').toUpperCase() === 'PRI' || !!c.pk,
    default_value: c.Default ?? c.dflt_value ?? null,
  }))
}

function clampPreviewLimit(limit) {
  const parsed = Number(limit || DEFAULT_PREVIEW_LIMIT)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_PREVIEW_LIMIT
  return Math.min(MAX_PREVIEW_LIMIT, Math.max(1, Math.trunc(parsed)))
}

function clampPage(page) {
  const parsed = Number(page || 1)
  if (!Number.isFinite(parsed) || parsed <= 0) return 1
  return Math.trunc(parsed)
}

async function readCachedDatasetTables(supabase, datasetId) {
  const { data, error } = await supabase
    .from('dataset_tables')
    .select('original_table_name,physical_table_name,columns_json,row_count,sample_rows_json,table_size_estimate,last_refreshed_at')
    .eq('dataset_id', datasetId)
    .order('original_table_name')

  if (error) return []
  return data || []
}

async function loadDatasetRecord(datasetId) {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('datasets')
    .select('id,schema_sql,seed_sql,status,version_hash,metadata_cached_at')
    .eq('id', datasetId)
    .single()
  return data || null
}

async function writeDatasetTableMetadata(datasetId, tables = [], versionHash = null) {
  const supabase = getSupabaseAdmin()
  const nowIso = new Date().toISOString()
  await supabase.from('dataset_tables').delete().eq('dataset_id', datasetId)
  if (tables.length > 0) {
    await supabase.from('dataset_tables').insert(
      tables.map((t) => ({
        dataset_id: datasetId,
        original_table_name: t.original_table_name,
        physical_table_name: t.physical_table_name,
        columns_json: t.columns_json || [],
        row_count: t.row_count ?? 0,
        sample_rows_json: t.sample_rows_json || [],
        table_size_estimate: t.table_size_estimate ?? 0,
        last_refreshed_at: t.last_refreshed_at || nowIso,
      }))
    )
  }
  await supabase
    .from('datasets')
    .update({
      table_count: tables.length,
      row_count: tables.reduce((sum, t) => sum + (Number(t.row_count) || 0), 0),
      metadata_cached_at: nowIso,
      version_hash: versionHash || null,
      status: 'READY',
      error_message: null,
    })
    .eq('id', datasetId)
}

async function inspectPhysicalTable(pool, originalTableName, physicalName, previewLimit, page = 1, includeRows = false) {
  const [existsRows] = await pool.query('SHOW TABLES LIKE ?', [physicalName])
  if (!existsRows || existsRows.length === 0) return null

  const [cols] = await pool.query(`SHOW COLUMNS FROM ${quoteIdentifier(physicalName)}`)
  const columns = normalizeColumns(cols)
  const [countRows] = await pool.query(`SELECT COUNT(*) AS count FROM ${quoteIdentifier(physicalName)}`)
  const rowCount = Number(countRows?.[0]?.count || 0)
  const safeLimit = clampPreviewLimit(previewLimit)
  const safePage = clampPage(page)
  const offset = (safePage - 1) * safeLimit

  let previewRows = []
  if (includeRows) {
    const [sample] = await pool.query(
      `SELECT * FROM ${quoteIdentifier(physicalName)} LIMIT ${safeLimit} OFFSET ${offset}`
    )
    previewRows = sample || []
  }

  const estimatedRowSize = JSON.stringify(previewRows?.[0] || {}).length || 0

  return {
    table: originalTableName,
    original_table_name: originalTableName,
    physical_table_name: physicalName,
    row_count: rowCount,
    preview_rows: previewRows,
    preview_limit: safeLimit,
    page: safePage,
    has_more: offset + previewRows.length < rowCount,
    columns,
    columns_json: columns,
    sample_rows_json: previewRows,
    table_size_estimate: estimatedRowSize * Math.max(rowCount, 1),
    last_refreshed_at: new Date().toISOString(),
  }
}

function schemaFallbackRows(datasetId, dataset) {
  const parsed = extractSchemaTables(dataset?.schema_sql || '')
  if (!parsed.length) return []
  return parsed.map((t) => ({
    table: t.table,
    original_table_name: t.table,
    physical_table_name: physicalTableName(datasetId, t.table),
    row_count: 0,
    preview_rows: [],
    preview_limit: DEFAULT_PREVIEW_LIMIT,
    page: 1,
    has_more: false,
    columns: t.columns || [],
    columns_json: t.columns || [],
    sample_rows_json: [],
    table_size_estimate: 0,
    last_refreshed_at: null,
  }))
}

function toViewerTable(row, includeRows = false, previewLimit = DEFAULT_PREVIEW_LIMIT) {
  return {
    table: row.original_table_name,
    physical_table_name: row.physical_table_name,
    row_count: row.row_count ?? 0,
    preview_rows: includeRows ? (row.sample_rows_json || []).slice(0, previewLimit) : [],
    preview_limit: previewLimit,
    page: 1,
    has_more: Number(row.row_count || 0) > previewLimit,
    columns: row.columns_json || [],
    table_size_estimate: row.table_size_estimate ?? 0,
    last_refreshed_at: row.last_refreshed_at || null,
  }
}

async function hydrateMetadataFromSchema(datasetId, dataset) {
  const schemaRows = schemaFallbackRows(datasetId, dataset)
  if (!schemaRows.length) return []
  const versionHash = crypto
    .createHash('sha1')
    .update([dataset?.schema_sql || '', dataset?.seed_sql || ''].join('\n'))
    .digest('hex')
  await writeDatasetTableMetadata(
    datasetId,
    schemaRows.map((t) => ({
      original_table_name: t.original_table_name,
      physical_table_name: t.physical_table_name,
      columns_json: t.columns_json,
      row_count: t.row_count,
      sample_rows_json: t.sample_rows_json,
      table_size_estimate: t.table_size_estimate,
      last_refreshed_at: t.last_refreshed_at,
    })),
    versionHash
  )
  const supabase = getSupabaseAdmin()
  return readCachedDatasetTables(supabase, datasetId)
}

async function refreshMetadataFromTiDB(datasetId, dataset, previewLimit = DEFAULT_PREVIEW_LIMIT) {
  const originals = extractTableNames([dataset?.schema_sql || '', dataset?.seed_sql || ''].join('\n'))
  if (!originals.length) return []

  const pool = getTiDBPool()
  const inspected = []
  for (const original of originals) {
    const physicalName = physicalTableName(datasetId, original)
    const table = await inspectPhysicalTable(pool, original.toLowerCase(), physicalName, previewLimit, 1, true)
    if (table) inspected.push(table)
  }

  if (!inspected.length) return []
  const versionHash = crypto
    .createHash('sha1')
    .update([dataset?.schema_sql || '', dataset?.seed_sql || ''].join('\n'))
    .digest('hex')
  await writeDatasetTableMetadata(
    datasetId,
    inspected.map((t) => ({
      original_table_name: t.original_table_name,
      physical_table_name: t.physical_table_name,
      columns_json: t.columns_json,
      row_count: t.row_count,
      sample_rows_json: t.sample_rows_json,
      table_size_estimate: t.table_size_estimate,
      last_refreshed_at: t.last_refreshed_at,
    })),
    versionHash
  )
  const supabase = getSupabaseAdmin()
  return readCachedDatasetTables(supabase, datasetId)
}

async function ensureDatasetCache(datasetId, { refresh = false, previewLimit = DEFAULT_PREVIEW_LIMIT } = {}) {
  const supabase = getSupabaseAdmin()
  const cached = await readCachedDatasetTables(supabase, datasetId)
  if (cached.length > 0 && !refresh) return cached

  const dataset = await loadDatasetRecord(datasetId)
  if (!dataset) return []

  if (refresh) {
    const refreshed = await refreshMetadataFromTiDB(datasetId, dataset, previewLimit)
    if (refreshed.length > 0) return refreshed
  }

  if (cached.length > 0) return cached

  return hydrateMetadataFromSchema(datasetId, dataset)
}

export async function buildDatasetStructure(
  datasetId,
  { refresh = false, includeRows = false, previewLimit = DEFAULT_PREVIEW_LIMIT } = {}
) {
  const safeLimit = clampPreviewLimit(previewLimit)
  const cached = await ensureDatasetCache(datasetId, { refresh, previewLimit: safeLimit })
  return cached.map((t) => toViewerTable(t, includeRows, safeLimit))
}

export async function buildDatasetTablePreview(
  datasetId,
  tableName,
  { refresh = false, previewLimit = DEFAULT_PREVIEW_LIMIT, page = 1 } = {}
) {
  const safeLimit = clampPreviewLimit(previewLimit)
  const safePage = clampPage(page)
  const cached = await ensureDatasetCache(datasetId, { refresh: false, previewLimit: safeLimit })
  const normalizedTable = String(tableName || '').toLowerCase()
  const match = cached.find((t) => t.original_table_name === normalizedTable)
  if (!match) return null

  if (!refresh && safePage === 1 && Array.isArray(match.sample_rows_json) && match.sample_rows_json.length > 0) {
    return {
      ...toViewerTable(match, true, safeLimit),
      page: 1,
      has_more: Number(match.row_count || 0) > safeLimit,
    }
  }

  const cacheKey = `dataset-preview:${datasetId}:${normalizedTable}:p${safePage}:l${safeLimit}`
  const cachedPreview = !refresh ? await cacheGet(cacheKey) : null
  if (cachedPreview) return cachedPreview

  const pool = getTiDBPool()
  const result = await withInFlight(cacheKey, async () => {
    const inspected = await inspectPhysicalTable(
      pool,
      normalizedTable,
      match.physical_table_name,
      safeLimit,
      safePage,
      true
    )
    if (!inspected) return null

    // Only persist the first page back to Supabase metadata. Higher pages stay ephemeral
    // so the viewer remains fast without bloating shared metadata storage.
    if (safePage === 1) {
      const supabase = getSupabaseAdmin()
      await supabase
        .from('dataset_tables')
        .update({
          columns_json: inspected.columns_json,
          row_count: inspected.row_count,
          sample_rows_json: inspected.sample_rows_json,
          table_size_estimate: inspected.table_size_estimate,
          last_refreshed_at: inspected.last_refreshed_at,
        })
        .eq('dataset_id', datasetId)
        .eq('original_table_name', normalizedTable)
      await supabase
        .from('datasets')
        .update({ metadata_cached_at: new Date().toISOString() })
        .eq('id', datasetId)
    }

    return inspected
  })

  if (result) await cacheSet(cacheKey, result, TABLE_PREVIEW_TTL_SEC)
  return result
}
