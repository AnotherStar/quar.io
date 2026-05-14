// Возобновление PAUSED-джоба обратно в очередь.
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
  if (job.status !== 'PAUSED') {
    throw createError({
      statusCode: 409,
      statusMessage: 'Возобновить можно только задачу на паузе'
    })
  }

  const updated = await prisma.instructionImportJob.update({
    where: { id },
    data: { status: 'QUEUED' },
    include: { instruction: { select: { id: true, title: true, slug: true } } }
  })
  tickInstructionImportRunner()
  return { job: serializeInstructionImportJob(updated) }
})
