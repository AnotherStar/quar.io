import { createError } from 'h3'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { uploadObject } from '~~/server/utils/storage'
import { getPrintTemplate } from '~~/print-templates/registry'
import { customPrintTemplate, parseCustomTemplateCode } from '~~/print-templates/custom'
import { printBatchCreateSchema, type PrintTemplateSnapshot } from '~~/shared/schemas/printBatch'
import type { QrPrintRunEntry } from '~~/shared/schemas/qrCode'

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, printBatchCreateSchema.parse)

  const customId = parseCustomTemplateCode(body.templateCode)
  const template = customId
    ? await loadCustomTemplate(tenant.id, customId)
    : getPrintTemplate(body.templateCode)
  if (!template) {
    throw createError({ statusCode: 404, statusMessage: 'Шаблон не найден' })
  }

  // Берём существующие свободные непечатанные QR — ровно так, как договорились
  // в обсуждении фичи. Никаких новых записей не создаём: если кодов не хватает,
  // пользователь сначала идёт в /dashboard/qr-codes и генерирует новые.
  const candidates = await prisma.activationQrCode.findMany({
    where: {
      tenantId: tenant.id,
      instructionId: null,
      firstPrintedAt: null
    },
    orderBy: { createdAt: 'asc' },
    take: body.count,
    select: { id: true, shortId: true, printRuns: true }
  })

  if (candidates.length < body.count) {
    throw createError({
      statusCode: 400,
      statusMessage: `Недостаточно свободных непечатанных QR: нужно ${body.count}, доступно ${candidates.length}. Сгенерируйте новые QR-коды.`
    })
  }

  const snapshot: PrintTemplateSnapshot = {
    code: template.manifest.code,
    name: template.manifest.name,
    version: template.manifest.version,
    size: template.manifest.size
  }

  // Создаём запись тиража со статусом GENERATING — на случай если рендер
  // упадёт, у пользователя в UI останется failed-запись с error message.
  const batch = await prisma.printBatch.create({
    data: {
      tenantId: tenant.id,
      createdById: user.id,
      templateCode: template.manifest.code,
      // Prisma ожидает InputJsonValue (index signature). Сериализуем через
      // any, потому что PrintTemplateSnapshot — узкая структура без [k: string].
      templateSnapshot: snapshot as any,
      count: candidates.length,
      qrCodeIds: candidates.map((c) => c.id),
      status: 'GENERATING'
    }
  })

  try {
    const appUrl = useRuntimeConfig().public.appUrl.replace(/\/$/, '')
    const pdf = await template.render({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        brandingLogoUrl: tenant.brandingLogoUrl
      },
      items: candidates.map((c) => ({ shortId: c.shortId, url: `${appUrl}/s/${c.shortId}` }))
    })

    const storageKey = `print-batches/${tenant.id}/${batch.id}.pdf`
    await uploadObject(storageKey, pdf, 'application/pdf')

    // Помечаем QR как напечатанные: одна запись printRun на каждый QR.
    // Запросов получается N — приемлемо при текущем потолке count=5000 и для
    // фоновой генерации. Если станет узким местом, перепишем на $executeRaw
    // с jsonb_set.
    const printedAt = new Date().toISOString()
    const printedAtDate = new Date(printedAt)
    const designLabel = template.manifest.name
    await Promise.all(candidates.map((c) => {
      const runs = (Array.isArray(c.printRuns) ? c.printRuns : []) as unknown as QrPrintRunEntry[]
      runs.push({ batchId: batch.id, designLabel, printedAt, count: 1 })
      return prisma.activationQrCode.update({
        where: { id: c.id },
        data: {
          printRuns: runs as any,
          lastPrintedAt: printedAtDate
        }
      })
    }))

    // Отдельным проходом проставляем firstPrintedAt только тем, у кого его ещё
    // нет. Делаем updateMany, потому что в одиночном update нельзя выразить
    // условие «только если поле null».
    await prisma.activationQrCode.updateMany({
      where: {
        id: { in: candidates.map((c) => c.id) },
        firstPrintedAt: null
      },
      data: { firstPrintedAt: printedAtDate }
    })

    const updated = await prisma.printBatch.update({
      where: { id: batch.id },
      data: {
        status: 'READY',
        pdfStorageKey: storageKey,
        pdfSizeBytes: pdf.length
      }
    })
    return { batch: { id: updated.id } }
  } catch (e: any) {
    await prisma.printBatch.update({
      where: { id: batch.id },
      data: { status: 'FAILED', error: String(e?.message ?? e).slice(0, 1000) }
    })
    throw createError({ statusCode: 500, statusMessage: 'Не удалось сгенерировать PDF: ' + (e?.message ?? 'unknown') })
  }
})

// Доступ: свой шаблон или публичный. Чужие приватные → 404.
async function loadCustomTemplate(tenantId: string, id: string) {
  const record = await prisma.printTemplateDesign.findFirst({
    where: {
      id,
      archivedAt: null,
      OR: [{ tenantId }, { isPublic: true }]
    }
  })
  return record ? customPrintTemplate(record) : undefined
}
