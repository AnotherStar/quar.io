// GET /api/ai/image-edit/jobs
// Возвращает активные джобы текущего пользователя в текущем тенанте:
// - PENDING / PROCESSING — всё, что ещё крутится в фоне;
// - SUCCEEDED / FAILED без acknowledgedAt — результаты, которые надо показать
//   во всплывающей модалке.
// Кросс-tenant утечки нет: requireTenant уже проверил, а в where стоит
// userId — чужие джобы внутри своего же тенанта пользователь тоже не увидит.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })

  const jobs = await prisma.aiImageEditJob.findMany({
    where: {
      tenantId: tenant.id,
      userId: user.id,
      OR: [
        { status: { in: ['PENDING', 'PROCESSING'] } },
        { status: { in: ['SUCCEEDED', 'FAILED'] }, acknowledgedAt: null }
      ]
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      sourceUrl: true,
      prompt: true,
      resultUrl: true,
      errorMessage: true,
      instructionId: true,
      createdAt: true,
      completedAt: true
    }
  })

  return { jobs }
})
