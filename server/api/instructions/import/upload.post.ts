// Загрузка одного файла для массового импорта инструкций.
// Принимает multipart/form-data с одним полем "file". Считает sha256 буфера и
// проверяет дубль в рамках tenant'а: если такой хеш уже есть среди активных
// или успешно завершённых джобов — возвращает duplicate: true и существующую
// запись (без создания новой). Иначе грузит файл в S3 и создаёт QUEUED-job.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeaturesForUser } from '~~/server/utils/plan'
import { uploadObject } from '~~/server/utils/storage'
import { generateShortId } from '~~/server/utils/slug'
import {
  sha256Hex,
  tickInstructionImportRunner,
  serializeInstructionImportJob
} from '~~/server/utils/instructionImportRunner'

const MAX_BYTES = 25 * 1024 * 1024
const ACCEPTED_MIME_PREFIXES = ['image/']
const ACCEPTED_MIMES = new Set(['application/pdf'])

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })

  const parts = await readMultipartFormData(event)
  const filePart = (parts ?? []).find((p) => p.name === 'file')
  if (!filePart?.data?.length || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Не передан файл' })
  }

  const mimeType = filePart.type ?? 'application/octet-stream'
  const isImage = ACCEPTED_MIME_PREFIXES.some((p) => mimeType.startsWith(p))
  const isPdf =
    ACCEPTED_MIMES.has(mimeType) ||
    filePart.filename.toLowerCase().endsWith('.pdf')
  if (!isImage && !isPdf) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Поддерживаются только PDF и изображения'
    })
  }

  if (filePart.data.length > MAX_BYTES) {
    throw createError({
      statusCode: 413,
      statusMessage: `Файл слишком большой (макс. 25 МБ)`
    })
  }

  // ── Дедуп по sha256 в рамках tenant'а ──────────────────────────────────
  // Не считаем дублями только FAILED — пользователь может захотеть повторить
  // тот же файл, если предыдущая попытка упала.
  const fileHash = sha256Hex(filePart.data)
  const existing = await prisma.instructionImportJob.findFirst({
    where: {
      tenantId: tenant.id,
      fileHash,
      status: { in: ['QUEUED', 'PAUSED', 'PROCESSING', 'SUCCEEDED'] }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      instruction: { select: { id: true, title: true, slug: true } }
    }
  })
  if (existing) {
    return {
      duplicate: true as const,
      job: serializeInstructionImportJob(existing)
    }
  }

  // ── Лимит активных инструкций тарифа ──────────────────────────────────
  // Учитываем и существующие активные инструкции, и джобы, которые ещё
  // ничего не создали (QUEUED / PAUSED / PROCESSING) — иначе можно
  // одной партией импорта прорваться сильно выше лимита.
  const features = effectiveFeaturesForUser(tenant, user)
  if (features.maxInstructions !== -1) {
    const [activeCount, pendingJobs] = await Promise.all([
      prisma.instruction.count({
        where: { tenantId: tenant.id, status: { not: 'ARCHIVED' } }
      }),
      prisma.instructionImportJob.count({
        where: {
          tenantId: tenant.id,
          status: { in: ['QUEUED', 'PAUSED', 'PROCESSING'] }
        }
      })
    ])
    if (activeCount + pendingJobs >= features.maxInstructions) {
      throw createError({
        statusCode: 402,
        statusMessage: `Достигнут лимит активных инструкций (${features.maxInstructions}). Архивируйте старые или обновите тариф.`
      })
    }
  }

  // ── Загрузка файла в S3 ───────────────────────────────────────────────
  const extMatch = /\.([a-z0-9]{1,8})$/i.exec(filePart.filename)
  const ext = extMatch ? extMatch[1].toLowerCase() : isPdf ? 'pdf' : 'bin'
  const key = `imported-instructions/${tenant.id}/${Date.now()}-${generateShortId()}.${ext}`
  const publicUrl = await uploadObject(key, filePart.data, mimeType)

  const job = await prisma.instructionImportJob.create({
    data: {
      tenantId: tenant.id,
      createdById: user.id,
      fileKey: publicUrl,
      fileName: filePart.filename,
      fileMimeType: mimeType,
      fileSize: filePart.data.length,
      fileHash
    },
    include: {
      instruction: { select: { id: true, title: true, slug: true } }
    }
  })

  tickInstructionImportRunner()

  return { duplicate: false as const, job: serializeInstructionImportJob(job) }
})
