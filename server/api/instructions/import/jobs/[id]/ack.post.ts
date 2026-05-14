// Подтверждение результата (SUCCEEDED/FAILED) — после клика "ок, видел"
// в тосте/таблице. Перестаём показывать «новый успех» при логине / refresh.
// На статус самой задачи или связанной инструкции не влияет.
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

  if (job.acknowledgedAt) {
    return { job: serializeInstructionImportJob(job) }
  }

  const updated = await prisma.instructionImportJob.update({
    where: { id },
    data: { acknowledgedAt: new Date() },
    include: { instruction: { select: { id: true, title: true, slug: true } } }
  })
  return { job: serializeInstructionImportJob(updated) }
})
