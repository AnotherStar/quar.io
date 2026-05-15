// Обновление кастомного шаблона печати. Тот же контракт, что и POST на
// создание (Zod-схема одна). Доступ — EDITOR+ владельца-тенанта.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { customTemplateCode } from '~~/print-templates/custom'
import { printTemplateDesignCreateSchema } from '~~/shared/schemas/printBatch'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, printTemplateDesignCreateSchema.parse)

  // Проверяем владельца до апдейта — чтобы 404 не выдал, что чужой ID
  // существует.
  const existing = await prisma.printTemplateDesign.findFirst({
    where: { id, tenantId: tenant.id, archivedAt: null },
    select: { id: true }
  })
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Шаблон не найден' })
  }

  const design = await prisma.printTemplateDesign.update({
    where: { id },
    data: {
      name: body.name,
      backgroundUrl: body.backgroundUrl,
      backgroundMimeType: body.backgroundMimeType ?? null,
      backgroundWidthPx: body.backgroundWidthPx,
      backgroundHeightPx: body.backgroundHeightPx,
      widthMm: body.widthMm,
      heightMm: body.heightMm,
      backgroundXmm: body.backgroundXmm,
      backgroundYmm: body.backgroundYmm,
      backgroundWidthMm: body.backgroundWidthMm,
      backgroundHeightMm: body.backgroundHeightMm,
      qrXmm: body.qrXmm,
      qrYmm: body.qrYmm,
      qrSizeMm: body.qrSizeMm,
      qrDarkColor: body.qrDarkColor,
      qrLightColor: body.qrLightColor,
      qrLightTransparent: body.qrLightTransparent ?? false
    }
  })

  const code = customTemplateCode(design.id)
  return {
    template: {
      id: design.id,
      code,
      name: design.name,
      previewUrl: `/api/print-templates/${encodeURIComponent(code)}/preview`
    }
  }
})
