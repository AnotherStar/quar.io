// Analytics ingestion — accepts a batch of events from the public viewer.
// Server enriches with parsed device + (optional) geo before persisting.
import { prisma } from '~~/server/utils/prisma'
import { UAParser } from 'ua-parser-js'
import { z } from 'zod'

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
const batchSchema = z.object({ events: z.array(eventSchema).min(1).max(50) })

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, batchSchema.parse)
  const ua = getRequestHeader(event, 'user-agent') ?? ''
  const parsed = UAParser(ua)
  const country = getRequestHeader(event, 'cf-ipcountry') ?? null    // Cloudflare; null in dev
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
  return { ok: true, accepted: body.events.length }
})
