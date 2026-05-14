// Per-request timing for /api/* endpoints. Logs total wall time + how much
// of it was spent in Prisma queries. Helps separate network/DB latency from
// app-code latency.
import { performance } from 'node:perf_hooks'
import { getPrismaTimings, resetPrismaTimings } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const url = event.node.req.url || ''
  if (!url.startsWith('/api/')) return

  resetPrismaTimings()
  const t0 = performance.now()

  event.node.res.on('finish', () => {
    const total = performance.now() - t0
    const t = getPrismaTimings()
    const dbTotal = t.queries.reduce((s, q) => s + q.ms, 0)
    // Query timings are summed, so parallel Prisma calls can exceed wall time.
    // Keep the useful signal without printing confusing negative app time.
    const appMs = Math.max(0, total - dbTotal)
    const summary = `${event.node.req.method} ${url} → ${event.node.res.statusCode}  total=${total.toFixed(0)}ms  db(sum)=${dbTotal.toFixed(0)}ms (${t.queries.length} queries)  app≈${appMs.toFixed(0)}ms`
    console.log(`[timing] ${summary}`)
    if (t.queries.length && total > 500) {
      // Per-query breakdown only when slow, to avoid log spam
      for (const q of t.queries.sort((a, b) => b.ms - a.ms).slice(0, 5)) {
        console.log(`[timing]   ${q.ms.toFixed(0)}ms  ${q.target.slice(0, 80)}`)
      }
    }
  })
})
