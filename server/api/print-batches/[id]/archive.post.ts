import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!

  const exists = await prisma.printBatch.findFirst({ where: { id, tenantId: tenant.id }, select: { id: true } })
  if (!exists) throw createError({ statusCode: 404 })

  const updated = await prisma.printBatch.update({
    where: { id },
    data: { archivedAt: new Date() }
  })
  return { batch: updated }
})
