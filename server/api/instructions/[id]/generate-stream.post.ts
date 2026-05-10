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

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const requestId = generateShortId()

  const instr = await prisma.instruction.findFirst({ where: { id, tenantId: tenant.id } })
  if (!instr) throw createError({ statusCode: 404 })

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file')
  if (!file?.data || !file.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Файл не передан' })
  }
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Файл слишком большой (макс. 25 МБ)' })
  }
  const providedImageLibrary = parseImageLibraryPart(parts?.find((p) => p.name === 'imageLibrary')?.data)

  const isImage = (file.type ?? '').startsWith('image/')
  const isPdf = (file.type ?? '') === 'application/pdf' || file.filename.toLowerCase().endsWith('.pdf')
  if (!isImage && !isPdf) {
    throw createError({ statusCode: 400, statusMessage: 'Поддерживаются только PDF и изображения' })
  }
  console.info('[generate-stream]', {
    requestId,
    stage: 'start',
    instructionId: id,
    tenantId: tenant.id,
    filename: file.filename,
    mimeType: file.type,
    sizeBytes: file.data.length,
    isPdf,
    isImage,
    providedImages: providedImageLibrary.length
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
  let imageLibrary: Array<{ index: number; url: string; page: number; width: number; height: number; hash?: string }> = providedImageLibrary
  let extractedImagesCount = 0
  let failedImageUploads = 0
  if (providedImageLibrary.length) {
    extractedImagesCount = providedImageLibrary.length
    console.info('[generate-stream]', {
      requestId,
      stage: 'image-library-provided',
      count: imageLibrary.length,
      images: imageLibrary
    })
    sse('progress', { stage: 'image-library-provided', count: imageLibrary.length })
  } else if (isPdf) {
    sse('progress', { stage: 'extracting-images' })
    let extracted: Awaited<ReturnType<typeof extractImagesFromPdf>> = []
    try {
      extracted = await extractImagesFromPdf(file.data, {
        onProgress: (progress) => {
          throwIfAborted()
          console.info('[generate-stream]', {
            requestId,
            stage: 'extracting-images-progress',
            ...progress
          })
          sse('progress', { stage: 'extracting-images-progress', ...progress })
        }
      })
      extractedImagesCount = extracted.length
      console.info('[generate-stream]', {
        requestId,
        stage: 'images-extracted',
        count: extracted.length,
        images: extracted.map((img, index) => ({
          index: index + 1,
          page: img.page,
          width: img.width,
          height: img.height,
          hash: img.hash
        }))
      })
      sse('progress', { stage: 'images-extracted', count: extracted.length })
    } catch (e: any) {
      if (isAbortError(e)) throw e
      console.error('[generate-stream]', {
        requestId,
        stage: 'images-extract-failed',
        message: e?.message || String(e),
        stack: e?.stack
      })
      sse('progress', { stage: 'images-extract-failed', message: e?.message || 'Не удалось извлечь изображения из PDF' })
    }

    if (extracted.length) {
      for (const [index, img] of extracted.entries()) {
        throwIfAborted()
        const imageIndex = index + 1
        console.info('[generate-stream]', {
          requestId,
          stage: 'extracted-image-ready-for-browser-upload',
          index: imageIndex,
          page: img.page,
          width: img.width,
          height: img.height,
          hash: img.hash,
          sizeBytes: img.buffer.length
        })
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
      console.info('[generate-stream]', {
        requestId,
        stage: 'browser-upload-required',
        extractedImages: extracted.length
      })
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
  const dataUrl = `data:${file.type ?? 'application/octet-stream'};base64,${file.data.toString('base64')}`
  const userText = imageLibrary.length
    ? buildUserPromptWithImages(imageLibrary)
    : 'Сгенерируй инструкцию по этому файлу.'
  console.info('[generate-stream]', {
    requestId,
    stage: 'prompt-built',
    imageCountInPrompt: imageLibrary.length,
    promptChars: userText.length
  })

  const cfg = useRuntimeConfig()
  const client = new OpenAI({
    apiKey: getOpenAIApiKey(String(cfg.openai.apiKey || '')),
    baseURL: getOpenAIBaseUrl()
  })

  const userContent: any[] = [{ type: 'input_text', text: userText }]
  if (isImage) {
    userContent.push({ type: 'input_image', image_url: dataUrl })
  } else {
    userContent.push({ type: 'input_file', filename: file.filename, file_data: dataUrl })
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
        { role: 'system', content: SYSTEM_PROMPT },
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
        if (usage) {
          console.info('[generate-stream]', { requestId, stage: 'usage', usage })
          sse('usage', usage)
        }
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
          console.warn('[generate-stream]', {
            requestId,
            stage: 'image-block-dropped',
            reason: 'url-not-in-library',
            url: norm.url,
            description: norm.description
          })
          continue
        }
        if (norm.type === 'image') {
          returnedImageBlocks++
          acceptedImageBlocks++
          const match = imageLibrary.find((i) => i.url === norm.url)
          console.info('[generate-stream]', {
            requestId,
            stage: 'image-block-accepted',
            imageIndex: match?.index,
            page: match?.page,
            url: norm.url,
            description: norm.description
          })
        }
        collectedBlocks.push(norm)
        console.info('[generate-stream]', {
          requestId,
          stage: 'block',
          blockIndex: collectedBlocks.length,
          type: norm.type
        })
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
    console.info('[generate-stream]', { requestId, stage: 'done', ...summary })
    sse('done', summary)
  } catch (e: any) {
    if (isAbortError(e)) {
      console.info('[generate-stream]', { requestId, stage: 'aborted' })
      return
    }
    console.error('[generate-stream]', {
      requestId,
      stage: 'error',
      message: e?.message || 'Ошибка генерации'
    })
    sse('error', { message: e?.message || 'Ошибка генерации' })
  } finally {
    if (!res.writableEnded && !res.destroyed) res.end()
  }
})

function buildUserPromptWithImages(library: Array<{ index: number; url: string; page: number; width: number; height: number }>) {
  const lines = library
    .map((it) => `- IMAGE_${it.index}: url=${it.url}  page=${it.page}  size=${it.width}x${it.height}`)
    .join('\n')
  return `Сгенерируй инструкцию по этому файлу.

В оригинальном PDF есть извлечённые изображения. Мы уже загрузили их в S3. Доступные изображения:

${lines}

Правила работы с изображениями:
- Рассмотри каждое изображение из списка IMAGE_1...IMAGE_N как потенциальную часть исходной инструкции.
- Если изображение относится к товару, шагу, схеме, комплектации, таблице, предупреждению или результату действия — вставь отдельный блок "image" с точным url из списка.
- По возможности используй все содержательные изображения из списка. Не ограничивайся первым изображением.
- Размещай image-блок рядом с ближайшим связанным текстом или сразу после раздела/шага с той же страницы PDF.
- Для каждого image-блока пиши короткий, конкретный description как alt-текст: что изображено и зачем это нужно пользователю.
- Не выдумывай URL и не меняй URL даже на один символ.
- Не используй один и тот же URL дважды, кроме случаев, когда одно и то же изображение явно нужно повторить в разных местах.
- image_placeholder используй только для иллюстраций, которые упомянуты в тексте, но отсутствуют в списке доступных URL.
- Если изображение явно декоративное, логотип, фон или не несёт инструктивного смысла — не вставляй его.`
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
