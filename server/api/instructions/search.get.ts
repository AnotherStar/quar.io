import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

// Search instructions by title or slug — used by the linker modal when a
// scanned barcode isn't yet attached to any instruction.
export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const query = getQuery(event)
  const q = String(query.q ?? '').trim().slice(0, 80)
  const take = Math.min(Math.max(Number(query.take ?? 30), 1), 100)

  const instructions = await prisma.instruction.findMany({
    where: {
      tenantId: tenant.id,
      status: { in: ['DRAFT', 'IN_REVIEW', 'PUBLISHED'] },
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { slug: { contains: q, mode: 'insensitive' } }
            ]
          }
        : {})
    },
    orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    take,
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      status: true,
      productBarcode: true,
      publishedAt: true
    }
  })

  return { instructions }
})
