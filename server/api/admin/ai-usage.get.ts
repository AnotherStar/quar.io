// Глобальная статистика AI-вызовов. НЕ tenant-scoped — только для admin'ов.
// Возвращает сводку за последние 30 дней + список последних событий + топ
// тенантов по расходам.
import { requireAdmin } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const limit = Math.min(200, Math.max(10, Number(query.limit) || 50))
  const since30 = dayjs().subtract(30, 'day').toDate()
  const since7 = dayjs().subtract(7, 'day').toDate()

  const [
    totals30d,
    totals7d,
    totalsAll,
    byStatus30d,
    byFeature30d,
    byTenantRaw,
    recent,
    successCount30d,
    errorCount30d,
    abortedCount30d
  ] = await Promise.all([
    prisma.aiUsageEvent.aggregate({
      where: { createdAt: { gte: since30 } },
      _count: { _all: true },
      _sum: { totalTokens: true, estimatedCostUsd: true, imageCount: true }
    }),
    prisma.aiUsageEvent.aggregate({
      where: { createdAt: { gte: since7 } },
      _count: { _all: true },
      _sum: { totalTokens: true, estimatedCostUsd: true, imageCount: true }
    }),
    prisma.aiUsageEvent.aggregate({
      _count: { _all: true },
      _sum: { totalTokens: true, estimatedCostUsd: true, imageCount: true }
    }),
    prisma.aiUsageEvent.groupBy({
      by: ['status'],
      where: { createdAt: { gte: since30 } },
      _count: { _all: true }
    }),
    prisma.aiUsageEvent.groupBy({
      by: ['feature'],
      where: { createdAt: { gte: since30 } },
      _count: { _all: true },
      _sum: { totalTokens: true, estimatedCostUsd: true, imageCount: true }
    }),
    prisma.aiUsageEvent.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: since30 } },
      _count: { _all: true },
      _sum: { totalTokens: true, estimatedCostUsd: true, imageCount: true },
      orderBy: { _sum: { estimatedCostUsd: 'desc' } },
      take: 15
    }),
    prisma.aiUsageEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        user: { select: { id: true, email: true, name: true } }
      }
    }),
    prisma.aiUsageEvent.count({ where: { createdAt: { gte: since30 }, status: 'success' } }),
    prisma.aiUsageEvent.count({ where: { createdAt: { gte: since30 }, status: 'error' } }),
    prisma.aiUsageEvent.count({ where: { createdAt: { gte: since30 }, status: 'aborted' } })
  ])

  // Подтягиваем имена тенантов для top-N (groupBy возвращает только id).
  const tenantIds = byTenantRaw.map((r) => r.tenantId)
  const tenants = tenantIds.length
    ? await prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true, slug: true }
      })
    : []
  const tenantById = new Map(tenants.map((t) => [t.id, t]))

  return {
    period: {
      since30: since30.toISOString(),
      since7: since7.toISOString()
    },
    totals: {
      last30d: {
        calls: totals30d._count._all,
        tokens: totals30d._sum.totalTokens ?? 0,
        costUsd: totals30d._sum.estimatedCostUsd ?? 0,
        images: totals30d._sum.imageCount ?? 0,
        success: successCount30d,
        error: errorCount30d,
        aborted: abortedCount30d
      },
      last7d: {
        calls: totals7d._count._all,
        tokens: totals7d._sum.totalTokens ?? 0,
        costUsd: totals7d._sum.estimatedCostUsd ?? 0,
        images: totals7d._sum.imageCount ?? 0
      },
      allTime: {
        calls: totalsAll._count._all,
        tokens: totalsAll._sum.totalTokens ?? 0,
        costUsd: totalsAll._sum.estimatedCostUsd ?? 0,
        images: totalsAll._sum.imageCount ?? 0
      }
    },
    byStatus30d: byStatus30d.map((r) => ({ status: r.status, count: r._count._all })),
    byFeature30d: byFeature30d.map((r) => ({
      feature: r.feature,
      calls: r._count._all,
      tokens: r._sum.totalTokens ?? 0,
      costUsd: r._sum.estimatedCostUsd ?? 0,
      images: r._sum.imageCount ?? 0
    })),
    topTenants30d: byTenantRaw.map((r) => ({
      tenantId: r.tenantId,
      tenantName: tenantById.get(r.tenantId)?.name ?? '—',
      tenantSlug: tenantById.get(r.tenantId)?.slug ?? null,
      calls: r._count._all,
      tokens: r._sum.totalTokens ?? 0,
      costUsd: r._sum.estimatedCostUsd ?? 0,
      images: r._sum.imageCount ?? 0
    })),
    recent: recent.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      tenantId: r.tenantId,
      tenantName: r.tenant?.name ?? null,
      tenantSlug: r.tenant?.slug ?? null,
      userId: r.userId,
      userEmail: r.user?.email ?? null,
      userName: r.user?.name ?? null,
      feature: r.feature,
      model: r.model,
      status: r.status,
      errorMessage: r.errorMessage,
      inputTokens: r.inputTokens,
      cachedInputTokens: r.cachedInputTokens,
      outputTokens: r.outputTokens,
      reasoningTokens: r.reasoningTokens,
      totalTokens: r.totalTokens,
      imageCount: r.imageCount,
      estimatedCostUsd: r.estimatedCostUsd,
      durationMs: r.durationMs,
      requestId: r.requestId
    }))
  }
})
