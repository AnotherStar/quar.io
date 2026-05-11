// Per-visit aggregate helpers. Beacon-side enrichment + upsert into Visit
// from a batch of analytics events.
import { createHash } from 'node:crypto'
import { UAParser } from 'ua-parser-js'
import { prisma } from '~~/server/utils/prisma'
import type { H3Event } from 'h3'

const BOT_UA_RE = /(bot|crawl|spider|slurp|preview|headless|monitor|fetch|curl|wget|python-requests|node-fetch|axios|httpclient|lighthouse|pingdom)/i

export interface VisitMeta {
  // First-event metadata, sent once by the beacon
  timezone?: string
  screenWidth?: number
  screenHeight?: number
  viewportWidth?: number
  viewportHeight?: number
  devicePixelRatio?: number
  url?: string                 // current page URL (for UTM)
  entry?: { qrShortId?: string } | null
  isBotClient?: boolean        // client-side hint (navigator.webdriver)
}

export interface VisitEventInput {
  type: 'PAGE_VIEW' | 'PAGE_LEAVE' | 'BLOCK_VIEW' | 'BLOCK_DWELL'
  blockId?: string
  durationMs?: number
  scrollDepth?: number
  referrer?: string
}

export interface UpsertVisitArgs {
  event: H3Event
  instructionId: string
  versionId?: string
  sessionId: string
  events: VisitEventInput[]
  meta?: VisitMeta
}

export function getClientIp(event: H3Event): string | null {
  const fwd = getRequestHeader(event, 'x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return getRequestHeader(event, 'x-real-ip') ?? null
}

export function hashIp(ip: string): string {
  const cfg = useRuntimeConfig()
  return createHash('sha256').update(`${ip}:${cfg.sessionSecret}`).digest('hex')
}

// /24 for IPv4, /48 for IPv6 — coarse enough to not be PII, useful for grouping
export function ipPrefix(ip: string): string {
  if (ip.includes(':')) {
    // IPv6
    const parts = ip.split(':')
    return parts.slice(0, 3).join(':') + '::/48'
  }
  const parts = ip.split('.')
  if (parts.length !== 4) return ip
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`
}

export function isBotUA(ua: string): boolean {
  return BOT_UA_RE.test(ua)
}

// Cookie payload format: JSON {qr,ts} or just the qr shortId for simplicity
export function readEntryCookie(event: H3Event): { qrShortId?: string } | null {
  const raw = getCookie(event, 'mo_entry')
  if (!raw) return null
  try {
    const parsed = JSON.parse(decodeURIComponent(raw))
    if (parsed && typeof parsed === 'object' && typeof parsed.qr === 'string') {
      return { qrShortId: parsed.qr }
    }
  } catch { /* malformed cookie, ignore */ }
  return null
}

interface ParsedEntry {
  entrySource: string | null
  entryQrShortId: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
  utmTerm: string | null
}

export function parseEntry(args: {
  cookieEntry: { qrShortId?: string } | null
  referrer: string | null
  pageUrl: string | null
  tenantSlug?: string | null
}): ParsedEntry {
  const out: ParsedEntry = {
    entrySource: null,
    entryQrShortId: null,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmContent: null,
    utmTerm: null
  }

  if (args.pageUrl) {
    try {
      const u = new URL(args.pageUrl)
      out.utmSource = u.searchParams.get('utm_source')
      out.utmMedium = u.searchParams.get('utm_medium')
      out.utmCampaign = u.searchParams.get('utm_campaign')
      out.utmContent = u.searchParams.get('utm_content')
      out.utmTerm = u.searchParams.get('utm_term')
    } catch { /* malformed url, ignore */ }
  }

  if (args.cookieEntry?.qrShortId) {
    out.entrySource = 'qr'
    out.entryQrShortId = args.cookieEntry.qrShortId
    return out
  }
  if (out.utmSource) {
    out.entrySource = 'utm'
    return out
  }
  if (args.referrer) {
    try {
      const refHost = new URL(args.referrer).host
      const ownHost = args.pageUrl ? new URL(args.pageUrl).host : null
      out.entrySource = ownHost && refHost === ownHost ? 'internal' : 'referral'
    } catch {
      out.entrySource = 'referral'
    }
    return out
  }
  out.entrySource = 'direct'
  return out
}

// Upsert one Visit row and aggregate the batch of events into it.
// Returns the visit id so callers (goal endpoint, conversion hooks) can use it.
export async function upsertVisit(args: UpsertVisitArgs): Promise<string> {
  const { event, instructionId, versionId, sessionId, events, meta } = args

  const ua = getRequestHeader(event, 'user-agent') ?? ''
  const parsedUa = UAParser(ua)
  const ip = getClientIp(event)
  const cookieEntry = readEntryCookie(event)
  const referrer = events.find((e) => e.referrer)?.referrer ?? null
  const entry = parseEntry({
    cookieEntry,
    referrer,
    pageUrl: meta?.url ?? null
  })

  // Derive aggregate deltas from the events
  let dPageViews = 0
  let dDurationMs = 0
  let maxScroll = 0
  let endedAt: Date | null = null
  const newBlocks = new Set<string>()
  for (const e of events) {
    if (e.type === 'PAGE_VIEW') dPageViews += 1
    if (e.type === 'PAGE_LEAVE') {
      dDurationMs += e.durationMs ?? 0
      if ((e.scrollDepth ?? 0) > maxScroll) maxScroll = e.scrollDepth ?? 0
      endedAt = new Date()
    }
    if (e.type === 'BLOCK_VIEW' && e.blockId) newBlocks.add(e.blockId)
  }

  // Pre-check returning: any prior Visit for this sessionId
  const priorVisitCount = await prisma.visit.count({
    where: { sessionId, NOT: { AND: [{ instructionId }, { versionId: versionId ?? '' }] } }
  })
  const isReturning = priorVisitCount > 0

  const isBot = isBotUA(ua) || !!meta?.isBotClient

  const country = getRequestHeader(event, 'cf-ipcountry') ?? null
  const region = getRequestHeader(event, 'cf-region') ?? null
  const city = getRequestHeader(event, 'cf-ipcity') ?? null

  const visit = await prisma.visit.upsert({
    where: {
      sessionId_instructionId_versionId: {
        sessionId,
        instructionId,
        versionId: versionId ?? ''
      }
    },
    create: {
      instructionId,
      versionId: versionId ?? '',
      sessionId,
      pageViews: dPageViews,
      totalDurationMs: dDurationMs,
      activeDurationMs: dDurationMs,
      maxScrollDepth: maxScroll,
      blocksViewed: Array.from(newBlocks),
      endedAt,
      ipHash: ip ? hashIp(ip) : null,
      ipPrefix: ip ? ipPrefix(ip) : null,
      isReturning,
      isBot,
      country,
      region,
      city,
      deviceType: parsedUa.device?.type ?? 'desktop',
      os: parsedUa.os?.name ?? null,
      browser: parsedUa.browser?.name ?? null,
      referrer,
      entrySource: entry.entrySource,
      entryQrShortId: entry.entryQrShortId,
      utmSource: entry.utmSource,
      utmMedium: entry.utmMedium,
      utmCampaign: entry.utmCampaign,
      utmContent: entry.utmContent,
      utmTerm: entry.utmTerm,
      timezone: meta?.timezone ?? null,
      screenWidth: meta?.screenWidth ?? null,
      screenHeight: meta?.screenHeight ?? null,
      viewportWidth: meta?.viewportWidth ?? null,
      viewportHeight: meta?.viewportHeight ?? null,
      devicePixelRatio: meta?.devicePixelRatio ?? null
    },
    update: {
      lastEventAt: new Date(),
      pageViews: { increment: dPageViews },
      totalDurationMs: { increment: dDurationMs },
      activeDurationMs: { increment: dDurationMs },
      ...(maxScroll > 0 ? { maxScrollDepth: { set: maxScroll } } : {}),
      ...(endedAt ? { endedAt } : {})
    },
    select: { id: true, blocksViewed: true, maxScrollDepth: true }
  })

  // blocksViewed merge + maxScrollDepth max: not expressible in a single upsert,
  // so we do a follow-up update only when there is new data.
  const mergedBlocks = new Set<string>([...visit.blocksViewed, ...newBlocks])
  const needsBlockUpdate = mergedBlocks.size !== visit.blocksViewed.length
  const needsScrollUpdate = maxScroll > visit.maxScrollDepth
  if (needsBlockUpdate || needsScrollUpdate) {
    await prisma.visit.update({
      where: { id: visit.id },
      data: {
        ...(needsBlockUpdate ? { blocksViewed: Array.from(mergedBlocks) } : {}),
        ...(needsScrollUpdate ? { maxScrollDepth: maxScroll } : {})
      }
    })
  }

  // Clear entry cookie once consumed
  if (cookieEntry) deleteCookie(event, 'mo_entry', { path: '/' })

  return visit.id
}

// Ensure a Visit exists for (sessionId, instructionId, versionId). Used by the
// goal endpoint when a goal fires before the first PAGE_VIEW flush.
export async function ensureVisit(args: {
  event: H3Event
  instructionId: string
  versionId?: string
  sessionId: string
}): Promise<string> {
  const existing = await prisma.visit.findUnique({
    where: {
      sessionId_instructionId_versionId: {
        sessionId: args.sessionId,
        instructionId: args.instructionId,
        versionId: args.versionId ?? ''
      }
    },
    select: { id: true }
  })
  if (existing) return existing.id
  return upsertVisit({ ...args, events: [] })
}

// Side-effect helper for conversion hooks (warranty/feedback) where we have
// sessionId + instructionId but no Visit yet (or want to add a goal regardless).
export async function recordGoalForVisit(args: {
  instructionId: string
  versionId?: string | null
  sessionId: string | null | undefined
  code: string
  meta?: Record<string, unknown>
}): Promise<void> {
  if (!args.sessionId) return
  const visit = await prisma.visit.findUnique({
    where: {
      sessionId_instructionId_versionId: {
        sessionId: args.sessionId,
        instructionId: args.instructionId,
        versionId: args.versionId ?? ''
      }
    },
    select: { id: true }
  })
  if (!visit) return
  await prisma.visitGoal.create({
    data: {
      visitId: visit.id,
      code: args.code,
      meta: (args.meta ?? undefined) as any
    }
  })
}
