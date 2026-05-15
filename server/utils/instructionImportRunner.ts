// Воркер массового импорта инструкций.
//
// Триггерится из POST /api/instructions/import/upload: на каждый загруженный
// файл создаётся InstructionImportJob со статусом QUEUED. Воркер крутится в
// процессе Nitro с лимитом параллельных задач MAX_CONCURRENT и забирает джобы
// по мере освобождения слотов. Внешнего scheduler-а нет — это нормально для
// нашей нагрузки. Если Nitro упал во время обработки, recoverStaleJobs()
// перекинет PROCESSING обратно в QUEUED на старте.
//
// Каждый джоб делает полный цикл: скачать файл из S3, при PDF — извлечь
// картинки и залить их в S3 как media-assets, дёрнуть OpenAI Responses API
// (non-stream), сконвертировать ответ в TipTap-документ, создать Instruction
// со статусом DRAFT и привязать её к джобу. SSE не нужен — клиент поллит
// /api/instructions/import/jobs и видит изменения статуса/стадии.
import OpenAI from 'openai'
import { createHash } from 'node:crypto'
import { prisma } from './prisma'
import { uploadObject } from './storage'
import { getOpenAIApiKey, getOpenAIBaseUrl } from './openai'
import { recordAiUsage, type AiUsageStatus } from './aiUsage'
import { generateShortId, slugify, isReservedSlug } from './slug'
import { extractImagesFromPdf } from './pdfImageExtractor'
import {
  RESPONSE_SCHEMA,
  aiBlocksToTipTap,
  type AiBlock,
  type AiInstruction
} from './aiInstructionGenerator'
import { normalizeBlock } from './streamingBlockExtractor'
import { getOpenAIModelInfo, type OpenAIModelId } from '~~/shared/openaiModels'
import { getAiSetting } from './aiSettings'

const MAX_CONCURRENT = 3

// in-process реестр активных джобов. Используется только для лимита
// параллельности — настоящее состояние всегда в БД.
const inFlight = new Set<string>()
// Защита от двойного вызова tick() — если несколько мест одновременно зовут
// поллер, обрабатываем только один проход.
let ticking = false

// Внешняя точка входа. Безопасно дёргать многократно: если слотов нет —
// просто выходит, если что-то можно поднять — поднимает.
export function tickInstructionImportRunner() {
  // setImmediate, чтобы не блокировать вызывающего и не входить в reentrancy
  // при ошибках в первой же итерации.
  setImmediate(() => {
    void tick().catch((e) => console.error('[instruction-import] tick crashed', e))
  })
}

async function tick() {
  if (ticking) return
  ticking = true
  try {
    while (inFlight.size < MAX_CONCURRENT) {
      const job = await claimNextQueuedJob()
      if (!job) break
      inFlight.add(job.id)
      void processJob(job.id)
        .catch((e) => {
          console.error('[instruction-import] job crashed', job.id, e)
        })
        .finally(() => {
          inFlight.delete(job.id)
          // Освободился слот — попробуем подобрать следующий.
          tickInstructionImportRunner()
        })
    }
  } finally {
    ticking = false
  }
}

// Атомарный захват: переводим первый QUEUED в PROCESSING одним UPDATE с
// условием, чтобы две параллельные горутины не схватили один и тот же джоб.
async function claimNextQueuedJob(): Promise<{ id: string } | null> {
  const candidate = await prisma.instructionImportJob.findFirst({
    where: { status: 'QUEUED' },
    orderBy: { createdAt: 'asc' },
    select: { id: true }
  })
  if (!candidate) return null

  const updated = await prisma.instructionImportJob.updateMany({
    where: { id: candidate.id, status: 'QUEUED' },
    data: {
      status: 'PROCESSING',
      stage: 'starting',
      progressPercent: 0,
      startedAt: new Date(),
      errorMessage: null
    }
  })
  if (updated.count === 0) {
    // Кто-то успел перехватить — пробуем ещё раз.
    return claimNextQueuedJob()
  }
  return candidate
}

// Восстановление после рестарта Nitro: всё, что было PROCESSING, помечаем как
// QUEUED — продолжим обработку с нуля. Это безопасно: инструкция, если
// создавалась, остаётся в DRAFT и просто перезаписывается следующим проходом.
export async function recoverStaleInstructionImportJobs() {
  const res = await prisma.instructionImportJob.updateMany({
    where: { status: 'PROCESSING' },
    data: { status: 'QUEUED', stage: null, progressPercent: null, startedAt: null }
  })
  if (res.count > 0) {
    console.info('[instruction-import] recovered stale jobs', res.count)
  }
}

async function setStage(jobId: string, stage: string, progressPercent?: number) {
  await prisma.instructionImportJob.update({
    where: { id: jobId },
    data: { stage, progressPercent: progressPercent ?? undefined }
  })
}

// Достаёт буфер файла обратно из S3 (или локального драйвера).
async function fetchFileBuffer(publicUrl: string): Promise<Buffer> {
  const url = publicUrl.startsWith('http')
    ? publicUrl
    : `${useRuntimeConfig().public.appUrl.replace(/\/$/, '')}${
        publicUrl.startsWith('/') ? publicUrl : `/${publicUrl}`
      }`
  const resp = await fetch(url)
  if (!resp.ok) throw new Error('Не удалось прочитать загруженный файл')
  return Buffer.from(await resp.arrayBuffer())
}

// Загружает извлечённые из PDF картинки в S3 и возвращает library-записи,
// которые мы передаём модели в промпте.
async function uploadExtractedImages(
  tenantId: string,
  images: Awaited<ReturnType<typeof extractImagesFromPdf>>
) {
  const library: Array<{
    index: number
    url: string
    page: number
    width: number
    height: number
    hash: string
  }> = []
  for (const [i, img] of images.entries()) {
    const key = `imported-instruction-images/${tenantId}/${Date.now()}-${generateShortId()}-${i + 1}.png`
    const url = await uploadObject(key, img.buffer, 'image/png')
    library.push({
      index: i + 1,
      url,
      page: img.page,
      width: img.width,
      height: img.height,
      hash: img.hash
    })
  }
  return library
}

function buildPrompt(opts: {
  isPdf: boolean
  library: Array<{ index: number; url: string; page: number; width: number; height: number }>
  fileName: string
}) {
  const intro = opts.isPdf
    ? `Сгенерируй инструкцию по этому PDF-файлу (${opts.fileName}).`
    : `Сгенерируй инструкцию по этому изображению (${opts.fileName}).`
  const lines: string[] = [intro]
  if (opts.library.length) {
    const libLines = opts.library
      .map(
        (img) =>
          `- IMAGE_${img.index}: url=${img.url}  page=${img.page}  size=${img.width}x${img.height}  source=извлечено из PDF`
      )
      .join('\n')
    lines.push(
      `Доступные изображения (извлечённые из PDF, уже загружены в S3):

${libLines}

Правила работы с изображениями:
- Рассмотри каждое изображение из списка IMAGE_1...IMAGE_N как потенциальную часть инструкции.
- Если изображение относится к товару, шагу, схеме, комплектации, таблице, предупреждению или результату действия — вставь отдельный блок "image" с точным url из списка.
- По возможности используй все содержательные изображения из списка. Не ограничивайся первым изображением.
- Размещай image-блок рядом с ближайшим связанным текстом или сразу после соответствующего раздела/шага.
- Для каждого image-блока пиши короткий, конкретный description как alt-текст: что изображено и зачем это нужно пользователю.
- Не выдумывай URL и не меняй URL даже на один символ.
- Не используй один и тот же URL дважды, кроме случаев, когда одно и то же изображение явно нужно повторить в разных местах.
- image_placeholder используй только для иллюстраций, которые упомянуты в тексте, но отсутствуют в списке доступных URL.
- Если изображение явно декоративное, логотип, фон или не несёт инструктивного смысла — не вставляй его.`
    )
  }
  return lines.join('\n\n')
}

function applyImageDimensionsToTipTap(
  node: any,
  imageLibrary: Array<{ url: string; width: number; height: number }>
) {
  if (!imageLibrary.length || !node) return
  const dims = new Map(
    imageLibrary
      .filter((i) => i.url && i.width && i.height)
      .map((i) => [i.url, { width: i.width, height: i.height }])
  )
  const visit = (current: any) => {
    if (!current || typeof current !== 'object') return
    if (current.type === 'image' && current.attrs?.src) {
      const d = dims.get(current.attrs.src)
      if (d) {
        current.attrs.intrinsicWidth = d.width
        current.attrs.intrinsicHeight = d.height
      }
    }
    if (Array.isArray(current.content)) for (const c of current.content) visit(c)
  }
  visit(node)
}

// Уникальный slug в рамках tenant'а: пробуем slugify(title), при коллизии
// добавляем короткий хвост. Резерв quar.io тоже учитываем.
async function buildUniqueSlug(tenantId: string, title: string): Promise<string> {
  const base = slugify(title) || `instruction-${generateShortId().slice(0, 6)}`
  const safeBase = isReservedSlug(base) ? `${base}-${generateShortId().slice(0, 4)}` : base
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? safeBase : `${safeBase}-${generateShortId().slice(0, 4)}`
    const exists = await prisma.instruction.findUnique({
      where: { tenantId_slug: { tenantId, slug: candidate } },
      select: { id: true }
    })
    if (!exists) return candidate
  }
  // Совсем не повезло — берём шортайди как slug.
  return `i-${generateShortId().slice(0, 8)}`
}

function normalizeResponseUsage(raw: any, model: OpenAIModelId) {
  if (!raw) return null
  const inputTokens = Number(raw.input_tokens) || 0
  const outputTokens = Number(raw.output_tokens) || 0
  const totalTokens = Number(raw.total_tokens) || inputTokens + outputTokens
  const cachedInputTokens = Number(raw.input_tokens_details?.cached_tokens) || 0
  const reasoningTokens = Number(raw.output_tokens_details?.reasoning_tokens) || 0
  const billableInputTokens = Math.max(0, inputTokens - cachedInputTokens)
  const pricing = getOpenAIModelInfo(model).pricingUsdPer1M
  const estimatedCostUsd = pricing
    ? (billableInputTokens * pricing.input +
        cachedInputTokens * pricing.cachedInput +
        outputTokens * pricing.output) /
      1_000_000
    : null
  return {
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens,
    estimatedCostUsd
  }
}

async function processJob(jobId: string): Promise<void> {
  const job = await prisma.instructionImportJob.findUnique({ where: { id: jobId } })
  if (!job) return
  if (job.status !== 'PROCESSING') return // защита от race

  const aiStartedAt = Date.now()
  let usageStatus: AiUsageStatus = 'error'
  let usageError: string | null = null
  let usage: ReturnType<typeof normalizeResponseUsage> = null
  let createdInstructionId: string | null = job.instructionId
  // Конфиг фичи. Читаем один раз в начале джоба — так модель/промпт стабильны
  // в рамках одного джоба, даже если админ переключит активную версию во
  // время обработки.
  const aiConfig = await getAiSetting('instruction.import')
  const activeModel = aiConfig.model

  try {
    await setStage(jobId, 'downloading', 5)
    // fileKey хранит публичный URL (то, что вернул uploadObject) — для S3 это
    // абсолютный URL, для local — относительный путь /uploads/...
    // fetchFileBuffer обрабатывает оба случая.
    const buffer = await fetchFileBuffer(job.fileKey)
    const isPdf = job.fileMimeType === 'application/pdf'
    const isImage = job.fileMimeType.startsWith('image/')

    // ── 1. PDF: извлекаем картинки и заливаем в S3 ────────────────────────
    let library: Awaited<ReturnType<typeof uploadExtractedImages>> = []
    if (isPdf) {
      await setStage(jobId, 'extracting-images', 15)
      const extracted = await extractImagesFromPdf(buffer).catch((e) => {
        console.warn('[instruction-import] pdf extract failed', jobId, e?.message)
        return [] as Awaited<ReturnType<typeof extractImagesFromPdf>>
      })
      if (extracted.length) {
        await setStage(jobId, 'uploading-images', 30)
        library = await uploadExtractedImages(job.tenantId, extracted)
      }
    } else if (isImage) {
      // Для одиночного изображения сам файл и есть «иллюстрация»: добавляем
      // его в библиотеку, чтобы AI могла вставить блок image с этим URL.
      library = [
        {
          index: 1,
          url: job.fileKey,
          page: 0,
          width: 0,
          height: 0,
          hash: job.fileHash
        }
      ]
    }

    // ── 2. Запрос к OpenAI ─────────────────────────────────────────────────
    await setStage(jobId, 'generating', 50)
    const cfg = useRuntimeConfig()
    const client = new OpenAI({
      apiKey: getOpenAIApiKey(String(cfg.openai.apiKey || '')),
      baseURL: getOpenAIBaseUrl()
    })

    const userText = buildPrompt({ isPdf, library, fileName: job.fileName })
    const userContent: any[] = [{ type: 'input_text', text: userText }]
    if (isImage) {
      // OpenAI должен дотянуться до картинки сам. Абсолютные URL (S3) — ок,
      // относительные /uploads/... в local-режиме недоступны снаружи, поэтому
      // тогда передаём data URL прямо в запросе.
      if (job.fileKey.startsWith('http')) {
        userContent.push({ type: 'input_image', image_url: job.fileKey })
      } else {
        const dataUrl = `data:${job.fileMimeType};base64,${buffer.toString('base64')}`
        userContent.push({ type: 'input_image', image_url: dataUrl })
      }
    } else {
      const dataUrl = `data:${job.fileMimeType};base64,${buffer.toString('base64')}`
      userContent.push({ type: 'input_file', filename: job.fileName, file_data: dataUrl })
    }

    const response = await client.responses.create({
      model: activeModel,
      input: [
        { role: 'system', content: aiConfig.systemPrompt },
        { role: 'user', content: userContent }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'instruction',
          schema: RESPONSE_SCHEMA as any,
          strict: true
        }
      },
      ...(aiConfig.reasoningEffort !== 'none'
        ? { reasoning: { effort: aiConfig.reasoningEffort } }
        : {})
    })

    usage = normalizeResponseUsage((response as any).usage, activeModel)

    const outputText = (response as any).output_text as string | undefined
    if (!outputText) throw new Error('Пустой ответ модели')

    let parsed: any
    try {
      parsed = JSON.parse(outputText)
    } catch {
      throw new Error('Не удалось разобрать ответ модели')
    }

    const rawBlocks: any[] = Array.isArray(parsed?.blocks) ? parsed.blocks : []
    const blocks: AiBlock[] = []
    for (const raw of rawBlocks) {
      const norm = normalizeBlock(raw)
      if (!norm) continue
      // Защита от галлюцинированных URL: image-блоки сверяем с библиотекой.
      if (norm.type === 'image' && library.length && !library.some((i) => i.url === norm.url)) {
        continue
      }
      blocks.push(norm)
    }

    const title = (typeof parsed.title === 'string' && parsed.title.trim()) || job.fileName.replace(/\.[^.]+$/, '')
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : ''
    const language = (typeof parsed.language === 'string' && parsed.language.trim()) || 'ru'

    const aiInstr: AiInstruction = {
      title,
      slug: '', // будет проставлен при создании
      description,
      language,
      blocks
    }
    const draft = aiBlocksToTipTap(aiInstr)
    applyImageDimensionsToTipTap(draft, library)

    // ── 3. Создаём (или обновляем) Instruction ─────────────────────────────
    await setStage(jobId, 'saving', 90)
    if (createdInstructionId) {
      await prisma.instruction.update({
        where: { id: createdInstructionId },
        data: {
          title,
          description: description || null,
          language,
          draftContent: draft as object
        }
      })
    } else {
      const slug = await buildUniqueSlug(job.tenantId, title)
      const instruction = await prisma.instruction.create({
        data: {
          tenantId: job.tenantId,
          slug,
          shortId: generateShortId(),
          title,
          description: description || null,
          language,
          createdById: job.createdById,
          draftContent: draft as object
        }
      })
      createdInstructionId = instruction.id
    }

    await prisma.instructionImportJob.update({
      where: { id: jobId },
      data: {
        status: 'SUCCEEDED',
        stage: 'done',
        progressPercent: 100,
        instructionId: createdInstructionId,
        completedAt: new Date()
      }
    })
    usageStatus = 'success'
  } catch (e: any) {
    usageError = e?.message || 'Ошибка импорта'
    console.error('[instruction-import] job failed', jobId, usageError)
    await prisma.instructionImportJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: usageError,
        completedAt: new Date(),
        instructionId: createdInstructionId
      }
    })
  } finally {
    await recordAiUsage({
      tenantId: job.tenantId,
      userId: job.createdById,
      feature: 'instruction-import',
      model: activeModel,
      status: usageStatus,
      errorMessage: usageError,
      inputTokens: usage?.inputTokens ?? null,
      cachedInputTokens: usage?.cachedInputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      reasoningTokens: usage?.reasoningTokens ?? null,
      totalTokens: usage?.totalTokens ?? null,
      estimatedCostUsd: usage?.estimatedCostUsd ?? null,
      durationMs: Date.now() - aiStartedAt,
      metadata: {
        jobId,
        fileName: job.fileName,
        fileSize: job.fileSize,
        fileMimeType: job.fileMimeType
      }
    })
  }
}

// Утилита для дедупа: hex sha256 для буфера.
export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

// Единый shape для ответа API. Принимает запись Prisma с включённым (или
// отсутствующим) полем instruction. UI читает только эти поля.
export function serializeInstructionImportJob(j: any) {
  return {
    id: j.id,
    status: j.status as 'QUEUED' | 'PAUSED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED',
    fileName: j.fileName,
    fileSize: j.fileSize,
    fileMimeType: j.fileMimeType,
    fileHash: j.fileHash,
    stage: j.stage as string | null,
    progressPercent: j.progressPercent as number | null,
    errorMessage: j.errorMessage as string | null,
    instructionId: j.instructionId as string | null,
    instruction: j.instruction
      ? {
          id: j.instruction.id as string,
          title: j.instruction.title as string,
          slug: j.instruction.slug as string
        }
      : null,
    acknowledgedAt: j.acknowledgedAt ? new Date(j.acknowledgedAt).toISOString() : null,
    startedAt: j.startedAt ? new Date(j.startedAt).toISOString() : null,
    completedAt: j.completedAt ? new Date(j.completedAt).toISOString() : null,
    createdAt: new Date(j.createdAt).toISOString()
  }
}
