import { randomUUID } from 'node:crypto'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { qrPrintRunSchema, type QrPrintRunEntry } from '~~/shared/schemas/qrCode'

// Mark a set of QR codes as "printed in design X". Each QR keeps a JSON
// array of print runs so the same code can be reprinted in different designs;
// firstPrintedAt is set on the first run, lastPrintedAt is updated every time.
export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, qrPrintRunSchema.parse)

  const codes = await prisma.activationQrCode.findMany({
    where: { id: { in: body.ids }, tenantId: tenant.id },
    select: { id: true, printRuns: true, firstPrintedAt: true }
  })

  if (codes.length !== body.ids.length) {
    throw createError({ statusCode: 400, statusMessage: 'Часть QR не принадлежит этому tenant' })
  }

  const batchId = randomUUID()
  const now = new Date()

  await prisma.$transaction(
    codes.map((code) => {
      const existing = Array.isArray(code.printRuns) ? (code.printRuns as unknown as QrPrintRunEntry[]) : []
      const entry: QrPrintRunEntry = {
        batchId,
        designLabel: body.designLabel,
        printedAt: now.toISOString(),
        count: 1
      }
      return prisma.activationQrCode.update({
        where: { id: code.id },
        data: {
          printRuns: [...existing, entry] as unknown as object,
          firstPrintedAt: code.firstPrintedAt ?? now,
          lastPrintedAt: now
        }
      })
    })
  )

  return { batchId, designLabel: body.designLabel, count: codes.length }
})
