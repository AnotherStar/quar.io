// Tenant-wide analytics overview. Aggregates Visit rows across every
// instruction the current tenant owns. Bot visits are excluded by default.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const q = getQuery(event)
  const days = Math.min(365, Math.max(1, Number(q.days ?? 30)))
  const since = dayjs().subtract(days, 'day').toDate()

  const where = {
    isBot: false,
    startedAt: { gte: since },
    instruction: { tenantId: tenant.id }
  }

  const [
    totals,
    uniqueSessions,
    byCountry,
    byDevice,
    byEntrySource,
    byUtmSource,
    goalsByCode,
    topInstructions,
    byDay
  ] = await Promise.all([
    prisma.visit.aggregate({
      where,
      _count: { _all: true },
      _avg: { maxScrollDepth: true, totalDurationMs: true },
      _sum: { pageViews: true }
    }),
    prisma.visit.groupBy({ by: ['sessionId'], where }).then((r) => r.length),
    prisma.visit.groupBy({ by: ['country'], where, _count: { _all: true } }),
    prisma.visit.groupBy({ by: ['deviceType'], where, _count: { _all: true } }),
    prisma.visit.groupBy({ by: ['entrySource'], where, _count: { _all: true } }),
    prisma.visit.groupBy({
      by: ['utmSource'],
      where: { ...where, utmSource: { not: null } },
      _count: { _all: true }
    }),
    prisma.$queryRaw<Array<{ code: string; count: bigint }>>`
      SELECT g."code", COUNT(*)::bigint AS count
      FROM "VisitGoal" g
      JOIN "Visit" v ON v."id" = g."visitId"
      JOIN "Instruction" i ON i."id" = v."instructionId"
      WHERE i."tenantId" = ${tenant.id}
        AND v."startedAt" >= ${since}
        AND v."isBot" = false
      GROUP BY g."code"
      ORDER BY count DESC
    `,
    prisma.$queryRaw<Array<{
      id: string
      slug: string
      title: string
      visits: bigint
      pageViews: bigint
      avgDurationMs: number
    }>>`
      SELECT i."id", i."slug", i."title",
             COUNT(v.id)::bigint AS visits,
             SUM(v."pageViews")::bigint AS "pageViews",
             AVG(v."totalDurationMs")::float AS "avgDurationMs"
      FROM "Visit" v
      JOIN "Instruction" i ON i."id" = v."instructionId"
      WHERE i."tenantId" = ${tenant.id}
        AND v."startedAt" >= ${since}
        AND v."isBot" = false
      GROUP BY i."id", i."slug", i."title"
      ORDER BY visits DESC
      LIMIT 10
    `,
    prisma.$queryRaw<Array<{ day: Date; visits: bigint; pageViews: bigint }>>`
      SELECT date_trunc('day', v."startedAt") AS day,
             COUNT(*)::bigint AS visits,
             SUM(v."pageViews")::bigint AS "pageViews"
      FROM "Visit" v
      JOIN "Instruction" i ON i."id" = v."instructionId"
      WHERE i."tenantId" = ${tenant.id}
        AND v."startedAt" >= ${since}
        AND v."isBot" = false
      GROUP BY 1
      ORDER BY 1
    `
  ])

  return {
    range: { from: since, to: new Date(), days },
    totals: {
      visits: totals._count._all,
      uniqueSessions,
      pageViews: Number(totals._sum.pageViews ?? 0),
      avgScrollDepth: Math.round(totals._avg.maxScrollDepth ?? 0),
      avgDurationMs: Math.round(totals._avg.totalDurationMs ?? 0)
    },
    byCountry: byCountry.map((r) => ({ country: r.country ?? 'Unknown', count: r._count._all })),
    byDevice: byDevice.map((r) => ({ deviceType: r.deviceType ?? 'unknown', count: r._count._all })),
    byEntrySource: byEntrySource.map((r) => ({ source: r.entrySource ?? 'unknown', count: r._count._all })),
    byUtmSource: byUtmSource.map((r) => ({ utmSource: r.utmSource ?? 'unknown', count: r._count._all })),
    goalsByCode: goalsByCode.map((r) => ({ code: r.code, count: Number(r.count) })),
    topInstructions: topInstructions.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      visits: Number(r.visits),
      pageViews: Number(r.pageViews),
      avgDurationMs: Math.round(r.avgDurationMs ?? 0)
    })),
    byDay: byDay.map((r) => ({
      day: r.day,
      visits: Number(r.visits),
      pageViews: Number(r.pageViews)
    }))
  }
})
