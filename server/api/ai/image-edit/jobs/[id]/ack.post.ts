// POST /api/ai/image-edit/jobs/:id/ack
// Помечает завершённый джоб как «увиденный» (пользователь принял решение —
// оставить или заменить). После ack джоб больше не попадает в /jobs и
// модалка «было → стало» не покажется повторно.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'job id required' })

  const job = await prisma.aiImageEditJob.findFirst({
    where: { id, tenantId: tenant.id, userId: user.id },
    select: { id: true, status: true, acknowledgedAt: true }
  })
  if (!job) throw createError({ statusCode: 404, statusMessage: 'Job not found' })

  // PENDING/PROCESSING нечего ack-ать — модалка покажется только при
  // терминальном статусе.
  if (job.status !== 'SUCCEEDED' && job.status !== 'FAILED') {
    throw createError({ statusCode: 409, statusMessage: 'Job not finished yet' })
  }

  if (!job.acknowledgedAt) {
    await prisma.aiImageEditJob.update({
      where: { id },
      data: { acknowledgedAt: new Date() }
    })
  }

  return { ok: true }
})
