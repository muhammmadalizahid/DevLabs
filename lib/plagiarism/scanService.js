import { supabaseAdmin } from '@/lib/db/supabase'
import { findSimilarPairs } from '@/lib/plagiarism/simple'
import { cacheGet, cacheSet, withInFlight } from '@/lib/cache/runtimeCache'

const SCAN_TTL_SEC = parseInt(process.env.PLAGIARISM_SCAN_CACHE_TTL_SEC || '300', 10)

function scanCacheKey(testId, threshold) {
  return `plagiarism:scan:${testId}:${threshold}`
}

async function getSubmissionAnswerItems(testId) {
  const { data: submissions } = await supabaseAdmin.from('submissions').select('id').eq('test_id', testId)
  const submissionIds = (submissions || []).map((s) => s.id)
  if (submissionIds.length === 0) return []
  const { data: answers } = await supabaseAdmin
    .from('submission_answers')
    .select('id, submission_id, query_text')
    .in('submission_id', submissionIds)
  return (answers || []).filter((x) => x.query_text && x.query_text.trim())
}

async function enrichWithFlags(testId, pairs) {
  const { data: flags } = await supabaseAdmin
    .from('plagiarism_flags')
    .select('test_id, a_submission_id, b_submission_id, status, reviewer_id, reviewed_at, score')
    .eq('test_id', testId)

  const flagMap = new Map()
  for (const f of flags ?? []) {
    const a = f.a_submission_id?.toString()
    const b = f.b_submission_id?.toString()
    if (!a || !b) continue
    const key = a < b ? `${a}:${b}` : `${b}:${a}`
    flagMap.set(key, f)
  }

  return pairs.map((p) => {
    const a = p.a.submission_id?.toString()
    const b = p.b.submission_id?.toString()
    const key = a && b ? (a < b ? `${a}:${b}` : `${b}:${a}`) : null
    return { ...p, flag: key ? (flagMap.get(key) ?? null) : null }
  })
}

export async function computeAndCacheScan(testId, threshold = 0.7) {
  const items = await getSubmissionAnswerItems(testId)
  const pairs = items.length > 0 ? await enrichWithFlags(testId, findSimilarPairs(items, threshold)) : []
  const payload = { pairs, generated_at: new Date().toISOString() }
  await cacheSet(scanCacheKey(testId, threshold), payload, SCAN_TTL_SEC)
  return payload
}

export async function getCachedScan(testId, threshold = 0.7) {
  return cacheGet(scanCacheKey(testId, threshold))
}

export function triggerAsyncScan(testId, threshold = 0.7) {
  return withInFlight(`plagiarism:recompute:${testId}:${threshold}`, () => computeAndCacheScan(testId, threshold))
}

