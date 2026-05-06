import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const id = getRouterParam(event, 'id')!
  const exists = await prisma.instruction.findFirst({ where: { id, tenantId: tenant.id }, select: { id: true } })
  if (!exists) throw createError({ statusCode: 404 })
  const versions = await prisma.instructionVersion.findMany({
    where: { instructionId: id },
    orderBy: { versionNumber: 'desc' },
    select: { id: true, versionNumber: true, changelog: true, createdAt: true, createdById: true }
  })
  return { versions }
})
