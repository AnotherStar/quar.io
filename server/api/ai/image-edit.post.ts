// POST /api/ai/image-edit
// Принимает URL исходного изображения и текстовый промпт, отправляет в OpenAI
// images/edits (через официальный SDK — он корректно стримит multipart, наша
// самописная FormData-сериализация падала с ECONNRESET), результат сохраняет
// в наше storage и возвращает публичный URL.
import { z } from 'zod'
import OpenAI, { toFile } from 'openai'
import { uploadObject } from '~~/server/utils/storage'
import { getOpenAIApiKey, getOpenAIBaseUrl } from '~~/server/utils/openai'

const BodySchema = z.object({
  imageUrl: z.string().min(1),
  prompt: z.string().min(3).max(2000)
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readValidatedBody(event, BodySchema.parse)

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
      model: 'gpt-image-1.5',
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
  const key = `ai-edits/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
  const publicUrl = await uploadObject(key, outBuf, 'image/png')

  return { url: publicUrl }
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
