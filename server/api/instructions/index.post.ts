import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeatures } from '~~/server/utils/plan'
import { generateShortId } from '~~/server/utils/slug'
import { instructionCreateSchema } from '~~/shared/schemas/instruction'
import { EMPTY_DOC } from '~~/shared/types/instruction'

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, instructionCreateSchema.parse)

  const features = effectiveFeatures(tenant)
  if (features.maxInstructions !== -1) {
    const count = await prisma.instruction.count({ where: { tenantId: tenant.id } })
    if (count >= features.maxInstructions) {
      throw createError({
        statusCode: 402,
        statusMessage: `Достигнут лимит инструкций (${features.maxInstructions}). Обновите тариф.`
      })
    }
  }

  const slugTaken = await prisma.instruction.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: body.slug } }
  })
  if (slugTaken) throw createError({ statusCode: 400, statusMessage: 'Этот slug уже используется' })

  const instruction = await prisma.instruction.create({
    data: {
      tenantId: tenant.id,
      slug: body.slug,
      shortId: generateShortId(),
      title: body.title,
      language: body.language,
      productGroupId: body.productGroupId,
      createdById: user.id,
      draftContent: EMPTY_DOC as object
    }
  })
  return { instruction }
})
