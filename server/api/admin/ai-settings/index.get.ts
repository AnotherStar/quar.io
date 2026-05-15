// Список всех AI-конфигов с текущими effective-значениями и метаданными
// активной версии. Тяжёлые промпты в payload передаются как есть — это
// нужно UI для рендера textarea без второго запроса.
//
// effective = null означает «нет активной версии или её value не прошёл
// валидацию». В этом случае runtime будет падать с 503 — UI обязан
// показать предупреждение и предложить создать первую версию.
import { requireAdmin } from '~~/server/utils/auth'
import { listAiSettings } from '~~/server/utils/aiSettings'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const items = await listAiSettings()
  return {
    items: items.map((it) => ({
      key: it.key,
      label: it.meta.label,
      description: it.meta.description,
      kind: it.meta.kind,
      effective: it.effective,
      isConfigured: it.isConfigured,
      activeVersion: it.activeVersionInfo
        ? {
            version: it.activeVersionInfo.version,
            isValid: it.activeVersionInfo.isValid,
            createdAt: it.activeVersionInfo.createdAt.toISOString(),
            note: it.activeVersionInfo.note,
            createdBy: it.activeVersionInfo.createdBy
          }
        : null,
      totalVersions: it.totalVersions
    }))
  }
})
