import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const sectionId = getRouterParam(event, 'sectionId')!
  await prisma.instructionSectionAttachment.deleteMany({
    where: { instructionId: id, sectionId, instruction: { tenantId: tenant.id } }
  })
  return { ok: true }
})
