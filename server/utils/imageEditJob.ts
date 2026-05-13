// Воркер для AiImageEditJob.
// Запускается fire-and-forget из POST /api/ai/image-edit и обрабатывает один
// конкретный джоб: скачивает исходник, дёргает OpenAI images.edit, сохраняет
// результат в storage и обновляет запись в БД. Никакого внешнего scheduler-а
// нет — Nitro-процесс держит обещание живым до завершения, что нормально для
// нашей нагрузки (1-2 правки в минуту максимум). Если процесс упадёт во время
// обработки, джоб останется в PROCESSING; recoverStaleJobs() помечает такие
// как FAILED при следующем старте.
import OpenAI, { toFile } from 'openai'
import { uploadObject } from './storage'
import { getOpenAIApiKey, getOpenAIBaseUrl } from './openai'
import { recordAiUsage, type AiUsageStatus } from './aiUsage'
import { prisma } from './prisma'

const IMAGE_EDIT_MODEL = 'gpt-image-1.5'

const IMAGE_MODEL_PRICING: Record<string, { textInput: number; imageInput: number; output: number }> = {
  'gpt-image-1': { textInput: 5, imageInput: 10, output: 40 },
  'gpt-image-1.5': { textInput: 5, imageInput: 10, output: 40 }
}

interface ImageUsage {
  inputTokens: number | null
  inputTextTokens: number | null
  inputImageTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
}

function priceImageUsage(model: string, usage: ImageUsage | null): number | null {
  if (!usage) return null
  const pricing = IMAGE_MODEL_PRICING[model]
  if (!pricing) return null
  const textTokens = usage.inputTextTokens ?? 0
  const imageTokens = usage.inputImageTokens ?? 0
  const outputTokens = usage.outputTokens ?? 0
  return (
    (textTokens * pricing.textInput +
      imageTokens * pricing.imageInput +
      outputTokens * pricing.output) /
    1_000_000
  )
}

function parseImageUsage(raw: any): ImageUsage | null {
  if (!raw) return null
  const inputTokens = typeof raw.input_tokens === 'number' ? raw.input_tokens : null
  const outputTokens = typeof raw.output_tokens === 'number' ? raw.output_tokens : null
  const totalTokens = typeof raw.total_tokens === 'number' ? raw.total_tokens : null
  const details = raw.input_tokens_details ?? {}
  const inputTextTokens = typeof details.text_tokens === 'number' ? details.text_tokens : null
  const inputImageTokens = typeof details.image_tokens === 'number' ? details.image_tokens : null
  if (inputTokens === null && outputTokens === null && totalTokens === null) return null
  return { inputTokens, inputTextTokens, inputImageTokens, outputTokens, totalTokens }
}

async function fetchImage(rawUrl: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  const url = rawUrl.startsWith('http')
    ? rawUrl
    : `${useRuntimeConfig().public.appUrl.replace(/\/$/, '')}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`
  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error('Не удалось загрузить исходное изображение')
  }
  const mimeType = resp.headers.get('content-type') || 'image/png'
  const buffer = Buffer.from(await resp.arrayBuffer())
  const ext = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png'
  return { buffer, mimeType, filename: `source.${ext}` }
}

// Воркер — самостоятельно ловит ошибки и обновляет статус джоба. Нельзя дать
// исключению уйти в Nitro: вызывается из fire-and-forget без await.
export async function processImageEditJob(jobId: string): Promise<void> {
  const job = await prisma.aiImageEditJob.findUnique({ where: { id: jobId } })
  if (!job || job.status !== 'PENDING') return

  await prisma.aiImageEditJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() }
  })

  const startedAt = Date.now()
  let status: AiUsageStatus = 'error'
  let errorMessage: string | null = null
  let imageCount = 0
  let publicUrl: string | null = null
  let usage: ImageUsage | null = null

  try {
    const src = await fetchImage(job.sourceUrl)

    const client = new OpenAI({
      apiKey: getOpenAIApiKey(),
      baseURL: getOpenAIBaseUrl().replace(/\/$/, '')
    })

    const result = await client.images.edit({
      model: IMAGE_EDIT_MODEL,
      image: await toFile(src.buffer, src.filename, { type: src.mimeType }),
      prompt: job.prompt,
      size: 'auto',
      n: 1
    })

    const first = result.data?.[0]
    if (!first) throw new Error('OpenAI не вернул результат')

    usage = parseImageUsage((result as any).usage)

    let outBuf: Buffer
    if (first.b64_json) {
      outBuf = Buffer.from(first.b64_json, 'base64')
    } else if (first.url) {
      const resp = await fetch(first.url)
      if (!resp.ok) throw new Error('Не удалось скачать результат генерации')
      outBuf = Buffer.from(await resp.arrayBuffer())
    } else {
      throw new Error('Пустой результат от OpenAI')
    }

    const key = `ai-edits/${job.tenantId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    publicUrl = await uploadObject(key, outBuf, 'image/png')

    imageCount = 1
    status = 'success'

    await prisma.aiImageEditJob.update({
      where: { id: jobId },
      data: {
        status: 'SUCCEEDED',
        resultUrl: publicUrl,
        completedAt: new Date()
      }
    })
  } catch (e: any) {
    errorMessage = e?.message || 'Ошибка генерации изображения'
    console.error('[image-edit] job failed', jobId, errorMessage)
    await prisma.aiImageEditJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date()
      }
    })
  } finally {
    await recordAiUsage({
      tenantId: job.tenantId,
      userId: job.userId,
      feature: 'image-edit',
      model: IMAGE_EDIT_MODEL,
      status,
      errorMessage,
      imageCount,
      inputTokens: usage?.inputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      totalTokens: usage?.totalTokens ?? null,
      estimatedCostUsd: priceImageUsage(IMAGE_EDIT_MODEL, usage),
      durationMs: Date.now() - startedAt,
      metadata: {
        jobId,
        promptChars: job.prompt.length,
        sourceImageUrl: job.sourceUrl,
        outputUrl: publicUrl,
        inputTextTokens: usage?.inputTextTokens ?? null,
        inputImageTokens: usage?.inputImageTokens ?? null
      }
    })
  }
}

// Запускает воркер без await. Ошибки уже проглатываются внутри
// processImageEditJob, но catch на промисе нужен на случай, если внутри
// что-то выбросит до try-блока (например, при потере соединения с БД на
// первом UPDATE).
export function startImageEditJob(jobId: string) {
  processImageEditJob(jobId).catch((e) => {
    console.error('[image-edit] worker crashed', jobId, e)
  })
}
