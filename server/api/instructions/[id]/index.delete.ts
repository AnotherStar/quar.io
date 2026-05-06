import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'OWNER' })
  const id = getRouterParam(event, 'id')!
  const exists = await prisma.instruction.findFirst({ where: { id, tenantId: tenant.id } })
  if (!exists) throw createError({ statusCode: 404 })
  await prisma.instruction.delete({ where: { id } })
  return { ok: true }
})
