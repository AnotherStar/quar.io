// Список джобов массового импорта инструкций для текущего tenant'а.
// Клиент дергает это с polling-ом, пока есть активные задачи. Возвращаем
// последние 100 — на UI больше и не нужно, исторические записи теряются
// из таблицы естественным образом.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { serializeInstructionImportJob } from '~~/server/utils/instructionImportRunner'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const jobs = await prisma.instructionImportJob.findMany({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      instruction: { select: { id: true, title: true, slug: true } }
    }
  })
  return { jobs: jobs.map(serializeInstructionImportJob) }
})
