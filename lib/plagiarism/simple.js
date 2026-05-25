/**
 * Simple plagiarism detection utilities
 * - Normalizes SQL queries
 * - Computes token Jaccard similarity between queries
 */

function normalizeQuery(q) {
  if (!q || typeof q !== 'string') return ''
  return q
    .replace(/--.*$/gm, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/['"].*?['"]/g, ' ') // remove strings
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function tokenize(q) {
  return normalizeQuery(q).split(/[^a-z0-9_]+/).filter(Boolean)
}

export function jaccard(a, b) {
  const sa = new Set(tokenize(a))
  const sb = new Set(tokenize(b))
  if (sa.size === 0 && sb.size === 0) return 1
  const inter = new Set([...sa].filter(x => sb.has(x))).size
  const union = new Set([...sa, ...sb]).size
  return union === 0 ? 0 : inter / union
}

export function findSimilarPairs(items, threshold = 0.7) {
  // items: [{ id, submission_id, query_text }]
  const pairs = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const s = jaccard(items[i].query_text, items[j].query_text)
      if (s >= threshold) {
        pairs.push({ a: items[i], b: items[j], score: s })
      }
    }
  }
  return pairs
}

export default { normalizeQuery, tokenize, jaccard, findSimilarPairs }
