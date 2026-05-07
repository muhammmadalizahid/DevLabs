import { getSupabaseAdmin } from '@/lib/db/supabase'
import { createSandbox, closeSandbox } from '@/lib/sandbox/createSandbox'
import { validateQuery } from '@/lib/sandbox/validateQuery'

const MAX_QUERY_LENGTH = 5000
const DEFAULT_TIMEOUT_MS = 5000

/**
 * Fetches dataset schema and seed SQL from database
 * @param {string} datasetId - UUID of the dataset
 * @returns {Promise<{schema_sql: string, seed_sql: string}>} Schema and seed SQL
 */
async function fetchDatasetSchema(datasetId) {
  const supabase = getSupabaseAdmin()

  // Query datasets table to get schema and seed SQL
  const { data: dataset, error: queryError } = await supabase
    .from('datasets')
    .select('schema_sql, seed_sql, is_platform')
    .eq('id', datasetId)
    .single()

  if (queryError || !dataset) {
    throw new Error(`Dataset not found: ${datasetId}`)
  }

  if (!dataset.schema_sql || !dataset.seed_sql) {
    throw new Error(`Dataset is incomplete: missing schema or seed data`)
  }

  return dataset
}

/**
 * Execute a SQL query against a sandboxed SQLite dataset.
 * Creates an isolated in-memory database per request.
 * 
 * @param {string} query - The SQL query string
 * @param {string} datasetId - UUID of the dataset
 * @param {number} timeoutMs - Execution timeout in ms
 * @returns {{ rows: object[], columns: string[], error: string|null }}
 */
export async function executeQuery(
  query,
  datasetId,
  timeoutMs = DEFAULT_TIMEOUT_MS
) {
  let db = null

  try {
    // Input validation
    if (!query || typeof query !== 'string') {
      return {
        rows: [],
        columns: [],
        error: 'Query must be a non-empty string.',
      }
    }

    const trimmed = query.trim()

    if (trimmed.length === 0) {
      return {
        rows: [],
        columns: [],
        error: 'Query cannot be empty.',
      }
    }

    if (trimmed.length > MAX_QUERY_LENGTH) {
      return {
        rows: [],
        columns: [],
        error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters.`,
      }
    }

    // Validate query (blocks DROP, DELETE, UPDATE, etc.)
    try {
      validateQuery(trimmed)
    } catch (validationError) {
      return {
        rows: [],
        columns: [],
        error: validationError.message,
      }
    }

    if (!datasetId) {
      return {
        rows: [],
        columns: [],
        error: 'No dataset specified.',
      }
    }

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Query execution timed out.')),
        timeoutMs
      )
    )

    // Create query execution promise
    const queryPromise = (async () => {
      // Create isolated sandbox
      db = await createSandbox()

      // Fetch dataset schema and seed SQL
      const dataset = await fetchDatasetSchema(datasetId)
      
      // Execute schema SQL to create tables
      const schemaStatements = dataset.schema_sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
      
      for (const statement of schemaStatements) {
        try {
          await db.run(statement)
        } catch (err) {
          throw new Error(`Schema execution error: ${err.message}`)
        }
      }
      
      // Execute seed SQL to populate tables
      const seedStatements = dataset.seed_sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)
      
      for (const statement of seedStatements) {
        try {
          await db.run(statement)
        } catch (err) {
          throw new Error(`Seed execution error: ${err.message}`)
        }
      }

      // Execute query
      const rows = await db.all(trimmed)

      // Extract column names from first row
      const columns =
        rows && rows.length > 0 ? Object.keys(rows[0]) : []

      // Ensure rows are serializable
      const safeRows = Array.isArray(rows)
        ? rows.map((r) => {
            const obj = {}
            for (const [k, v] of Object.entries(r)) {
              obj[k] = v instanceof Date ? v.toISOString() : v
            }
            return obj
          })
        : []

      return { rows: safeRows, columns, error: null }
    })()

    // Race execution against timeout
    try {
      return await Promise.race([queryPromise, timeoutPromise])
    } catch (err) {
      // Handle timeout or execution errors
      const msg = err.message.includes('timed out')
        ? 'Query execution timed out. Simplify your query or check for infinite loops.'
        : `Query execution failed: ${err.message}`
      return { rows: [], columns: [], error: msg }
    }
  } catch (err) {
    // Never expose raw errors to client
    console.error('Execute query error:', err)
    return {
      rows: [],
      columns: [],
      error: 'Query execution failed. Check your SQL syntax.',
    }
  } finally {
    // Clean up sandbox
    if (db) {
      await closeSandbox(db)
    }
  }
}
