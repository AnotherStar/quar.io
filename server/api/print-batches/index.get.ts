import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import type { PrintBatchListItem, PrintTemplateSnapshot } from '~~/shared/schemas/printBatch'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)

  const batches = await prisma.printBatch.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
    take: 200
  })

  const createdByIds = Array.from(new Set(batches.map((b) => b.createdById).filter((id): id is string => !!id)))
  const users = createdByIds.length
    ? await prisma.user.findMany({ where: { id: { in: createdByIds } }, select: { id: true, email: true } })
    : []
  const emailById = new Map(users.map((u) => [u.id, u.email]))

  const items: PrintBatchListItem[] = batches.map((b) => {
    const snap = (b.templateSnapshot ?? {}) as Partial<PrintTemplateSnapshot>
    return {
      id: b.id,
      templateCode: b.templateCode,
      templateName: snap.name ?? b.templateCode,
      templateSizeMm: {
        width: snap.size?.widthMm ?? 0,
        height: snap.size?.heightMm ?? 0
      },
      count: b.count,
      status: b.status,
      pdfSizeBytes: b.pdfSizeBytes,
      error: b.error,
      createdAt: b.createdAt.toISOString(),
      createdByEmail: b.createdById ? (emailById.get(b.createdById) ?? null) : null,
      archivedAt: b.archivedAt?.toISOString() ?? null
    }
  })

  return { batches: items }
})
