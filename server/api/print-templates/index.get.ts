import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { printTemplates } from '~~/print-templates/registry'
import { customTemplateCode } from '~~/print-templates/custom'
import type { PrintTemplateListItem } from '~~/shared/schemas/printBatch'

export default defineEventHandler(async (event) => {
  // Доступ к списку шаблонов — внутри tenant'а, без специальной роли.
  // Дальше создавать тираж может только EDITOR+ (см. POST /print-batches).
  const { tenant } = await requireTenant(event)

  const templates: PrintTemplateListItem[] = printTemplates.map((t) => ({
    code: t.manifest.code,
    name: t.manifest.name,
    description: t.manifest.description,
    size: t.manifest.size,
    previewUrl: `/api/print-templates/${encodeURIComponent(t.manifest.code)}/preview`,
    version: t.manifest.version,
    kind: 'system'
  }))

  const customTemplates = await prisma.printTemplateDesign.findMany({
    where: { tenantId: tenant.id, archivedAt: null },
    orderBy: { createdAt: 'desc' }
  })

  templates.push(...customTemplates.map((t) => {
    const code = customTemplateCode(t.id)
    return {
      code,
      name: t.name,
      description: 'Ваш шаблон: фон + настраиваемый QR-код.',
      size: { widthMm: t.widthMm, heightMm: t.heightMm },
      previewUrl: `/api/print-templates/${encodeURIComponent(code)}/preview`,
      version: 1,
      kind: 'custom' as const
    }
  }))

  return { templates }
})
