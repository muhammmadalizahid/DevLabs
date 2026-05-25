// Simple token-bucket style in-memory rate limiter
const buckets = new Map()

export function checkRateLimit(key, limit = 60, windowMs = 60_000) {
  const now = Date.now()
  const entry = buckets.get(key) || { count: 0, start: now }
  if (now - entry.start > windowMs) {
    buckets.set(key, { count: 1, start: now })
    return { limited: false, remaining: limit - 1 }
  }
  if (entry.count >= limit) return { limited: true, remaining: 0 }
  entry.count++
  buckets.set(key, entry)
  return { limited: false, remaining: limit - entry.count }
}

export function keyForReq(req, fallback = 'anon') {
  try {
    // Use user id if available
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.ip || fallback
    return String(ip)
  } catch (err) {
    return fallback
  }
}

export default { checkRateLimit, keyForReq }
