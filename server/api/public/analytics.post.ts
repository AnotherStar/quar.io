// Analytics ingestion — accepts a batch of events from the public viewer.
// Two outputs per batch:
//   1) ViewEvent rows  — raw stream (drill-down, block-level)
//   2) Visit upsert    — denormalized per-visit aggregate (dashboard read path)
import { prisma } from '~~/server/utils/prisma'
import { UAParser } from 'ua-parser-js'
import { z } from 'zod'
import { getClientIp, hashIp, upsertVisit } from '~~/server/utils/visit'
import { takeToken } from '~~/server/utils/rateLimit'

const eventSchema = z.object({
  instructionId: z.string(),
  versionId: z.string().optional(),
  sessionId: z.string().min(8).max(64),
  type: z.enum(['PAGE_VIEW', 'PAGE_LEAVE', 'BLOCK_VIEW', 'BLOCK_DWELL']),
  blockId: z.string().optional(),
  durationMs: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
  scrollDepth: z.number().int().min(0).max(100).optional(),
  referrer: z.string().max(500).optional(),
  language: z.string().max(10).optional()
})

const metaSchema = z.object({
  timezone: z.string().max(60).optional(),
  screenWidth: z.number().int().min(0).max(20000).optional(),
  screenHeight: z.number().int().min(0).max(20000).optional(),
  viewportWidth: z.number().int().min(0).max(20000).optional(),
  viewportHeight: z.number().int().min(0).max(20000).optional(),
  devicePixelRatio: z.number().min(0).max(10).optional(),
  url: z.string().url().max(2048).optional(),
  isBotClient: z.boolean().optional()
}).optional()

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
  meta: metaSchema
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, batchSchema.parse)

  const ip = getClientIp(event)
  const rlKey = `analytics:${ip ? hashIp(ip) : 'unknown'}`
  if (!takeToken({ key: rlKey, limit: 60, windowMs: 60_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Rate limit exceeded' })
  }

  const ua = getRequestHeader(event, 'user-agent') ?? ''
  const parsed = UAParser(ua)
  const country = getRequestHeader(event, 'cf-ipcountry') ?? null
  const region = getRequestHeader(event, 'cf-region') ?? null
  const city = getRequestHeader(event, 'cf-ipcity') ?? null

  await prisma.viewEvent.createMany({
    data: body.events.map((e) => ({
      instructionId: e.instructionId,
      versionId: e.versionId,
      sessionId: e.sessionId,
      type: e.type,
      blockId: e.blockId,
      durationMs: e.durationMs,
      scrollDepth: e.scrollDepth,
      country,
      region,
      city,
      deviceType: parsed.device?.type ?? 'desktop',
      os: parsed.os?.name,
      browser: parsed.browser?.name,
      referrer: e.referrer,
      language: e.language
    }))
  })

  // Group events by (instructionId, versionId, sessionId) and upsert one Visit
  // per group. In practice the beacon always batches a single visit, but the
  // server is permissive.
  const groups = new Map<string, typeof body.events>()
  for (const e of body.events) {
    const key = `${e.instructionId}::${e.versionId ?? ''}::${e.sessionId}`
    const arr = groups.get(key) ?? []
    arr.push(e)
    groups.set(key, arr)
  }
  for (const [, events] of groups) {
    const first = events[0]!
    try {
      await upsertVisit({
        event,
        instructionId: first.instructionId,
        versionId: first.versionId,
        sessionId: first.sessionId,
        events: events.map((e) => ({
          type: e.type,
          blockId: e.blockId,
          durationMs: e.durationMs,
          scrollDepth: e.scrollDepth,
          referrer: e.referrer
        })),
        meta: body.meta
      })
    } catch (err) {
      // Visit aggregate is best-effort — never break ingestion if it fails.
      console.error('[analytics] upsertVisit failed', err)
    }
  }

  return { ok: true, accepted: body.events.length }
})
