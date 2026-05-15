import { z } from 'zod'
import OpenAI from 'openai'
import { uploadObject } from '~~/server/utils/storage'
import { getOpenAIApiKey, getOpenAIBaseUrl } from '~~/server/utils/openai'
import { requireTenant } from '~~/server/utils/tenant'
import { recordAiUsage, type AiUsageStatus } from '~~/server/utils/aiUsage'
import { getAiSetting } from '~~/server/utils/aiSettings'
import {
  PROMPT_WRAPPER_PLACEHOLDER,
  type ImageGenerationModel,
  type ImageGenerationSize
} from '~~/shared/aiSettings'

// ─── Выбор размера для конкретной модели ──────────────────────────────────────
// У OpenAI разные правила для разных моделей:
//
// gpt-image-1 / gpt-image-1.5 — только три фиксированных пресета:
//   1024x1024, 1024x1536 (портрет), 1536x1024 (ландшафт). Берём ближайший по
//   аспекту через log-distance, чтобы 2:1 и 1:2 матчились симметрично.
//
// gpt-image-2-* — произвольный размер с констрейнтами:
//   - обе стороны кратны 16
//   - макс. сторона ≤ 3840
//   - соотношение сторон не больше 3:1
//   - суммарных пикселей 655 360 ≤ N ≤ 8 294 400
// Считаем оптимальный размер под аспект холста и зажимаем в эти рамки.

const LEGACY_PRESETS: Array<{ size: Exclude<ImageGenerationSize, 'auto'>; ratio: number }> = [
  { size: '1024x1024', ratio: 1 },
  { size: '1536x1024', ratio: 1536 / 1024 },
  { size: '1024x1536', ratio: 1024 / 1536 }
]

function pickLegacyPreset(width: number, height: number) {
  const target = width / height
  let best = LEGACY_PRESETS[0]
  let bestDiff = Math.abs(Math.log(target / best.ratio))
  for (const candidate of LEGACY_PRESETS) {
    const diff = Math.abs(Math.log(target / candidate.ratio))
    if (diff < bestDiff) {
      bestDiff = diff
      best = candidate
    }
  }
  return best.size
}

const GPT_IMAGE_2_MAX_EDGE = 3840
const GPT_IMAGE_2_STEP = 16
const GPT_IMAGE_2_MIN_TOTAL = 655_360
const GPT_IMAGE_2_MAX_TOTAL = 8_294_400
const GPT_IMAGE_2_MAX_RATIO = 3
// Целевое количество пикселей по умолчанию: середина допустимого диапазона.
// Даёт хорошее качество, не упираясь в верхний потолок (стоимость на пиксель
// растёт линейно). Для квадрата ≈ 1414×1414.
const GPT_IMAGE_2_TARGET_TOTAL = 2_000_000

function snap(value: number, step: number) {
  return Math.round(value / step) * step
}
function snapDown(value: number, step: number) {
  return Math.floor(value / step) * step
}

function computeGptImage2Size(canvasW: number, canvasH: number): string {
  // 1. Зажимаем аспект в [1/3, 3]
  let ratio = canvasW / canvasH
  if (ratio > GPT_IMAGE_2_MAX_RATIO) ratio = GPT_IMAGE_2_MAX_RATIO
  else if (ratio < 1 / GPT_IMAGE_2_MAX_RATIO) ratio = 1 / GPT_IMAGE_2_MAX_RATIO

  // 2. Берём ~2M пикселей и распределяем по сторонам
  let width = Math.sqrt(GPT_IMAGE_2_TARGET_TOTAL * ratio)
  let height = Math.sqrt(GPT_IMAGE_2_TARGET_TOTAL / ratio)

  // 3. Снапим к шагу 16
  width = snap(width, GPT_IMAGE_2_STEP)
  height = snap(height, GPT_IMAGE_2_STEP)

  // 4. Кэпим максимальную сторону, пересчитываем вторую
  if (width > GPT_IMAGE_2_MAX_EDGE) {
    height = snap((height * GPT_IMAGE_2_MAX_EDGE) / width, GPT_IMAGE_2_STEP)
    width = GPT_IMAGE_2_MAX_EDGE
  }
  if (height > GPT_IMAGE_2_MAX_EDGE) {
    width = snap((width * GPT_IMAGE_2_MAX_EDGE) / height, GPT_IMAGE_2_STEP)
    height = GPT_IMAGE_2_MAX_EDGE
  }

  // 5. Подгоняем общее число пикселей в допустимый диапазон. Снэп вниз при
  // переполнении (чтобы гарантированно не выпасть выше потолка), снэп вверх
  // при недоборе.
  const total = width * height
  if (total < GPT_IMAGE_2_MIN_TOTAL) {
    const scale = Math.sqrt(GPT_IMAGE_2_MIN_TOTAL / total)
    width = snap(width * scale + GPT_IMAGE_2_STEP, GPT_IMAGE_2_STEP)
    height = snap(height * scale + GPT_IMAGE_2_STEP, GPT_IMAGE_2_STEP)
  } else if (total > GPT_IMAGE_2_MAX_TOTAL) {
    const scale = Math.sqrt(GPT_IMAGE_2_MAX_TOTAL / total)
    width = snapDown(width * scale, GPT_IMAGE_2_STEP)
    height = snapDown(height * scale, GPT_IMAGE_2_STEP)
  }

  return `${width}x${height}`
}

function modelSupportsArbitrarySize(model: ImageGenerationModel) {
  return model.startsWith('gpt-image-2')
}

function pickSizeForCanvas(
  model: ImageGenerationModel,
  canvasW: number,
  canvasH: number
): string {
  if (modelSupportsArbitrarySize(model)) return computeGptImage2Size(canvasW, canvasH)
  return pickLegacyPreset(canvasW, canvasH)
}

const BodySchema = z.object({
  prompt: z.string().min(3).max(2000),
  // Размер целевого холста в любых единицах (мм, px — не важно, нужна только
  // пропорция). Если передано — переопределяет size из админ-конфига.
  canvasWidth: z.number().positive().max(100_000).optional(),
  canvasHeight: z.number().positive().max(100_000).optional()
})

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, BodySchema.parse)

  const imageConfig = await getAiSetting('image.generate')
  const wrapperConfig = await getAiSetting('sticker.promptWrapper')

  // Промпт-обвязка из админки: технические требования (чистая зона под QR,
  // печатное качество, без текста) задаются один раз там. {{prompt}} в
  // шаблоне обязателен — проверяется Zod-схемой при сохранении.
  const finalPrompt = wrapperConfig.template.replaceAll(
    PROMPT_WRAPPER_PLACEHOLDER,
    body.prompt
  )

  // Если клиент передал размер холста — подбираем оптимальный размер под
  // активную модель (для gpt-image-2 — произвольный, для старых — пресет).
  // Без размера холста используем то, что выбрано в админке.
  const size: string =
    body.canvasWidth && body.canvasHeight
      ? pickSizeForCanvas(imageConfig.model, body.canvasWidth, body.canvasHeight)
      : imageConfig.size

  const startedAt = Date.now()
  let status: AiUsageStatus = 'error'
  let errorMessage: string | null = null
  let publicUrl: string | null = null
  let imageCount = 0

  try {
    const client = new OpenAI({
      apiKey: getOpenAIApiKey(),
      baseURL: getOpenAIBaseUrl().replace(/\/$/, '')
    })

    // size — string, потому что gpt-image-2 принимает произвольные размеры
    // вида "{width}x{height}", которых нет в литеральном union из SDK.
    const result = await client.images.generate({
      model: imageConfig.model,
      prompt: finalPrompt,
      size: size as any,
      n: imageConfig.n
    })

    const first = result.data?.[0]
    if (!first) throw createError({ statusCode: 502, statusMessage: 'OpenAI не вернул изображение' })

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

    const key = `ai-generated/${tenant.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
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
      feature: 'image-generate',
      model: imageConfig.model,
      status,
      errorMessage,
      imageCount,
      durationMs: Date.now() - startedAt,
      metadata: {
        promptChars: body.prompt.length,
        finalPromptChars: finalPrompt.length,
        outputUrl: publicUrl,
        size,
        canvasWidth: body.canvasWidth ?? null,
        canvasHeight: body.canvasHeight ?? null
      }
    })
  }
})
