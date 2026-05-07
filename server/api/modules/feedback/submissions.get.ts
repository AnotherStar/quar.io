// List feedback submissions for the current tenant, joined with instruction info.
// Mirrors warranty/registrations.get.ts so the dashboard pattern is consistent.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const items = await prisma.feedbackSubmission.findMany({
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
      fio: r.fio,
      phone: r.phone,
      email: r.email,
      telegram: r.telegram,
      message: r.message,
      createdAt: r.createdAt,
      instruction: r.instruction
    }))
  }
})
