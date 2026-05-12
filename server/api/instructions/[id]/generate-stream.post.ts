// Real-time streaming generation of instruction content via OpenAI.
// Steps:
//   1. If PDF — extract embedded images, upload each to S3, build a URL list
//   2. Send original file + image-library hint to OpenAI (Responses API stream)
//   3. Parse each completed block as it arrives, push via SSE
//   4. AI emits {type:'image', url} blocks pointing at our S3 URLs where it
//      decides illustrations belong
import OpenAI from 'openai'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import {
  SYSTEM_PROMPT,
  SYSTEM_PROMPT_FROM_PROMPT,
  RESPONSE_SCHEMA,
  aiBlocksToTipTap,
  type AiBlock,
  type AiInstruction
} from '~~/server/utils/aiInstructionGenerator'
import { StreamingBlockExtractor, normalizeBlock } from '~~/server/utils/streamingBlockExtractor'
import { extractImagesFromPdf } from '~~/server/utils/pdfImageExtractor'
import { generateShortId } from '~~/server/utils/slug'
import { getOpenAIApiKey, getOpenAIBaseUrl } from '~~/server/utils/openai'
import {
  INSTRUCTION_GENERATION_MODEL,
  getOpenAIModelInfo,
  type OpenAIModelId
} from '~~/shared/openaiModels'

const MAX_BYTES = 25 * 1024 * 1024
const MAX_TOTAL_BYTES = 60 * 1024 * 1024
const MAX_FILES = 10

type InputFile = {
  filename: string
  mimeType: string
  data: Buffer
  isPdf: boolean
  isImage: boolean
}

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const requestId = generateShortId()

  const instr = await prisma.instruction.findFirst({ where: { id, tenantId: tenant.id } })
  if (!instr) throw createError({ statusCode: 404 })

  const parts = await readMultipartFormData(event)
  const rawFiles = (parts ?? []).filter((p) => p.name === 'file' || p.name?.startsWith('file_'))
  if (rawFiles.length > MAX_FILES) {
    throw createError({ statusCode: 400, statusMessage: `Слишком много файлов (макс. ${MAX_FILES})` })
  }

  let totalBytes = 0
  const files: InputFile[] = []
  for (const part of rawFiles) {
    if (!part.data?.length || !part.filename) {
      throw createError({ statusCode: 400, statusMessage: 'Получен пустой файл' })
    }
    if (part.data.length > MAX_BYTES) {
      throw createError({ statusCode: 413, statusMessage: `Файл ${part.filename} слишком большой (макс. 25 МБ)` })
    }
    totalBytes += part.data.length
    if (totalBytes > MAX_TOTAL_BYTES) {
      throw createError({ statusCode: 413, statusMessage: 'Суммарный размер файлов превышает 60 МБ' })
    }
    const mimeType = part.type ?? 'application/octet-stream'
    const isImage = mimeType.startsWith('image/')
    const isPdf = mimeType === 'application/pdf' || part.filename.toLowerCase().endsWith('.pdf')
    if (!isImage && !isPdf) {
      throw createError({ statusCode: 400, statusMessage: `Файл ${part.filename}: поддерживаются только PDF и изображения` })
    }
    files.push({ filename: part.filename, mimeType, data: part.data, isImage, isPdf })
  }

  const userPromptPart = parts?.find((p) => p.name === 'userPrompt')
  const userPrompt = userPromptPart?.data ? userPromptPart.data.toString('utf8').trim() : ''

  // Need either at least one file OR a user prompt — otherwise there's
  // nothing for the model to work from.
  if (!files.length && !userPrompt) {
    throw createError({ statusCode: 400, statusMessage: 'Прикрепите хотя бы один файл или опишите задачу в подсказке' })
  }

  const providedImageLibrary = parseImageLibraryPart(parts?.find((p) => p.name === 'imageLibrary')?.data)
  const skipExtraction = parts?.find((p) => p.name === 'skipExtraction')?.data?.toString('utf8') === '1'

  console.info('[generate-stream] start', {
    requestId,
    instructionId: id,
    files: files.length,
    promptChars: userPrompt.length,
    providedImages: providedImageLibrary.length,
    skipExtraction
  })

  // SSE response
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })
  const res = event.node.res
  ;(res as any).flushHeaders?.()
  const requestAbort = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) requestAbort.abort()
  })

  const throwIfAborted = () => {
    if (requestAbort.signal.aborted) throw createAbortError()
  }

  const sse = (eventName: string, payload: unknown) => {
    if (requestAbort.signal.aborted || res.destroyed || res.writableEnded) return
    res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`)
    ;(res as any).flush?.()
  }

  // ── 1. Extract embedded PDF images and upload to S3 ──────────────────────
  // Browser may pre-upload user-attached image files and pass them in
  // providedImageLibrary so the AI can reference them by URL. We still need
  // to extract images from PDFs (if any) unless the browser explicitly tells
  // us to skip — which happens on round 2 after extraction has already run.
  const imageLibrary: Array<{ index: number; url: string; page: number; width: number; height: number; hash?: string }> = providedImageLibrary
  let extractedImagesCount = 0
  const failedImageUploads = 0
  const pdfFiles = files.filter((f) => f.isPdf)
  if (providedImageLibrary.length) {
    sse('progress', { stage: 'image-library-provided', count: imageLibrary.length })
  }
  if (!skipExtraction && pdfFiles.length) {
    sse('progress', { stage: 'extracting-images' })
    type ExtractedImage = Awaited<ReturnType<typeof extractImagesFromPdf>>[number]
    const extracted: ExtractedImage[] = []
    for (const pdf of pdfFiles) {
      try {
        const result = await extractImagesFromPdf(pdf.data, {
          onProgress: (progress) => {
            throwIfAborted()
            sse('progress', {
              stage: 'extracting-images-progress',
              file: pdf.filename,
              pdfCount: pdfFiles.length,
              ...progress
            })
          }
        })
        extracted.push(...result)
      } catch (e: any) {
        if (isAbortError(e)) throw e
        console.error('[generate-stream] pdf extract failed', { requestId, file: pdf.filename, message: e?.message || String(e) })
        sse('progress', { stage: 'images-extract-failed', file: pdf.filename, message: e?.message || 'Не удалось извлечь изображения из PDF' })
      }
    }
    extractedImagesCount = extracted.length
    sse('progress', { stage: 'images-extracted', count: extracted.length })

    if (extracted.length) {
      for (const [index, img] of extracted.entries()) {
        throwIfAborted()
        const imageIndex = index + 1
        sse('extracted-image', {
          index: imageIndex,
          page: img.page,
          width: img.width,
          height: img.height,
          hash: img.hash,
          filename: `ai-extracted-${imageIndex}.png`,
          mimeType: 'image/png',
          sizeBytes: img.buffer.length,
          dataUrl: `data:image/png;base64,${img.buffer.toString('base64')}`
        })
      }
      sse('done', {
        browserUploadRequired: true,
        extractedImages: extracted.length,
        uploadedImages: 0,
        failedImageUploads: 0,
        imageCountInPrompt: 0
      })
      res.end()
      return
    }
  }

  // ── 2. Build prompt content ──────────────────────────────────────────────
  // Image files that the browser already uploaded to S3 are listed first in
  // providedImageLibrary, in the same order they appear among image files.
  // Reuse those URLs so we don't ship the bytes twice (once as data URL, once
  // as a library URL) — big payloads were tripping "Connection error." in the
  // OpenAI SDK.
  const imageFilesInOrder = files.filter((f) => f.isImage)
  const preUploadedImageUrls = providedImageLibrary.slice(0, imageFilesInOrder.length).map((e) => e.url)
  // Split the image library into the two sources we know about:
  //   - first N entries (where N = number of image files in this request) are
  //     user-attached illustrations the browser pre-uploaded to S3
  //   - the rest are extracted from PDFs in a previous round
  const userImagesInLibrary = imageLibrary.slice(0, imageFilesInOrder.length)
  const pdfExtractedInLibrary = imageLibrary.slice(imageFilesInOrder.length)
  const userText = buildUserText({
    pdfCount: pdfFiles.length,
    userImagesInLibrary,
    pdfExtractedInLibrary,
    userPrompt
  })

  const cfg = useRuntimeConfig()
  const client = new OpenAI({
    apiKey: getOpenAIApiKey(String(cfg.openai.apiKey || '')),
    baseURL: getOpenAIBaseUrl()
  })

  const userContent: any[] = [{ type: 'input_text', text: userText }]
  for (const f of files) {
    if (f.isImage) {
      const idx = imageFilesInOrder.indexOf(f)
      const s3Url = preUploadedImageUrls[idx]
      if (s3Url) {
        userContent.push({ type: 'input_image', image_url: s3Url })
      } else {
        const dataUrl = `data:${f.mimeType};base64,${f.data.toString('base64')}`
        userContent.push({ type: 'input_image', image_url: dataUrl })
      }
    } else {
      const dataUrl = `data:${f.mimeType};base64,${f.data.toString('base64')}`
      userContent.push({ type: 'input_file', filename: f.filename, file_data: dataUrl })
    }
  }

  const extractor = new StreamingBlockExtractor()
  const collectedBlocks: AiBlock[] = []
  const meta: Partial<AiInstruction> = {}
  let returnedImageBlocks = 0
  let acceptedImageBlocks = 0
  let droppedImageBlocks = 0
  let usage: ReturnType<typeof normalizeResponseUsage> | null = null

  try {
    const stream = await client.responses.create({
      model: INSTRUCTION_GENERATION_MODEL,
      input: [
        { role: 'system', content: files.length ? SYSTEM_PROMPT : SYSTEM_PROMPT_FROM_PROMPT },
        { role: 'user', content: userContent }
      ],
      text: {
        format: { type: 'json_schema', name: 'instruction', schema: RESPONSE_SCHEMA as any, strict: true }
      },
      stream: true
    }, { signal: requestAbort.signal } as any)

    for await (const chunk of stream as any) {
      throwIfAborted()
      const t = chunk?.type as string | undefined
      if (t === 'response.completed') {
        usage = normalizeResponseUsage(chunk.response?.usage, INSTRUCTION_GENERATION_MODEL)
        if (usage) sse('usage', usage)
      }
      const delta: string | undefined = t === 'response.output_text.delta' ? chunk.delta : undefined
      if (!delta) continue

      const out = extractor.feed(delta)
      if (Object.keys(out.newMeta).length) {
        Object.assign(meta, out.newMeta)
        sse('meta', out.newMeta)
      }
      for (const raw of out.newBlocks) {
        const norm = normalizeBlock(raw)
        if (!norm) continue
        // Drop image blocks pointing at URLs that aren't in the library —
        // protects against the model hallucinating URLs
        if (norm.type === 'image' && imageLibrary.length && !imageLibrary.some((i) => i.url === norm.url)) {
          returnedImageBlocks++
          droppedImageBlocks++
          continue
        }
        if (norm.type === 'image') {
          returnedImageBlocks++
          acceptedImageBlocks++
        }
        collectedBlocks.push(norm)
        sse('block', norm)
      }
    }

    const finalParse = extractor.finalize().full
    throwIfAborted()
    if (finalParse && typeof finalParse === 'object') {
      for (const k of ['title', 'slug', 'description', 'language'] as const) {
        if (!meta[k] && typeof finalParse[k] === 'string') {
          ;(meta as any)[k] = finalParse[k]
          sse('meta', { [k]: finalParse[k] })
        }
      }
    }

    const fullAi: AiInstruction = {
      title: meta.title?.trim() || instr.title,
      slug: instr.slug,
      description: meta.description?.trim() || instr.description || '',
      language: meta.language?.trim() || instr.language,
      blocks: collectedBlocks
    }
    const draft = aiBlocksToTipTap(fullAi)
    applyImageDimensionsToTipTap(draft, imageLibrary)
    throwIfAborted()
    await prisma.instruction.update({
      where: { id: instr.id },
      data: {
        title: fullAi.title,
        description: fullAi.description || null,
        language: fullAi.language,
        draftContent: draft as object
      }
    })

    const summary = {
      blocksCount: collectedBlocks.length,
      structureStats: summarizeBlocks(collectedBlocks),
      extractedImages: extractedImagesCount,
      uploadedImages: imageLibrary.length,
      failedImageUploads,
      returnedImageBlocks,
      acceptedImageBlocks,
      droppedImageBlocks,
      usage
    }
    console.info('[generate-stream] done', {
      requestId,
      blocks: summary.blocksCount,
      images: { extracted: extractedImagesCount, accepted: acceptedImageBlocks, dropped: droppedImageBlocks },
      tokens: usage?.totalTokens,
      costUsd: usage?.estimatedCostUsd
    })
    sse('done', summary)
  } catch (e: any) {
    if (isAbortError(e)) return
    console.error('[generate-stream] error', {
      requestId,
      message: e?.message || 'Ошибка генерации',
      status: e?.status,
      code: e?.code,
      cause: e?.cause?.message
    })
    sse('error', { message: e?.message || 'Ошибка генерации' })
  } finally {
    if (!res.writableEnded && !res.destroyed) res.end()
  }
})

type LibEntry = { index: number; url: string; page: number; width: number; height: number }

function buildUserText(opts: {
  pdfCount: number
  userImagesInLibrary: LibEntry[]
  pdfExtractedInLibrary: LibEntry[]
  userPrompt: string
}) {
  const { pdfCount, userImagesInLibrary, pdfExtractedInLibrary, userPrompt } = opts
  const userImageCount = userImagesInLibrary.length
  const fileCount = pdfCount + userImageCount

  // Case A: no files at all — generate strictly from the user's prompt.
  if (fileCount === 0) {
    return `Создай инструкцию по описанию ниже. Файлов с исходниками нет — опирайся только на запрос пользователя и здравый смысл.

Запрос пользователя:
${userPrompt}`
  }

  // Case B: at least one file is attached. Build a human-readable sources line.
  const sourceParts: string[] = []
  if (pdfCount) sourceParts.push(pdfCount === 1 ? '1 PDF' : `${pdfCount} PDF-файлов`)
  if (userImageCount) sourceParts.push(userImageCount === 1 ? '1 прикреплённая иллюстрация' : `${userImageCount} прикреплённых иллюстраций`)
  const sourceText = sourceParts.join(' + ')

  const intro = fileCount > 1
    ? `Сгенерируй инструкцию по входным материалам (${sourceText}). Объедини информацию из всех источников в одну цельную инструкцию.`
    : `Сгенерируй инструкцию по этому файлу (${sourceText}).`

  const sections: string[] = [intro]

  const totalLibrary = userImagesInLibrary.length + pdfExtractedInLibrary.length
  if (totalLibrary) {
    const libLines: string[] = []
    for (const img of userImagesInLibrary) {
      libLines.push(`- IMAGE_${img.index}: url=${img.url}  size=${img.width}x${img.height}  source=прикреплённая пользователем иллюстрация`)
    }
    for (const img of pdfExtractedInLibrary) {
      libLines.push(`- IMAGE_${img.index}: url=${img.url}  page=${img.page}  size=${img.width}x${img.height}  source=извлечено из PDF`)
    }

    const sourceDescParts: string[] = []
    if (pdfExtractedInLibrary.length) sourceDescParts.push('извлечённые из PDF')
    if (userImagesInLibrary.length) sourceDescParts.push('прикреплённые пользователем')
    const sourceDesc = sourceDescParts.join(' и ')

    sections.push(`Доступные изображения (${sourceDesc}, уже загружены в S3):

${libLines.join('\n')}

Правила работы с изображениями:
- Рассмотри каждое изображение из списка IMAGE_1...IMAGE_N как потенциальную часть инструкции.
- Если изображение относится к товару, шагу, схеме, комплектации, таблице, предупреждению или результату действия — вставь отдельный блок "image" с точным url из списка.
- По возможности используй все содержательные изображения из списка. Не ограничивайся первым изображением.
- Размещай image-блок рядом с ближайшим связанным текстом или сразу после соответствующего раздела/шага.
- Для каждого image-блока пиши короткий, конкретный description как alt-текст: что изображено и зачем это нужно пользователю.
- Не выдумывай URL и не меняй URL даже на один символ.
- Не используй один и тот же URL дважды, кроме случаев, когда одно и то же изображение явно нужно повторить в разных местах.
- image_placeholder используй только для иллюстраций, которые упомянуты в тексте, но отсутствуют в списке доступных URL.
- Если изображение явно декоративное, логотип, фон или не несёт инструктивного смысла — не вставляй его.`)
  }

  if (userPrompt) {
    sections.push(`Дополнительные требования от пользователя:\n${userPrompt}`)
  }

  return sections.join('\n\n')
}

function parseImageLibraryPart(data?: Buffer) {
  if (!data?.length) return []
  try {
    const parsed = JSON.parse(data.toString('utf8'))
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((img, index) => ({
        index: Number(img?.index) || index + 1,
        url: typeof img?.url === 'string' ? img.url : '',
        page: Number(img?.page) || 0,
        width: Number(img?.width) || 0,
        height: Number(img?.height) || 0,
        hash: typeof img?.hash === 'string' ? img.hash : undefined
      }))
      .filter((img) => img.url)
  } catch {
    return []
  }
}

function applyImageDimensionsToTipTap(
  node: any,
  imageLibrary: Array<{ url: string; width: number; height: number }>
) {
  if (!imageLibrary.length || !node) return
  const dimensionsByUrl = new Map(
    imageLibrary
      .filter((image) => image.url && image.width && image.height)
      .map((image) => [image.url, { width: image.width, height: image.height }])
  )

  const visit = (current: any) => {
    if (!current || typeof current !== 'object') return
    if (current.type === 'image' && current.attrs?.src) {
      const dimensions = dimensionsByUrl.get(current.attrs.src)
      if (dimensions) {
        current.attrs.intrinsicWidth = dimensions.width
        current.attrs.intrinsicHeight = dimensions.height
      }
    }
    if (Array.isArray(current.content)) {
      for (const child of current.content) visit(child)
    }
  }

  visit(node)
}

function createAbortError() {
  const error = new Error('Generation aborted')
  error.name = 'AbortError'
  return error
}

function isAbortError(error: any) {
  return error?.name === 'AbortError'
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
    ? (billableInputTokens * pricing.input + cachedInputTokens * pricing.cachedInput + outputTokens * pricing.output) / 1_000_000
    : null

  return {
    model,
    inputTokens,
    cachedInputTokens,
    billableInputTokens,
    outputTokens,
    reasoningTokens,
    totalTokens,
    estimatedCostUsd,
    pricing: pricing
      ? {
          inputUsdPer1M: pricing.input,
          cachedInputUsdPer1M: pricing.cachedInput,
          outputUsdPer1M: pricing.output
        }
      : null
  }
}

function summarizeBlocks(blocks: AiBlock[]) {
  const byType: Record<string, number> = {}
  const headingsByLevel: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 }
  const safetyBySeverity: Record<'info' | 'warning' | 'danger', number> = {
    info: 0,
    warning: 0,
    danger: 0
  }
  let linkCount = 0

  for (const block of blocks) {
    byType[block.type] = (byType[block.type] || 0) + 1
    linkCount += block.links?.length || 0

    if (block.type === 'heading') {
      headingsByLevel[block.level]++
    }
    if (block.type === 'safety') {
      safetyBySeverity[block.severity]++
    }
  }

  return {
    byType,
    headingsByLevel,
    safetyBySeverity,
    linkCount
  }
}
