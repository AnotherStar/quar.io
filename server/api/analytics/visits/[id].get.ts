// Detailed view of a single visit. Returns the Visit row, its goals, and the
// raw block-level event timeline for drill-down. Tenant-scoped.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const id = getRouterParam(event, 'id')!

  const visit = await prisma.visit.findFirst({
    where: { id, instruction: { tenantId: tenant.id } },
    include: {
      instruction: { select: { id: true, slug: true, title: true } },
      goals: { orderBy: { createdAt: 'asc' } }
    }
  })
  if (!visit) throw createError({ statusCode: 404 })

  // Pull raw events for this visit's session within the visit window.
  // (Visit doesn't directly own ViewEvent rows — we resolve by sessionId +
  // instructionId + time range so a returning visitor's events don't leak
  // across visits.)
  const events = await prisma.viewEvent.findMany({
    where: {
      sessionId: visit.sessionId,
      instructionId: visit.instructionId,
      createdAt: {
        gte: visit.startedAt,
        lte: visit.endedAt ?? visit.lastEventAt
      }
    },
    orderBy: { createdAt: 'asc' },
    take: 500,
    select: {
      id: true,
      type: true,
      blockId: true,
      durationMs: true,
      scrollDepth: true,
      createdAt: true
    }
  })

  // Per-block dwell summary derived from BLOCK_DWELL events.
  const blockDwell = new Map<string, { totalMs: number; views: number }>()
  for (const e of events) {
    if (!e.blockId) continue
    const cur = blockDwell.get(e.blockId) ?? { totalMs: 0, views: 0 }
    if (e.type === 'BLOCK_VIEW') cur.views += 1
    if (e.type === 'BLOCK_DWELL') cur.totalMs += e.durationMs ?? 0
    blockDwell.set(e.blockId, cur)
  }

  return {
    visit,
    events,
    blockDwell: Array.from(blockDwell.entries())
      .map(([blockId, v]) => ({ blockId, ...v }))
      .sort((a, b) => b.totalMs - a.totalMs)
  }
})
