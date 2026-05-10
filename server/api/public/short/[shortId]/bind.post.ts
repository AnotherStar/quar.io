import { requireUser } from '~~/server/utils/auth'
import { roleAtLeast } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { qrBindSchema } from '~~/shared/schemas/qrCode'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const shortId = getRouterParam(event, 'shortId')!
  const body = await readValidatedBody(event, qrBindSchema.parse)

  const qrCode = await prisma.activationQrCode.findUnique({
    where: { shortId },
    include: { instruction: { select: { slug: true, status: true } } }
  })
  if (!qrCode) throw createError({ statusCode: 404, statusMessage: 'QR-код не найден' })

  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId: qrCode.tenantId } },
    select: { role: true }
  })
  if (!membership || !roleAtLeast(membership.role, 'EDITOR')) {
    throw createError({ statusCode: 403, statusMessage: 'Нет прав на привязку этого QR' })
  }

  if (qrCode.instructionId) {
    if (!qrCode.instruction || qrCode.instruction.status !== 'PUBLISHED') {
      throw createError({ statusCode: 409, statusMessage: 'QR уже привязан, но инструкция не опубликована' })
    }
    return { instruction: { slug: qrCode.instruction.slug }, alreadyBound: true }
  }

  // 1. Explicit instructionId path: user picked an instruction from a modal
  //    after scanning a barcode the system didn't recognise. We accept it
  //    even if PUBLISHED — and write the barcode onto it if missing.
  if (body.instructionId) {
    const target = await prisma.instruction.findFirst({
      where: { id: body.instructionId, tenantId: qrCode.tenantId },
      select: { id: true, slug: true, title: true, status: true, productBarcode: true, publishedVersionId: true }
    })
    if (!target) {
      throw createError({ statusCode: 404, statusMessage: 'Инструкция не найдена' })
    }
    if (target.productBarcode && target.productBarcode !== body.barcode) {
      throw createError({ statusCode: 409, statusMessage: 'У этой инструкции уже указан другой ШК' })
    }
    if (target.status !== 'PUBLISHED' || !target.publishedVersionId) {
      throw createError({ statusCode: 409, statusMessage: 'Инструкция не опубликована — сначала опубликуйте её' })
    }

    if (!target.productBarcode) {
      const taken = await prisma.instruction.findUnique({
        where: { tenantId_productBarcode: { tenantId: qrCode.tenantId, productBarcode: body.barcode } },
        select: { id: true }
      })
      if (taken && taken.id !== target.id) {
        throw createError({ statusCode: 409, statusMessage: 'Этот ШК уже привязан к другой инструкции' })
      }
      await prisma.instruction.update({
        where: { id: target.id },
        data: { productBarcode: body.barcode }
      })
    }

    const result = await prisma.activationQrCode.updateMany({
      where: { id: qrCode.id, instructionId: null },
      data: { instructionId: target.id, boundAt: new Date() }
    })
    if (!result.count) {
      throw createError({ statusCode: 409, statusMessage: 'QR уже привязали. Обновите страницу.' })
    }
    return { instruction: { id: target.id, slug: target.slug, title: target.title }, alreadyBound: false }
  }

  // 2. Implicit path: find a PUBLISHED instruction that already has this barcode
  const instruction = await prisma.instruction.findFirst({
    where: {
      tenantId: qrCode.tenantId,
      productBarcode: body.barcode,
      status: 'PUBLISHED',
      publishedVersionId: { not: null }
    },
    select: { id: true, slug: true, title: true }
  })
  if (!instruction) {
    throw createError({ statusCode: 404, statusMessage: 'Опубликованная инструкция с таким ШК не найдена' })
  }

  const result = await prisma.activationQrCode.updateMany({
    where: { id: qrCode.id, instructionId: null },
    data: {
      instructionId: instruction.id,
      boundAt: new Date()
    }
  })

  if (!result.count) {
    throw createError({ statusCode: 409, statusMessage: 'QR уже привязали. Обновите страницу.' })
  }

  return { instruction, alreadyBound: false }
})
