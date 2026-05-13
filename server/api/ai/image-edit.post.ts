// POST /api/ai/image-edit
// Создаёт асинхронный AiImageEditJob и сразу возвращает его id. Реальный
// запрос в OpenAI выполняется в фоне в startImageEditJob — это занимает ~1
// минуту, и держать клиентское соединение всё это время плохо: разрывы,
// таймауты прокси и непонятный UX. Клиент поллит /api/ai/image-edit/jobs,
// чтобы узнать о завершении.
import { z } from 'zod'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { startImageEditJob } from '~~/server/utils/imageEditJob'

const BodySchema = z.object({
  imageUrl: z.string().min(1),
  prompt: z.string().min(3).max(2000),
  instructionId: z.string().min(1).optional()
})

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, BodySchema.parse)

  // Если передан instructionId — он должен принадлежать текущему тенанту.
  // Это позволяет позже увести пользователя «домой» к нужной инструкции по
  // клику «Заменить», но не должно стать утечкой кросс-tenant id.
  if (body.instructionId) {
    const owns = await prisma.instruction.findFirst({
      where: { id: body.instructionId, tenantId: tenant.id },
      select: { id: true }
    })
    if (!owns) {
      throw createError({ statusCode: 404, statusMessage: 'Instruction not found' })
    }
  }

  const job = await prisma.aiImageEditJob.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      instructionId: body.instructionId ?? null,
      status: 'PENDING',
      sourceUrl: body.imageUrl,
      prompt: body.prompt
    },
    select: { id: true, status: true, createdAt: true }
  })

  startImageEditJob(job.id)

  return { jobId: job.id, status: job.status }
})
