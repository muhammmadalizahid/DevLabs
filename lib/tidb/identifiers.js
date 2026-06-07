export function sanitizeIdentifier(name, maxLen = 50) {
  const cleaned = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLen)
  if (!cleaned) throw new Error('Invalid empty identifier after sanitization')
  return cleaned
}

export function quoteIdentifier(name) {
  return `\`${String(name).replace(/`/g, '``')}\``
}

export function datasetToken(datasetId) {
  const token = String(datasetId || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 18)
  if (!token) throw new Error('Invalid dataset id for physical table naming')
  return token
}

export function physicalTableName(datasetId, originalTableName) {
  return `ds_${datasetToken(datasetId)}_${sanitizeIdentifier(originalTableName)}`
}

export function tempTableName(datasetId, originalTableName) {
  return `tmp_ds_${datasetToken(datasetId)}_${sanitizeIdentifier(originalTableName)}`
}

