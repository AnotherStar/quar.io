// Aggregated analytics for the dashboard view of one instruction.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const id = getRouterParam(event, 'id')!
  const instr = await prisma.instruction.findFirst({ where: { id, tenantId: tenant.id }, select: { id: true } })
  if (!instr) throw createError({ statusCode: 404 })

  const since = dayjs().subtract(30, 'day').toDate()

  const [pageViews, uniqueSessions, byCountry, byDevice, avgScroll, feedbackByKind, byDay] = await Promise.all([
    prisma.viewEvent.count({ where: { instructionId: id, type: 'PAGE_VIEW', createdAt: { gte: since } } }),
    prisma.viewEvent
      .groupBy({ by: ['sessionId'], where: { instructionId: id, type: 'PAGE_VIEW', createdAt: { gte: since } } })
      .then((rows) => rows.length),
    prisma.viewEvent.groupBy({
      by: ['country'],
      where: { instructionId: id, type: 'PAGE_VIEW', createdAt: { gte: since } },
      _count: { _all: true }
    }),
    prisma.viewEvent.groupBy({
      by: ['deviceType'],
      where: { instructionId: id, type: 'PAGE_VIEW', createdAt: { gte: since } },
      _count: { _all: true }
    }),
    prisma.viewEvent.aggregate({
      where: { instructionId: id, type: 'PAGE_LEAVE', createdAt: { gte: since } },
      _avg: { scrollDepth: true, durationMs: true }
    }),
    prisma.blockFeedback.groupBy({
      by: ['kind'],
      where: { instructionId: id, createdAt: { gte: since } },
      _count: { _all: true }
    }),
    prisma.$queryRaw<Array<{ day: Date; views: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS views
      FROM "ViewEvent"
      WHERE "instructionId" = ${id}
        AND "type" = 'PAGE_VIEW'
        AND "createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 1
    `
  ])

  return {
    range: { from: since, to: new Date() },
    totals: {
      pageViews,
      uniqueSessions,
      avgScrollDepth: avgScroll._avg.scrollDepth ?? 0,
      avgDurationMs: avgScroll._avg.durationMs ?? 0
    },
    byCountry: byCountry.map((r) => ({ country: r.country ?? 'Unknown', count: r._count._all })),
    byDevice: byDevice.map((r) => ({ deviceType: r.deviceType ?? 'unknown', count: r._count._all })),
    feedbackByKind: feedbackByKind.map((r) => ({ kind: r.kind, count: r._count._all })),
    byDay: byDay.map((r) => ({ day: r.day, views: Number(r.views) }))
  }
})
