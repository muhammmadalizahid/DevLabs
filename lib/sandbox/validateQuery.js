/**
 * SQL keywords that are blocked for security
 * Only SELECT queries are allowed in sandbox
 */
const BLOCKED_KEYWORDS = [
  'DROP',
  'DELETE',
  'UPDATE',
  'INSERT',
  'ALTER',
  'TRUNCATE',
  'CREATE',
  'ATTACH',
  'PRAGMA',
  'REPLACE',
  'EXEC',
  'EXECUTE',
]

/**
 * Validates query for security before execution
 * Ensures only SELECT queries are allowed
 * Blocks dangerous keywords that could modify or destroy data
 * @param {string} query - SQL query to validate
 * @returns {boolean} True if query is valid
 * @throws {Error} If query contains blocked keywords or invalid syntax
 */
export function validateQuery(query) {
  if (!query || typeof query !== 'string') {
    throw new Error('Query must be a non-empty string')
  }

  const trimmed = query.trim()
  const upper = trimmed.toUpperCase()

  // Check for blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    if (upper.includes(keyword)) {
      throw new Error(`Blocked keyword: ${keyword}. Only SELECT queries are allowed.`)
    }
  }

  // Ensure query starts with SELECT
  if (!upper.startsWith('SELECT')) {
    throw new Error('Only SELECT queries are allowed. Query must start with SELECT.')
  }

  return true
}

/**
 * Returns list of blocked keywords for documentation
 */
export function getBlockedKeywords() {
  return BLOCKED_KEYWORDS
}
