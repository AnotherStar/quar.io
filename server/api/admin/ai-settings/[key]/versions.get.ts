// История версий по ключу. Возвращаем до 50 последних версий вместе с
// value — UI показывает их в развёрнутом виде и позволяет сравнивать.
import { requireAdmin } from '~~/server/utils/auth'
import { getAiSettingVersions } from '~~/server/utils/aiSettings'
import { isAiSettingKey } from '~~/shared/aiSettings'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const key = getRouterParam(event, 'key')!
  if (!isAiSettingKey(key)) {
    throw createError({ statusCode: 404, statusMessage: 'Неизвестная AI-настройка' })
  }
  const versions = await getAiSettingVersions(key, { limit: 50 })
  return {
    versions: versions.map((v) => ({
      version: v.version,
      value: v.value,
      note: v.note,
      createdAt: v.createdAt.toISOString(),
      createdBy: v.createdBy,
      isActive: v.isActive
    }))
  }
})
