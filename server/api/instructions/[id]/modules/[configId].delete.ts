import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const configId = getRouterParam(event, 'configId')!
  await prisma.instructionModuleAttachment.deleteMany({
    where: { instructionId: id, tenantModuleConfigId: configId, instruction: { tenantId: tenant.id } }
  })
  return { ok: true }
})
