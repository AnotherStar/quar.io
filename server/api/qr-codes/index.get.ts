import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const query = getQuery(event)
  const status = query.status === 'bound' || query.status === 'unbound' ? query.status : 'all'
  const take = Math.min(Math.max(Number(query.take ?? 200), 1), 500)

  const where = {
    tenantId: tenant.id,
    ...(status === 'bound' ? { instructionId: { not: null } } : {}),
    ...(status === 'unbound' ? { instructionId: null } : {})
  }

  const [total, bound, unbound, codes] = await Promise.all([
    prisma.activationQrCode.count({ where: { tenantId: tenant.id } }),
    prisma.activationQrCode.count({ where: { tenantId: tenant.id, instructionId: { not: null } } }),
    prisma.activationQrCode.count({ where: { tenantId: tenant.id, instructionId: null } }),
    prisma.activationQrCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        instruction: {
          select: { id: true, slug: true, title: true, status: true, productBarcode: true }
        }
      }
    })
  ])

  return {
    stats: { total, bound, unbound },
    codes
  }
})
