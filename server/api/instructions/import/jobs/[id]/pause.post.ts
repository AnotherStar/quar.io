// Пауза джоба массового импорта. Доступна только для QUEUED — после старта
// обработки остановить уже нельзя (см. AGENTS-обсуждение feature).
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { serializeInstructionImportJob } from '~~/server/utils/instructionImportRunner'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!

  const job = await prisma.instructionImportJob.findFirst({
    where: { id, tenantId: tenant.id }
  })
  if (!job) throw createError({ statusCode: 404 })
  if (job.status !== 'QUEUED') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Поставить на паузу можно только задачу в очереди'
    })
  }

  const updated = await prisma.instructionImportJob.update({
    where: { id },
    data: { status: 'PAUSED' },
    include: { instruction: { select: { id: true, title: true, slug: true } } }
  })
  return { job: serializeInstructionImportJob(updated) }
})
