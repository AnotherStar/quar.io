// In-memory token-bucket rate limiter. Single-process only — replace with
// Redis/unstorage if the app is ever deployed across multiple instances.

interface Bucket {
  tokens: number
  updatedAt: number
}

const buckets = new Map<string, Bucket>()

interface LimitOptions {
  key: string
  limit: number          // max tokens (= requests per window)
  windowMs: number       // refill window
}

export function takeToken({ key, limit, windowMs }: LimitOptions): boolean {
  const now = Date.now()
  const refillRate = limit / windowMs
  const bucket = buckets.get(key)
  if (!bucket) {
    buckets.set(key, { tokens: limit - 1, updatedAt: now })
    return true
  }
  const elapsed = now - bucket.updatedAt
  bucket.tokens = Math.min(limit, bucket.tokens + elapsed * refillRate)
  bucket.updatedAt = now
  if (bucket.tokens < 1) return false
  bucket.tokens -= 1
  return true
}

// Periodic sweep of stale entries (older than 10 min) to bound memory.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - 10 * 60 * 1000
    for (const [k, v] of buckets) if (v.updatedAt < cutoff) buckets.delete(k)
  }, 60 * 1000).unref?.()
}
