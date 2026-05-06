import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const sections = await prisma.section.findMany({
    where: { tenantId: tenant.id },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, description: true, content: true, updatedAt: true }
  })
  return { sections }
})
