import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { customTemplateCode } from '~~/print-templates/custom'
import { printTemplateDesignCreateSchema } from '~~/shared/schemas/printBatch'

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, printTemplateDesignCreateSchema.parse)

  const design = await prisma.printTemplateDesign.create({
    data: {
      tenantId: tenant.id,
      createdById: user.id,
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
      qrLightColor: body.qrLightColor
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
