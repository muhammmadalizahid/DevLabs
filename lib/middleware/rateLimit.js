const memoryBuckets = new Map()
let redisClient = null
let redisInit = false
let redisDisabled = false

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/+$/, ''), token }
}

async function upstash(command, ...args) {
  const cfg = getUpstashConfig()
  if (!cfg || redisDisabled) return null
  try {
    const response = await fetch(`${cfg.url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([[command, ...args]]),
      cache: 'no-store',
    })
    if (!response.ok) return null
    const payload = await response.json()
    const result = Array.isArray(payload) ? payload[0] : null
    return result && !result.error ? result.result : null
  } catch {
    return null
  }
}

async function getRedis() {
  if (getUpstashConfig()) return null
  if (redisInit || redisDisabled) return redisClient
  redisInit = true
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null
  try {
    const { default: IORedis } = await import('ioredis')
    redisClient = new IORedis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      reconnectOnError: () => false,
    })
    redisClient.on('error', () => {})
    await redisClient.connect()
    return redisClient
  } catch {
    redisClient = null
    redisDisabled = true
    return null
  }
}

async function checkRateLimitRedis(key, limit, windowMs) {
  const upstashCfg = getUpstashConfig()
  if (upstashCfg) {
    const redisKey = `rl:${key}`
    const count = await upstash('INCR', redisKey)
    if (count == null) return null
    if (Number(count) === 1) {
      await upstash('PEXPIRE', redisKey, windowMs)
    }
    const num = Number(count)
    return { limited: num > limit, remaining: Math.max(0, limit - num) }
  }

  const redis = await getRedis()
  if (!redis) return null
  const redisKey = `rl:${key}`
  try {
    const count = await redis.incr(redisKey)
    if (count === 1) await redis.pexpire(redisKey, windowMs)
    return { limited: count > limit, remaining: Math.max(0, limit - count) }
  } catch {
    return null
  }
}

function checkRateLimitMemory(key, limit, windowMs) {
  const now = Date.now()
  const entry = memoryBuckets.get(key) || { count: 0, start: now }
  if (now - entry.start > windowMs) {
    memoryBuckets.set(key, { count: 1, start: now })
    return { limited: false, remaining: limit - 1 }
  }
  if (entry.count >= limit) return { limited: true, remaining: 0 }
  entry.count++
  memoryBuckets.set(key, entry)
  return { limited: false, remaining: limit - entry.count }
}

export async function checkRateLimit(key, limit = 60, windowMs = 60_000) {
  const redisResult = await checkRateLimitRedis(key, limit, windowMs)
  if (redisResult) return redisResult
  return checkRateLimitMemory(key, limit, windowMs)
}

export function keyForReq(req, fallback = 'anon') {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || req.ip || fallback
    return String(ip)
  } catch {
    return fallback
  }
}

const rateLimitApi = { checkRateLimit, keyForReq }
export default rateLimitApi
