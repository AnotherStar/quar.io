import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const id = getRouterParam(event, 'id')!

  const code = await prisma.activationQrCode.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      instruction: {
        select: { id: true, slug: true, title: true, status: true, productBarcode: true }
      }
    }
  })
  if (!code) throw createError({ statusCode: 404, statusMessage: 'QR-код не найден' })

  return { code }
})
