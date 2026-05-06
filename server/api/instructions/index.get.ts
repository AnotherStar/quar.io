import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const instructions = await prisma.instruction.findMany({
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
  })
  return { instructions }
})
