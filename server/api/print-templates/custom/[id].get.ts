// Получение кастомного шаблона печати для редактирования. Доступ — только
// владельцу-тенанту. Чужие приватные и публичные шаблоны редактировать нельзя
// (публичные тоже редактирует только их владелец).
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const id = getRouterParam(event, 'id')!

  const record = await prisma.printTemplateDesign.findFirst({
    where: { id, tenantId: tenant.id, archivedAt: null }
  })
  if (!record) {
    throw createError({ statusCode: 404, statusMessage: 'Шаблон не найден' })
  }

  return {
    id: record.id,
    name: record.name,
    backgroundUrl: record.backgroundUrl,
    backgroundMimeType: record.backgroundMimeType,
    backgroundWidthPx: record.backgroundWidthPx,
    backgroundHeightPx: record.backgroundHeightPx,
    widthMm: record.widthMm,
    heightMm: record.heightMm,
    backgroundXmm: record.backgroundXmm,
    backgroundYmm: record.backgroundYmm,
    backgroundWidthMm: record.backgroundWidthMm,
    backgroundHeightMm: record.backgroundHeightMm,
    qrXmm: record.qrXmm,
    qrYmm: record.qrYmm,
    qrSizeMm: record.qrSizeMm,
    qrDarkColor: record.qrDarkColor,
    qrLightColor: record.qrLightColor,
    qrLightTransparent: record.qrLightTransparent,
    isPublic: record.isPublic
  }
})
