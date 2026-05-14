// Повтор FAILED-джоба. Сбрасываем ошибку, ставим обратно в очередь.
// Если предыдущая попытка успела создать DRAFT-инструкцию, оставляем её —
// воркер перепишет content на втором проходе.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import {
  serializeInstructionImportJob,
  tickInstructionImportRunner
} from '~~/server/utils/instructionImportRunner'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!

  const job = await prisma.instructionImportJob.findFirst({
    where: { id, tenantId: tenant.id }
  })
  if (!job) throw createError({ statusCode: 404 })
  if (job.status !== 'FAILED') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Повторить можно только задачу с ошибкой'
    })
  }

  const updated = await prisma.instructionImportJob.update({
    where: { id },
    data: {
      status: 'QUEUED',
      errorMessage: null,
      stage: null,
      progressPercent: null,
      startedAt: null,
      completedAt: null
    },
    include: { instruction: { select: { id: true, title: true, slug: true } } }
  })
  tickInstructionImportRunner()
  return { job: serializeInstructionImportJob(updated) }
})
