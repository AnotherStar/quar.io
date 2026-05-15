// Сохранение новой версии конфига. Body: { value, note? }. Возвращает номер
// созданной версии. Сразу делает её активной.
import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { saveAiSetting } from '~~/server/utils/aiSettings'
import { isAiSettingKey, AI_FEATURE_CATALOG } from '~~/shared/aiSettings'

const BodySchema = z.object({
  value: z.unknown(),
  note: z.string().max(500).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const key = getRouterParam(event, 'key')!
  if (!isAiSettingKey(key)) {
    throw createError({ statusCode: 404, statusMessage: 'Неизвестная AI-настройка' })
  }

  const body = await readValidatedBody(event, BodySchema.parse)

  // Дополнительно валидируем value по схеме фичи — saveAiSetting тоже это
  // делает, но здесь мы можем вернуть user-friendly 400 с описанием ошибки
  // вместо технического исключения.
  const meta = AI_FEATURE_CATALOG[key]
  const parsed = meta.schema.safeParse(body.value)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Значение не прошло валидацию',
      data: { issues: parsed.error.issues }
    })
  }

  const version = await saveAiSetting(key, parsed.data as any, {
    userId: user.id,
    note: body.note ?? null
  })
  return { version }
})
