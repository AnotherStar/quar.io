// Помечает модуль «просмотренным» для текущего user×tenant. После этого
// /api/modules/badges перестаёт показывать счётчик для этого кода до тех
// пор, пока не появятся новые записи.
import { z } from 'zod'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { BADGE_MODULE_CODES } from '~~/shared/constants/moduleBadges'

const bodySchema = z.object({
  code: z.enum(BADGE_MODULE_CODES)
})

export default defineEventHandler(async (event) => {
  const { user, tenant } = await requireTenant(event)
  const { code } = bodySchema.parse(await readBody(event))
  const now = new Date()
  await prisma.moduleSeen.upsert({
    where: { userId_tenantId_moduleCode: { userId: user.id, tenantId: tenant.id, moduleCode: code } },
    update: { lastSeenAt: now },
    create: { userId: user.id, tenantId: tenant.id, moduleCode: code, lastSeenAt: now }
  })
  return { ok: true }
})
