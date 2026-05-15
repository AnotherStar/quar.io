// Откат на историческую версию: делает её активной без создания новой записи.
// Body: { version: number }.
import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { setActiveAiVersion } from '~~/server/utils/aiSettings'
import { isAiSettingKey } from '~~/shared/aiSettings'

const BodySchema = z.object({
  version: z.number().int().positive()
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const key = getRouterParam(event, 'key')!
  if (!isAiSettingKey(key)) {
    throw createError({ statusCode: 404, statusMessage: 'Неизвестная AI-настройка' })
  }
  const body = await readValidatedBody(event, BodySchema.parse)
  await setActiveAiVersion(key, body.version)
  return { ok: true }
})
