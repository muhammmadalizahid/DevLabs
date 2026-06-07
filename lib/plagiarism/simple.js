/**
 * Plagiarism detection helpers:
 * - Normalize/tokenize SQL
 * - Candidate pre-filter using fingerprint buckets
 * - Jaccard similarity only on likely candidates
 */

function normalizeQuery(q) {
  if (!q || typeof q !== 'string') return ''
  return q
    .replace(/--.*$/gm, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/['"].*?['"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function tokenize(q) {
  return normalizeQuery(q).split(/[^a-z0-9_]+/).filter(Boolean)
}

function fingerprint(query) {
  const tokens = tokenize(query)
  const uniq = [...new Set(tokens)].sort()
  const lenBucket = Math.floor(tokens.length / 5)
  const prefix = uniq.slice(0, 6).join('|')
  return { lenBucket, prefix, tokenCount: tokens.length, uniq }
}

function buildCandidatePairs(items) {
  const buckets = new Map()
  for (const item of items) {
    const fp = fingerprint(item.query_text)
    const key = `${fp.lenBucket}:${fp.prefix}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push({ ...item, _fp: fp })
  }

  const seen = new Set()
  const pairs = []
  for (const group of buckets.values()) {
    if (group.length < 2) continue
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i]
        const b = group[j]
        const lo = Math.min(a._fp.tokenCount, b._fp.tokenCount)
        const hi = Math.max(a._fp.tokenCount, b._fp.tokenCount)
        if (hi > 0 && lo / hi < 0.5) continue
        const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`
        if (seen.has(key)) continue
        seen.add(key)
        pairs.push([a, b])
      }
    }
  }
  return pairs
}

export function jaccard(a, b) {
  const sa = new Set(tokenize(a))
  const sb = new Set(tokenize(b))
  if (sa.size === 0 && sb.size === 0) return 1
  const inter = new Set([...sa].filter((x) => sb.has(x))).size
  const union = new Set([...sa, ...sb]).size
  return union === 0 ? 0 : inter / union
}

export function findSimilarPairs(items, threshold = 0.7) {
  const candidates = buildCandidatePairs(items)
  const pairs = []
  for (const [a, b] of candidates) {
    const score = jaccard(a.query_text, b.query_text)
    if (score >= threshold) pairs.push({ a: { id: a.id, submission_id: a.submission_id, query_text: a.query_text }, b: { id: b.id, submission_id: b.submission_id, query_text: b.query_text }, score })
  }
  return pairs
}

export default { normalizeQuery, tokenize, jaccard, findSimilarPairs }

