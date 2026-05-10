import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

type StatusFilter = 'all' | 'bound' | 'unbound' | 'printed' | 'unprinted'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const query = getQuery(event)

  const allowed: StatusFilter[] = ['all', 'bound', 'unbound', 'printed', 'unprinted']
  const status: StatusFilter = (allowed.includes(query.status as StatusFilter)
    ? query.status
    : 'all') as StatusFilter
  const take = Math.min(Math.max(Number(query.take ?? 200), 1), 500)
  const skip = Math.max(Number(query.skip ?? 0), 0)
  const q = String(query.q ?? '').trim().slice(0, 80)

  const baseTenant = { tenantId: tenant.id }
  const statusWhere =
    status === 'bound' ? { instructionId: { not: null } }
    : status === 'unbound' ? { instructionId: null }
    : status === 'printed' ? { firstPrintedAt: { not: null } }
    : status === 'unprinted' ? { firstPrintedAt: null }
    : {}
  const searchWhere = q
    ? {
        OR: [
          { shortId: { contains: q, mode: 'insensitive' as const } },
          { instruction: { is: { title: { contains: q, mode: 'insensitive' as const } } } },
          { instruction: { is: { productBarcode: { contains: q, mode: 'insensitive' as const } } } }
        ]
      }
    : {}

  const where = { ...baseTenant, ...statusWhere, ...searchWhere }

  const [stats, total, codes] = await Promise.all([
    Promise.all([
      prisma.activationQrCode.count({ where: baseTenant }),
      prisma.activationQrCode.count({ where: { ...baseTenant, instructionId: { not: null } } }),
      prisma.activationQrCode.count({ where: { ...baseTenant, instructionId: null } }),
      prisma.activationQrCode.count({ where: { ...baseTenant, firstPrintedAt: { not: null } } }),
      prisma.activationQrCode.count({ where: { ...baseTenant, firstPrintedAt: null } })
    ]).then(([total, bound, unbound, printed, unprinted]) => ({
      total, bound, unbound, printed, unprinted
    })),
    prisma.activationQrCode.count({ where }),
    prisma.activationQrCode.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        instruction: {
          select: { id: true, slug: true, title: true, status: true, productBarcode: true }
        }
      }
    })
  ])

  return { stats, total, codes }
})
