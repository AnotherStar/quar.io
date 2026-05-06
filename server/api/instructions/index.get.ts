import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [instructions, viewCounts] = await Promise.all([
    prisma.instruction.findMany({
      where: { tenantId: tenant.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        shortId: true,
        title: true,
        language: true,
        status: true,
        updatedAt: true,
        publishedAt: true,
        productGroupId: true
      }
    }),
    prisma.viewEvent.groupBy({
      by: ['instructionId'],
      where: {
        instruction: { tenantId: tenant.id },
        type: 'PAGE_VIEW',
        createdAt: { gte: since }
      },
      _count: { _all: true }
    })
  ])
  const countByInstruction = Object.fromEntries(
    viewCounts.map((r) => [r.instructionId, r._count._all])
  )
  return {
    instructions: instructions.map((i) => ({
      ...i,
      views30d: countByInstruction[i.id] ?? 0
    }))
  }
})
