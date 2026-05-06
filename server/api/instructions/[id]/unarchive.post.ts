// Unarchive: restore an archived instruction. Sends it back to DRAFT —
// user can publish again if they want. Plan-limit applies on unarchive
// (counts against the active-instructions cap).
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeatures } from '~~/server/utils/plan'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!

  const instr = await prisma.instruction.findFirst({ where: { id, tenantId: tenant.id } })
  if (!instr) throw createError({ statusCode: 404 })
  if (instr.status !== 'ARCHIVED') {
    throw createError({ statusCode: 400, statusMessage: 'Инструкция не в архиве' })
  }

  const features = effectiveFeatures(tenant)
  if (features.maxInstructions !== -1) {
    const activeCount = await prisma.instruction.count({
      where: { tenantId: tenant.id, status: { not: 'ARCHIVED' } }
    })
    if (activeCount >= features.maxInstructions) {
      throw createError({
        statusCode: 402,
        statusMessage: `Достигнут лимит активных инструкций (${features.maxInstructions}). Архивируйте другую или обновите тариф.`
      })
    }
  }

  const updated = await prisma.instruction.update({
    where: { id },
    data: { status: 'DRAFT', archivedAt: null }
  })
  return { instruction: updated }
})
