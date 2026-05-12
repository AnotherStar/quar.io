import { requireTenant } from '~~/server/utils/tenant'
import { printTemplates } from '~~/print-templates/registry'
import type { PrintTemplateListItem } from '~~/shared/schemas/printBatch'

export default defineEventHandler(async (event) => {
  // Доступ к списку шаблонов — внутри tenant'а, без специальной роли.
  // Дальше создавать тираж может только EDITOR+ (см. POST /print-batches).
  await requireTenant(event)

  const templates: PrintTemplateListItem[] = printTemplates.map((t) => ({
    code: t.manifest.code,
    name: t.manifest.name,
    description: t.manifest.description,
    size: t.manifest.size,
    previewUrl: t.manifest.previewUrl,
    version: t.manifest.version
  }))

  return { templates }
})
