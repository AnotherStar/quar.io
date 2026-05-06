import { PrismaClient } from '@prisma/client'
import { AsyncLocalStorage } from 'node:async_hooks'

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

interface QueryTiming { ms: number; target: string }
interface RequestTimings { queries: QueryTiming[] }

const timingStore = new AsyncLocalStorage<RequestTimings>()

function makePrisma() {
  const client = new PrismaClient({ log: ['warn', 'error'] })

  // $use runs in the caller's async context, so AsyncLocalStorage is still
  // active here (unlike the $on('query') event listener, which fires from
  // an IO callback context where ALS is detached).
  client.$use(async (params, next) => {
    const t0 = performance.now()
    try {
      return await next(params)
    } finally {
      const ms = performance.now() - t0
      const bucket = timingStore.getStore()
      if (bucket) {
        bucket.queries.push({ ms, target: `${params.model ?? '?'}.${params.action}` })
      }
    }
  })
  return client
}

export const prisma = globalThis.__prisma ?? makePrisma()
if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma

export function resetPrismaTimings() {
  timingStore.enterWith({ queries: [] })
}

export function getPrismaTimings(): RequestTimings {
  return timingStore.getStore() ?? { queries: [] }
}
