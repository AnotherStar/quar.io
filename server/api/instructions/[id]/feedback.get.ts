import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const id = getRouterParam(event, 'id')!
  const instr = await prisma.instruction.findFirst({ where: { id, tenantId: tenant.id }, select: { id: true } })
  if (!instr) throw createError({ statusCode: 404 })

  const items = await prisma.blockFeedback.findMany({
    where: { instructionId: id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: { id: true, blockId: true, kind: true, comment: true, createdAt: true }
  })
  const byBlock = await prisma.blockFeedback.groupBy({
    by: ['blockId', 'kind'],
    where: { instructionId: id },
    _count: { _all: true }
  })
  return { items, byBlock: byBlock.map((r) => ({ blockId: r.blockId, kind: r.kind, count: r._count._all })) }
})
