import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeaturesForUser } from '~~/server/utils/plan'
import { generateShortId } from '~~/server/utils/slug'

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!

  const source = await prisma.instruction.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      sectionAttachments: { orderBy: { position: 'asc' } },
      moduleAttachments: { orderBy: { position: 'asc' } }
    }
  })
  if (!source) throw createError({ statusCode: 404 })

  const features = effectiveFeaturesForUser(tenant, user)
  if (features.maxInstructions !== -1) {
    const activeCount = await prisma.instruction.count({
      where: { tenantId: tenant.id, status: { not: 'ARCHIVED' } }
    })
    if (activeCount >= features.maxInstructions) {
      throw createError({
        statusCode: 402,
        statusMessage: `Достигнут лимит активных инструкций (${features.maxInstructions}). Архивируйте старые или обновите тариф.`
      })
    }
  }

  const title = `${source.title} (копия)`
  const slug = await uniqueCopySlug(tenant.id, source.slug)

  const instruction = await prisma.instruction.create({
    data: {
      tenantId: tenant.id,
      productGroupId: source.productGroupId,
      slug,
      shortId: generateShortId(),
      title,
      description: source.description,
      language: source.language,
      status: 'DRAFT',
      draftContent: source.draftContent as object,
      createdById: user.id,
      sectionAttachments: {
        create: source.sectionAttachments.map((attachment) => ({
          sectionId: attachment.sectionId,
          position: attachment.position,
          slot: attachment.slot
        }))
      },
      moduleAttachments: {
        create: source.moduleAttachments.map((attachment) => ({
          tenantModuleConfigId: attachment.tenantModuleConfigId,
          position: attachment.position,
          slot: attachment.slot,
          configOverride: attachment.configOverride as object
        }))
      }
    }
  })

  return { instruction }
})

async function uniqueCopySlug(tenantId: string, sourceSlug: string) {
  const base = `${sourceSlug.slice(0, 58)}-copy`
  let slug = base
  let suffix = 2

  while (await prisma.instruction.findUnique({ where: { tenantId_slug: { tenantId, slug } } })) {
    const postfix = `-${suffix++}`
    slug = `${base.slice(0, 64 - postfix.length)}${postfix}`
  }

  return slug
}
