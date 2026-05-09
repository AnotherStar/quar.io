import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { buildQrPdf } from '~~/server/utils/qrPdf'
import { qrExportQuerySchema } from '~~/shared/schemas/qrCode'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const query = qrExportQuerySchema.parse(getQuery(event))
  const selectedIds = query.ids
    ?.split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  const codes = await prisma.activationQrCode.findMany({
    where: {
      tenantId: tenant.id,
      ...(selectedIds?.length ? { id: { in: selectedIds } } : { instructionId: null })
    },
    orderBy: { createdAt: 'asc' },
    take: 5000,
    select: { shortId: true }
  })

  if (!codes.length) {
    throw createError({ statusCode: 404, statusMessage: 'Нет QR-кодов для экспорта' })
  }

  const appUrl = useRuntimeConfig().public.appUrl.replace(/\/$/, '')
  const pdf = buildQrPdf(
    codes.map((code) => ({
      shortId: code.shortId,
      url: `${appUrl}/s/${code.shortId}`
    })),
    query.sizeMm
  )

  setHeader(event, 'content-type', 'application/pdf')
  setHeader(event, 'content-disposition', `attachment; filename="manualonline-qr-${codes.length}.pdf"`)
  return pdf
})
