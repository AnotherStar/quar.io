import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

// Сколько свободных непечатанных QR доступно для тиража. UI использует это
// для подсказки на странице /dashboard/print/new и валидации поля «количество».
export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)

  const available = await prisma.activationQrCode.count({
    where: {
      tenantId: tenant.id,
      instructionId: null,
      firstPrintedAt: null
    }
  })

  return { available }
})
