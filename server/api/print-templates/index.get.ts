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

  // Свои шаблоны + все публичные. Чужие приватные не попадают сюда никогда.
  const customTemplates = await prisma.printTemplateDesign.findMany({
    where: {
      archivedAt: null,
      OR: [{ tenantId: tenant.id }, { isPublic: true }]
    },
    orderBy: { createdAt: 'desc' }
  })

  templates.push(...customTemplates.map((t) => {
    const code = customTemplateCode(t.id)
    const isOwn = t.tenantId === tenant.id
    const kind: 'custom' | 'public' = isOwn ? 'custom' : 'public'
    return {
      code,
      name: t.name,
      description: isOwn
        ? 'Ваш шаблон: фон + настраиваемый QR-код.'
        : 'Общий шаблон: фон + настраиваемый QR-код.',
      size: { widthMm: t.widthMm, heightMm: t.heightMm },
      previewUrl: `/api/print-templates/${encodeURIComponent(code)}/preview`,
      version: 1,
      kind,
      // isPublic экспортируем только для своих — у чужих это уже отражено в kind='public'.
      isPublic: isOwn ? t.isPublic : undefined
    }
  }))

  return { templates }
})
