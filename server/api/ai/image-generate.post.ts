import { z } from 'zod'
import OpenAI from 'openai'
import { uploadObject } from '~~/server/utils/storage'
import { getOpenAIApiKey, getOpenAIBaseUrl } from '~~/server/utils/openai'
import { requireTenant } from '~~/server/utils/tenant'
import { recordAiUsage, type AiUsageStatus } from '~~/server/utils/aiUsage'

const BodySchema = z.object({
  prompt: z.string().min(3).max(2000)
})

const IMAGE_GENERATE_MODEL = 'gpt-image-1.5'

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, BodySchema.parse)

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

    const result = await client.images.generate({
      model: IMAGE_GENERATE_MODEL,
      prompt: body.prompt,
      size: '1024x1024',
      n: 1
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
      model: IMAGE_GENERATE_MODEL,
      status,
      errorMessage,
      imageCount,
      durationMs: Date.now() - startedAt,
      metadata: {
        promptChars: body.prompt.length,
        outputUrl: publicUrl
      }
    })
  }
})
