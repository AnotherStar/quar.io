import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const profile = await prisma.tenantLegalProfile.findUnique({
    where: { tenantId: tenant.id }
  })
  const documents = await prisma.legalDocumentVersion.findMany({
    where: { tenantId: tenant.id, archivedAt: null },
    orderBy: [{ type: 'asc' }, { publishedAt: 'desc' }]
  })

  return { profile, documents }
})
