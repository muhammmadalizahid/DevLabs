import { quoteIdentifier } from '@/lib/tidb/identifiers'

const TABLE_NAME_PATTERNS = [
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-zA-Z0-9_.$-]+)`?/gi,
  /INSERT\s+INTO\s+`?([a-zA-Z0-9_.$-]+)`?/gi,
  /ALTER\s+TABLE\s+`?([a-zA-Z0-9_.$-]+)`?/gi,
  /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?`?([a-zA-Z0-9_.$-]+)`?/gi,
  /REFERENCES\s+`?([a-zA-Z0-9_.$-]+)`?/gi,
]

export function splitSqlStatements(sql = '') {
  return sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function extractTableNames(sqlBundle = '') {
  const names = new Set()
  for (const pattern of TABLE_NAME_PATTERNS) {
    let m
    while ((m = pattern.exec(sqlBundle)) !== null) {
      const raw = (m[1] || '').split('.').pop()
      if (raw) names.add(raw.toLowerCase())
    }
  }
  return [...names]
}

function parseColumnDefinition(line) {
  const trimmed = String(line || '').trim().replace(/,$/, '')
  if (!trimmed) return null
  const upper = trimmed.toUpperCase()
  if (
    upper.startsWith('PRIMARY KEY') ||
    upper.startsWith('UNIQUE KEY') ||
    upper.startsWith('KEY ') ||
    upper.startsWith('INDEX ') ||
    upper.startsWith('CONSTRAINT ') ||
    upper.startsWith('FOREIGN KEY')
  ) {
    return null
  }

  const match = trimmed.match(/^`?([a-zA-Z0-9_.$-]+)`?\s+(.+)$/)
  if (!match) return null
  const name = (match[1] || '').split('.').pop()
  const remainder = match[2] || ''
  const typeMatch = remainder.match(/^([a-zA-Z]+(?:\s*\([^)]+\))?)/)
  const type = typeMatch ? typeMatch[1].replace(/\s+/g, ' ').trim() : 'TEXT'
  const notNull = /\bNOT\s+NULL\b/i.test(remainder)
  const primaryKey = /\bPRIMARY\s+KEY\b/i.test(remainder)
  const defaultMatch = remainder.match(/\bDEFAULT\s+(.+)$/i)
  const defaultValue = defaultMatch ? defaultMatch[1].trim() : null

  return {
    name: name ? name.toLowerCase() : '',
    type,
    not_null: notNull,
    primary_key: primaryKey,
    default_value: defaultValue,
  }
}

export function extractSchemaTables(schemaSql = '') {
  const tables = []
  const pattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-zA-Z0-9_.$-]+)`?\s*\(([\s\S]*?)\)\s*;?/gi
  let match
  while ((match = pattern.exec(schemaSql)) !== null) {
    const rawName = (match[1] || '').split('.').pop()
    if (!rawName) continue
    const body = match[2] || ''
    const lines = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    const columns = lines
      .map(parseColumnDefinition)
      .filter((column) => column && column.name)
    tables.push({
      table: rawName.toLowerCase(),
      columns,
    })
  }
  return tables
}

export function rewriteTableNames(sql, tableMap) {
  let rewritten = String(sql || '')
  const entries = [...tableMap.entries()].sort((a, b) => b[0].length - a[0].length)
  for (const [from, to] of entries) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // NOTE: This is a practical rewrite, not a full SQL parser. For strict SQL correctness,
    // replace with AST-based parser in a future hardening pass.
    const pattern = new RegExp(`(^|[^a-zA-Z0-9_])\\\`?${escaped}\\\`?(?=[^a-zA-Z0-9_]|$)`, 'gi')
    rewritten = rewritten.replace(pattern, (_m, lead) => `${lead}${quoteIdentifier(to)}`)
  }
  return rewritten
}

export function stripOneTrailingSemicolon(sql) {
  return String(sql || '').replace(/;\s*$/, '').trim()
}
