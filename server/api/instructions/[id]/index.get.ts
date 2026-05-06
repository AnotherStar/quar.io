import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const id = getRouterParam(event, 'id')!
  const instruction = await prisma.instruction.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      sectionAttachments: { include: { section: true }, orderBy: { position: 'asc' } },
      moduleAttachments: { include: { tenantModuleConfig: { include: { module: true } } }, orderBy: { position: 'asc' } },
      versions: { orderBy: { versionNumber: 'desc' }, take: 10, select: { id: true, versionNumber: true, changelog: true, createdAt: true } },
      reviewRequests: { orderBy: { createdAt: 'desc' }, take: 5 }
    }
  })
  if (!instruction) throw createError({ statusCode: 404 })
  return { instruction }
})
