const MAX_QUERY_LENGTH = parseInt(process.env.EXEC_MAX_QUERY_LENGTH || '5000', 10)
const MAX_LIMIT = parseInt(process.env.EXEC_MAX_RESULT_ROWS || '100', 10)

const BLOCKED = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE',
  'GRANT', 'REVOKE', 'CALL', 'SET', 'USE', 'SHOW', 'DESCRIBE', 'EXPLAIN',
  'ANALYZE', 'LOAD\\s+DATA', 'INTO\\s+OUTFILE', 'INFORMATION_SCHEMA',
  'PERFORMANCE_SCHEMA', 'MYSQL\\.', 'SYS\\.',
]

function hasComments(sql) {
  return /(--|\/\*)/.test(sql)
}

function sanitizeIncomingQuery(query) {
  const raw = String(query || '').trim()
  if (!raw) return { ok: false, error: 'Query must be a non-empty string.' }
  if (raw.length > MAX_QUERY_LENGTH) return { ok: false, error: `Query exceeds ${MAX_QUERY_LENGTH} characters.` }
  if (hasComments(raw)) return { ok: false, error: 'Comments are not allowed in queries.' }
  const semis = (raw.match(/;/g) || []).length
  if (semis > 1) return { ok: false, error: 'Multiple statements are not allowed.' }
  if (semis === 1 && !/;\s*$/.test(raw)) return { ok: false, error: 'Semicolon is only allowed at the end.' }
  const cleaned = raw.replace(/;\s*$/, '').trim()
  if (!/^SELECT\b/i.test(cleaned)) return { ok: false, error: 'Only SELECT queries are allowed.' }
  if (/^\s*WITH\b/i.test(cleaned)) return { ok: false, error: 'WITH/CTE queries are currently blocked for safety.' }
  const blockedRegex = new RegExp(`\\b(${BLOCKED.join('|')})\\b`, 'i')
  if (blockedRegex.test(cleaned)) return { ok: false, error: 'Query contains blocked SQL keywords for safety.' }
  return { ok: true, cleaned }
}

function enforceLimit(sql) {
  const text = sql.trim()
  const limitPattern = /\bLIMIT\s+(\d+)\b/i
  const match = text.match(limitPattern)
  if (!match) return `${text} LIMIT ${MAX_LIMIT}`
  const requested = parseInt(match[1], 10)
  if (!Number.isFinite(requested) || requested <= MAX_LIMIT) return text
  return text.replace(limitPattern, `LIMIT ${MAX_LIMIT}`)
}

export function validateAndPrepareStudentQuery(query) {
  const base = sanitizeIncomingQuery(query)
  if (!base.ok) return { valid: false, error: base.error }
  const prepared = enforceLimit(base.cleaned)
  return { valid: true, query: prepared, maxRows: MAX_LIMIT }
}

export function validateQuery(query) {
  return validateAndPrepareStudentQuery(query)
}

