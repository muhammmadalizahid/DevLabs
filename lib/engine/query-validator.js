/**
 * Hardened query validator for engine endpoints.
 * Performs similar checks to sandbox validator: strips comments/strings,
 * disallows multiple statements, enforces single SELECT and blocks dangerous keywords.
 */
const BLOCKED_KEYWORDS = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'CREATE', 'ATTACH', 'PRAGMA', 'REPLACE', 'EXEC', 'EXECUTE']

function stripCommentsAndStrings(sql) {
  let out = sql.replace(/--.*$/gm, ' ')
  out = out.replace(/\/\*[\s\S]*?\*\//g, ' ')
  out = out.replace(/'(?:''|[^'])*'/g, "'")
  out = out.replace(/"(?:\\"|[^"])*"/g, '"')
  return out
}

export function validateQuery(query) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return { valid: false, error: 'Query must be a non-empty string' }
  }

  if (query.length > 20000) return { valid: false, error: 'Query too long' }

  const cleaned = stripCommentsAndStrings(query)
  let trimmed = cleaned.trim()
  const upper = trimmed.toUpperCase()

  const semicolonIndex = upper.indexOf(';')
  if (semicolonIndex >= 0) {
    const after = upper.slice(semicolonIndex + 1).trim()
    if (after.length > 0) return { valid: false, error: 'Multiple statements are not allowed' }
    trimmed = trimmed.replace(/;+\s*$/, '')
  }

  if (!/^\s*SELECT\b/i.test(trimmed)) return { valid: false, error: 'Only a single SELECT statement is allowed' }

  const blockedRegex = new RegExp('\\b(' + BLOCKED_KEYWORDS.join('|') + ')\\b', 'i')
  if (blockedRegex.test(trimmed)) return { valid: false, error: 'Query contains blocked keywords' }

  return { valid: true }
}
