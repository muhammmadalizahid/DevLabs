import mysql from 'mysql2/promise';

const QUERY_BLOCKLIST = /(^\s*|;\s*)(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|REPLACE|CALL|EXEC|EXECUTE|LOAD|LOCK|UNLOCK|FLUSH|KILL|SHUTDOWN)\s/i;
const MAX_QUERY_LENGTH = 5000;
const DEFAULT_TIMEOUT_MS = 5000;

// Connection pool cache per dataset
const pools = new Map();

function getPool(datasetId) {
  if (!pools.has(datasetId)) {
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: `devlab_ds_${datasetId.replace(/-/g, '_')}`,
      connectionLimit: 5,
      connectTimeout: 8000,
      waitForConnections: true,
      queueLimit: 10,
    });
    pools.set(datasetId, pool);
  }
  return pools.get(datasetId);
}

/**
 * Execute a SQL query against a sandboxed dataset.
 * @param {string} query - The SQL query string
 * @param {string} datasetId - UUID of the dataset
 * @param {number} timeoutMs - Execution timeout in ms
 * @returns {{ rows: object[], columns: string[], error: string|null }}
 */
export async function executeQuery(query, datasetId, timeoutMs = DEFAULT_TIMEOUT_MS) {
  // Input validation
  if (!query || typeof query !== 'string') {
    return { rows: [], columns: [], error: 'Query must be a non-empty string.' };
  }
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return { rows: [], columns: [], error: 'Query cannot be empty.' };
  }
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return { rows: [], columns: [], error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters.` };
  }
  if (QUERY_BLOCKLIST.test(trimmed)) {
    return { rows: [], columns: [], error: 'Query contains disallowed operations. Only SELECT statements are permitted.' };
  }
  if (!datasetId) {
    return { rows: [], columns: [], error: 'No dataset specified.' };
  }

  const pool = getPool(datasetId);

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query execution timed out.')), timeoutMs)
  );

  const queryPromise = (async () => {
    const conn = await pool.getConnection();
    try {
      const [rows, fields] = await conn.execute(trimmed);
      const columns = fields ? fields.map(f => f.name) : [];
      // Ensure rows is serializable
      const safeRows = Array.isArray(rows)
        ? rows.map(r => {
            const obj = {};
            for (const [k, v] of Object.entries(r)) {
              obj[k] = v instanceof Date ? v.toISOString() : v;
            }
            return obj;
          })
        : [];
      return { rows: safeRows, columns, error: null };
    } finally {
      conn.release();
    }
  })();

  try {
    return await Promise.race([queryPromise, timeoutPromise]);
  } catch (err) {
    // Never expose raw MySQL errors to client
    const msg = err.message.includes('timed out')
      ? 'Query timed out. Simplify your query or check for infinite loops.'
      : 'Query execution failed. Check your SQL syntax.';
    return { rows: [], columns: [], error: msg };
  }
}
