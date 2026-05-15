// Список всех PrintTemplateDesign по всем тенантам — для админ-страницы
// управления публичностью. Не tenant-scoped: видим всё, что есть в БД.
import { requireAdmin } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const items = await prisma.printTemplateDesign.findMany({
    orderBy: [{ isPublic: 'desc' }, { createdAt: 'desc' }],
    include: {
      tenant: { select: { id: true, name: true, slug: true } }
    }
  })

  return {
    items: items.map((t) => ({
      id: t.id,
      name: t.name,
      isPublic: t.isPublic,
      archivedAt: t.archivedAt ? t.archivedAt.toISOString() : null,
      widthMm: t.widthMm,
      heightMm: t.heightMm,
      previewUrl: `/api/print-templates/${encodeURIComponent(`custom:${t.id}`)}/preview`,
      createdAt: t.createdAt.toISOString(),
      tenant: {
        id: t.tenant.id,
        name: t.tenant.name,
        slug: t.tenant.slug
      }
    }))
  }
})
