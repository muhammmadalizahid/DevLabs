import crypto from 'node:crypto'
import { getSupabaseAdmin } from '@/lib/db/supabase'
import { getTiDBPool } from '@/lib/db/tidb'
import { cacheGet, cacheSet, withInFlight } from '@/lib/cache/runtimeCache'
import { getDatasetReadiness } from '@/lib/datasets/status'
import { rewriteTableNames } from '@/lib/tidb/sql-utils'
import { validateAndPrepareStudentQuery } from '@/lib/engine/query-validator'

const DEFAULT_TIMEOUT_MS = parseInt(process.env.SUBMIT_QUERY_TIMEOUT_MS || '5000', 10)
const RESULT_TTL_SEC = parseInt(process.env.EXEC_RESULT_CACHE_TTL_SEC || '180', 10)
const MAX_RESULT_BYTES = parseInt(process.env.EXEC_MAX_RESULT_BYTES || '524288', 10)
const MAX_RESULT_ROWS = parseInt(process.env.EXEC_MAX_RESULT_ROWS || '100', 10)

function hash(value) {
  return crypto.createHash('sha1').update(value).digest('hex')
}

function normalizeQueryForCache(query) {
  return query.replace(/\s+/g, ' ').trim().toLowerCase()
}

async function loadDatasetTableMap(datasetId) {
  const supabase = getSupabaseAdmin()
  const readiness = await getDatasetReadiness(supabase, datasetId)
  if (!readiness.dataset) throw new Error(readiness.error)
  if (!readiness.ready) throw new Error(readiness.error)

  const { data: rows, error } = await supabase
    .from('dataset_tables')
    .select('original_table_name,physical_table_name')
    .eq('dataset_id', datasetId)
  if (error) throw new Error(`Failed to load dataset table metadata: ${error.message}`)
  if (!rows || rows.length === 0) throw new Error('Dataset table metadata is missing')

  const map = new Map()
  for (const r of rows) map.set(String(r.original_table_name || '').toLowerCase(), String(r.physical_table_name || ''))
  return map
}

function serializeRows(rows) {
  const safeRows = Array.isArray(rows)
    ? rows.map((r) => {
        const out = {}
        for (const [k, v] of Object.entries(r)) out[k] = v instanceof Date ? v.toISOString() : v
        return out
      })
    : []
  const columns = safeRows.length > 0 ? Object.keys(safeRows[0]) : []
  return { rows: safeRows, columns }
}

function budgetCheck(result) {
  if (result.rows.length > MAX_RESULT_ROWS) {
    return { ok: false, error: `Result exceeds max rows (${MAX_RESULT_ROWS}).` }
  }
  const bytes = Buffer.byteLength(JSON.stringify(result), 'utf8')
  if (bytes > MAX_RESULT_BYTES) {
    return { ok: false, error: `Result exceeds max payload (${MAX_RESULT_BYTES} bytes).` }
  }
  return { ok: true }
}

async function queryWithTimeout(pool, sql, timeoutMs) {
  const conn = await pool.getConnection()
  try {
    const queryPromise = conn.query(sql)
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Query execution timed out.')), timeoutMs))
    const [rows] = await Promise.race([queryPromise, timeout])
    return rows
  } finally {
    conn.release()
  }
}

async function runQuery(query, datasetId, timeoutMs) {
  const validation = validateAndPrepareStudentQuery(query)
  if (!validation.valid) return { rows: [], columns: [], error: validation.error }
  const tableMap = await loadDatasetTableMap(datasetId)
  const rewritten = rewriteTableNames(validation.query, tableMap)

  const pool = getTiDBPool()
  const rows = await queryWithTimeout(pool, rewritten, timeoutMs)
  const result = serializeRows(rows)
  const budget = budgetCheck(result)
  if (!budget.ok) return { rows: [], columns: [], error: budget.error }
  return { ...result, error: null }
}

export async function executeQuery(query, datasetId, timeoutMs = DEFAULT_TIMEOUT_MS) {
  try {
    if (!query || typeof query !== 'string') return { rows: [], columns: [], error: 'Query must be a non-empty string.' }
    if (!datasetId) return { rows: [], columns: [], error: 'No dataset specified.' }
    const queryKey = normalizeQueryForCache(query)
    const cacheKey = `exec:result:${datasetId}:${hash(queryKey)}`
    const cached = await cacheGet(cacheKey)
    if (cached) return cached

    const result = await withInFlight(cacheKey, async () => {
      const next = await runQuery(query, datasetId, timeoutMs)
      if (!next.error) await cacheSet(cacheKey, next, RESULT_TTL_SEC)
      return next
    })
    return result
  } catch (err) {
    return { rows: [], columns: [], error: `SQL engine error: ${err.message}` }
  }
}

export async function executeQueriesBatch(inputs = [], defaultTimeoutMs = DEFAULT_TIMEOUT_MS) {
  const results = new Map()
  for (const input of inputs) {
    try {
      const res = await executeQuery(input.query, input.datasetId, input.timeoutMs || defaultTimeoutMs)
      results.set(input.key, res)
    } catch (err) {
      results.set(input.key, { rows: [], columns: [], error: `SQL engine error: ${err.message}` })
    }
  }
  return results
}
