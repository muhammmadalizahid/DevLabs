const memory = new Map()
const inflight = new Map()

let redisClient = null
let redisReady = false
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

async function getRedisClient() {
  if (getUpstashConfig()) return null
  if (redisReady || redisDisabled) return redisClient
  redisReady = true
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

function now() {
  return Date.now()
}

export async function cacheGet(key) {
  const local = memory.get(key)
  if (local && local.expiresAt > now()) return local.value
  if (local) memory.delete(key)

  const upstashValue = await upstash('GET', key)
  if (upstashValue) {
    try {
      return JSON.parse(upstashValue)
    } catch {
      return null
    }
  }

  const redis = await getRedisClient()
  if (!redis) return null
  try {
    const raw = await redis.get(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function cacheSet(key, value, ttlSec) {
  memory.set(key, { value, expiresAt: now() + ttlSec * 1000 })

  try {
    await upstash('SETEX', key, ttlSec, JSON.stringify(value))
  } catch {}

  const redis = await getRedisClient()
  if (!redis) return
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSec)
  } catch {}
}

export function withInFlight(key, create) {
  if (inflight.has(key)) return inflight.get(key)
  const p = Promise.resolve()
    .then(create)
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}
