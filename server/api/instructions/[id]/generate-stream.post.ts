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
import { uploadObject } from '~~/server/utils/storage'
import { generateShortId } from '~~/server/utils/slug'

const MAX_BYTES = 25 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!

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

  const cfg = useRuntimeConfig()
  if (!cfg.openai.apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'OPENAI_API_KEY не настроен' })
  }
  const client = new OpenAI({ apiKey: cfg.openai.apiKey })

  const isImage = (file.type ?? '').startsWith('image/')
  const isPdf = (file.type ?? '') === 'application/pdf' || file.filename.toLowerCase().endsWith('.pdf')
  if (!isImage && !isPdf) {
    throw createError({ statusCode: 400, statusMessage: 'Поддерживаются только PDF и изображения' })
  }

  // SSE response
  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })
  const res = event.node.res
  ;(res as any).flushHeaders?.()

  const sse = (eventName: string, payload: unknown) => {
    res.write(`event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`)
    ;(res as any).flush?.()
  }

  // ── 1. Extract embedded PDF images and upload to S3 ──────────────────────
  let imageLibrary: Array<{ url: string; page: number; width: number; height: number }> = []
  if (isPdf) {
    sse('progress', { stage: 'extracting-images' })
    try {
      const extracted = await extractImagesFromPdf(file.data)
      // Upload in parallel, but bounded
      const uploads = await Promise.all(
        extracted.map(async (img) => {
          const key = `${tenant.id}/ai/${generateShortId()}.png`
          const url = await uploadObject(key, img.buffer, 'image/png')
          // Persist to MediaAsset so it shows up in the tenant's library
          await prisma.mediaAsset.create({
            data: {
              tenantId: tenant.id,
              key,
              url,
              mimeType: 'image/png',
              sizeBytes: img.buffer.length,
              width: img.width,
              height: img.height
            }
          }).catch(() => {})
          return { url, page: img.page, width: img.width, height: img.height }
        })
      )
      imageLibrary = uploads
      sse('progress', { stage: 'images-ready', count: imageLibrary.length })
    } catch (e: any) {
      // Image extraction failures shouldn't kill the whole flow
      console.warn('[generate-stream] image extraction failed:', e?.message)
      sse('progress', { stage: 'images-failed' })
    }
  }

  // ── 2. Build prompt content ──────────────────────────────────────────────
  const dataUrl = `data:${file.type ?? 'application/octet-stream'};base64,${file.data.toString('base64')}`
  const userText = imageLibrary.length
    ? buildUserPromptWithImages(imageLibrary)
    : 'Сгенерируй инструкцию по этому файлу.'

  const userContent: any[] = [{ type: 'input_text', text: userText }]
  if (isImage) {
    userContent.push({ type: 'input_image', image_url: dataUrl })
  } else {
    userContent.push({ type: 'input_file', filename: file.filename, file_data: dataUrl })
  }

  const extractor = new StreamingBlockExtractor()
  const collectedBlocks: AiBlock[] = []
  const meta: Partial<AiInstruction> = {}

  try {
    const stream = await client.responses.create({
      model: cfg.openai.model,
      input: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ],
      text: {
        format: { type: 'json_schema', name: 'instruction', schema: RESPONSE_SCHEMA as any, strict: true }
      },
      stream: true
    })

    for await (const chunk of stream as any) {
      const t = chunk?.type as string | undefined
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
          continue
        }
        collectedBlocks.push(norm)
        sse('block', norm)
      }
    }

    const finalParse = extractor.finalize().full
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
    await prisma.instruction.update({
      where: { id: instr.id },
      data: {
        title: fullAi.title,
        description: fullAi.description || null,
        language: fullAi.language,
        draftContent: draft as object
      }
    })

    sse('done', { blocksCount: collectedBlocks.length, imagesUsed: imageLibrary.length })
  } catch (e: any) {
    sse('error', { message: e?.message || 'Ошибка генерации' })
  } finally {
    res.end()
  }
})

function buildUserPromptWithImages(library: Array<{ url: string; page: number }>) {
  const lines = library.map((it) => `- url: ${it.url}  (со страницы ${it.page})`).join('\n')
  return `Сгенерируй инструкцию по этому файлу.

В оригинальном PDF на разных страницах есть изображения, которые мы извлекли и положили в S3. Доступные URL и номера страниц:

${lines}

Когда тебе нужно проиллюстрировать шаг или раздел инструкции, вставляй блок типа "image" с url из списка выше (не выдумывай URL!) и кратким description (alt-текст для accessibility). Размещай изображение там, где оно по смыслу подходит к тексту. Если иллюстрация для какого-то шага не нужна — не вставляй image-блок просто чтобы вставить.`
}
