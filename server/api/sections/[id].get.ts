import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const id = getRouterParam(event, 'id')!
  const section = await prisma.section.findFirst({ where: { id, tenantId: tenant.id } })
  if (!section) throw createError({ statusCode: 404 })
  return { section }
})
