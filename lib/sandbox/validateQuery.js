/**
 * Hardened SQL validator for sandbox execution
 * - Allows only a single SELECT statement
 * - Strips comments and string literals before inspection
 * - Blocks top-level dangerous keywords
 */
const BLOCKED_KEYWORDS = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'ATTACH', 'PRAGMA', 'REPLACE', 'EXEC', 'EXECUTE']

function stripCommentsAndStrings(sql) {
  // Remove single-line comments (-- ...)
  let out = sql.replace(/--.*$/gm, ' ')
  // Remove block comments (/* ... */)
  out = out.replace(/\/\*[\s\S]*?\*\//g, ' ')
  // Remove single-quoted and double-quoted string literals
  out = out.replace(/'(?:''|[^'])*'/g, "'")
  out = out.replace(/"(?:\""|[^"])*"/g, '"')
  return out
}

export function validateQuery(query) {
  if (!query || typeof query !== 'string') throw new Error('Query must be a non-empty string')

  // Basic length guard
  if (query.length > 20000) throw new Error('Query too long')

  const cleaned = stripCommentsAndStrings(query)
  let trimmed = cleaned.trim()
  const upper = trimmed.toUpperCase()

  // Disallow multiple statements via semicolon (allow trailing semicolon only)
  const semicolonIndex = upper.indexOf(';')
  if (semicolonIndex >= 0) {
    // If semicolon present and not at very end (allow a single trailing semicolon), reject
    const after = upper.slice(semicolonIndex + 1).trim()
    if (after.length > 0) throw new Error('Multiple statements are not allowed')
    // remove trailing semicolon for further checks
    trimmed = trimmed.replace(/;+\s*$/, '')
  }

  // Ensure the first token is SELECT
  if (!/^\s*SELECT\b/i.test(trimmed)) throw new Error('Only a single SELECT statement is allowed')

  // Block dangerous keywords as standalone words
  const blockedRegex = new RegExp('\\b(' + BLOCKED_KEYWORDS.join('|') + ')\\b', 'i')
  if (blockedRegex.test(trimmed)) throw new Error('Query contains blocked keywords')

  return true
}

export function getBlockedKeywords() {
  return BLOCKED_KEYWORDS
}
