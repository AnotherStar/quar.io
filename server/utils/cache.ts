// Simple in-memory TTL cache, scoped per Nuxt server process.
// Used to skip Session and Membership lookups on every API request when the
// app is talking to a remote/high-latency Postgres.
//
// Trade-off: changes (logout, role change, plan switch) take up to TTL
// seconds to be reflected. Logout + password reset invalidate explicitly;
// other changes wait out the TTL.

interface Entry<V> { value: V; expiresAt: number }

export class TtlCache<K, V> {
  private map = new Map<K, Entry<V>>()
  constructor(private ttlMs: number, private maxSize = 5000) {}

  get(key: K): V | undefined {
    const e = this.map.get(key)
    if (!e) return undefined
    if (e.expiresAt < Date.now()) { this.map.delete(key); return undefined }
    return e.value
  }

  set(key: K, value: V) {
    if (this.map.size >= this.maxSize) {
      // Evict oldest 10% to keep size in check (rough FIFO)
      const drop = Math.ceil(this.maxSize * 0.1)
      let i = 0
      for (const k of this.map.keys()) {
        this.map.delete(k)
        if (++i >= drop) break
      }
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs })
  }

  delete(key: K) { this.map.delete(key) }
  clear() { this.map.clear() }
}

// Singletons reused across the dev process via globalThis to survive HMR.
declare global {
  // eslint-disable-next-line no-var
  var __mo_caches: { session: TtlCache<string, any>; membership: TtlCache<string, any> } | undefined
}

export const sessionCache = (globalThis.__mo_caches?.session ?? new TtlCache<string, any>(60_000))
export const membershipCache = (globalThis.__mo_caches?.membership ?? new TtlCache<string, any>(60_000))

if (!globalThis.__mo_caches) {
  globalThis.__mo_caches = { session: sessionCache, membership: membershipCache }
}
