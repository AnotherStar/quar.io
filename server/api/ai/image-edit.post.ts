// POST /api/ai/image-edit
// Принимает URL исходного изображения и текстовый промпт, отправляет в OpenAI
// images/edits (через официальный SDK — он корректно стримит multipart, наша
// самописная FormData-сериализация падала с ECONNRESET), результат сохраняет
// в наше storage и возвращает публичный URL.
import { z } from 'zod'
import OpenAI, { toFile } from 'openai'
import { uploadObject } from '~~/server/utils/storage'
import { getOpenAIApiKey, getOpenAIBaseUrl } from '~~/server/utils/openai'
import { requireTenant } from '~~/server/utils/tenant'
import { recordAiUsage, type AiUsageStatus } from '~~/server/utils/aiUsage'

const BodySchema = z.object({
  imageUrl: z.string().min(1),
  prompt: z.string().min(3).max(2000)
})

const IMAGE_EDIT_MODEL = 'gpt-image-1.5'

// Тарификация image-моделей. Структура отличается от text-моделей (нет
// reasoning/cached), поэтому держим её здесь, а не в shared/openaiModels.ts.
// Источник: https://openai.com/api/pricing/ — при изменении прейскуранта
// поправь числа.
const IMAGE_MODEL_PRICING: Record<string, { textInput: number; imageInput: number; output: number }> = {
  'gpt-image-1': { textInput: 5, imageInput: 10, output: 40 },
  'gpt-image-1.5': { textInput: 5, imageInput: 10, output: 40 }
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

interface ImageUsage {
  inputTokens: number | null
  inputTextTokens: number | null
  inputImageTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
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

export default defineEventHandler(async (event) => {
  // Tenant-scoped: image edits eat the same AI budget as instruction
  // generation, so every call must be attributable to a tenant.
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, BodySchema.parse)

  const startedAt = Date.now()
  let status: AiUsageStatus = 'error'
  let errorMessage: string | null = null
  let imageCount = 0
  let publicUrl: string | null = null
  let usage: ImageUsage | null = null

  try {
    // 1. Скачать исходник.
    const src = await fetchImage(body.imageUrl)

    // 2. Клиент OpenAI.
    const client = new OpenAI({
      apiKey: getOpenAIApiKey(),
      baseURL: getOpenAIBaseUrl().replace(/\/$/, '')
    })

    // 3. Запрос edit-а. Используется gpt-image-1.5 — последняя модель image
    // editing на момент написания; при недоступности можно временно вернуть
    // 'gpt-image-1'.
    let result
    try {
      result = await client.images.edit({
        model: IMAGE_EDIT_MODEL,
        image: await toFile(src.buffer, src.filename, { type: src.mimeType }),
        prompt: body.prompt,
        size: 'auto',
        n: 1
      })
    } catch (e: any) {
      console.error('[image-edit] OpenAI error', e?.status, e?.message)
      throw createError({
        statusCode: 502,
        statusMessage: e?.error?.message || e?.message || 'OpenAI image edit failed'
      })
    }

    const first = result.data?.[0]
    if (!first) {
      throw createError({ statusCode: 502, statusMessage: 'OpenAI не вернул результат' })
    }

    // Images API возвращает usage только после успешного завершения. SDK не
    // типизирует это поле — лезем через any.
    usage = parseImageUsage((result as any).usage)

    // 4. Получить буфер сгенерированного изображения.
    let outBuf: Buffer
    if (first.b64_json) {
      outBuf = Buffer.from(first.b64_json, 'base64')
    } else if (first.url) {
      const resp = await fetch(first.url)
      if (!resp.ok) throw createError({ statusCode: 502, statusMessage: 'Не удалось скачать результат генерации' })
      outBuf = Buffer.from(await resp.arrayBuffer())
    } else {
      throw createError({ statusCode: 502, statusMessage: 'Пустой результат от OpenAI' })
    }

    // 5. Загрузить в storage.
    const key = `ai-edits/${tenant.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    publicUrl = await uploadObject(key, outBuf, 'image/png')

    imageCount = 1
    status = 'success'
    return { url: publicUrl }
  } catch (e: any) {
    errorMessage = e?.statusMessage || e?.message || 'Ошибка'
    throw e
  } finally {
    await recordAiUsage({
      tenantId: tenant.id,
      userId: user.id,
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
        promptChars: body.prompt.length,
        sourceImageUrl: body.imageUrl,
        outputUrl: publicUrl,
        inputTextTokens: usage?.inputTextTokens ?? null,
        inputImageTokens: usage?.inputImageTokens ?? null
      }
    })
  }
})

async function fetchImage(rawUrl: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
  // Относительный путь /uploads/... тоже работает — резолвим через текущий хост.
  const url = rawUrl.startsWith('http')
    ? rawUrl
    : `${useRuntimeConfig().public.appUrl.replace(/\/$/, '')}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`
  const resp = await fetch(url)
  if (!resp.ok) {
    throw createError({ statusCode: 400, statusMessage: 'Не удалось загрузить исходное изображение' })
  }
  const mimeType = resp.headers.get('content-type') || 'image/png'
  const buffer = Buffer.from(await resp.arrayBuffer())
  const ext = mimeType.includes('jpeg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png'
  return { buffer, mimeType, filename: `source.${ext}` }
}
