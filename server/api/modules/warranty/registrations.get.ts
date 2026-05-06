// List warranty registrations for the current tenant, joined with instruction info.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const items = await prisma.warrantyRegistration.findMany({
    where: { instruction: { tenantId: tenant.id } },
    orderBy: { createdAt: 'desc' },
    take: 500,
    include: {
      instruction: { select: { id: true, title: true, slug: true } }
    }
  })
  return {
    items: items.map((r) => ({
      id: r.id,
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      customerPhone: r.customerPhone,
      serialNumber: r.serialNumber,
      purchaseDate: r.purchaseDate,
      createdAt: r.createdAt,
      instruction: r.instruction
    }))
  }
})
