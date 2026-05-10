import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { qrUpdateSchema } from '~~/shared/schemas/qrCode'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, qrUpdateSchema.parse)

  const code = await prisma.activationQrCode.findFirst({
    where: { id, tenantId: tenant.id },
    select: { id: true, instructionId: true }
  })
  if (!code) throw createError({ statusCode: 404, statusMessage: 'QR-код не найден' })

  const data: { instructionId?: string | null; boundAt?: Date | null; notes?: string | null } = {}

  if (body.instructionId !== undefined) {
    if (body.instructionId === null) {
      data.instructionId = null
      data.boundAt = null
    } else {
      const target = await prisma.instruction.findFirst({
        where: { id: body.instructionId, tenantId: tenant.id },
        select: { id: true }
      })
      if (!target) throw createError({ statusCode: 400, statusMessage: 'Инструкция не найдена' })
      data.instructionId = target.id
      // Preserve original boundAt if already bound to the same instruction;
      // otherwise stamp now.
      if (code.instructionId !== target.id) data.boundAt = new Date()
    }
  }

  if (body.notes !== undefined) data.notes = body.notes

  const updated = await prisma.activationQrCode.update({
    where: { id },
    data,
    include: {
      instruction: {
        select: { id: true, slug: true, title: true, status: true, productBarcode: true }
      }
    }
  })

  return { code: updated }
})
