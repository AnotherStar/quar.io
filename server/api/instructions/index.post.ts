import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeaturesForUser } from '~~/server/utils/plan'
import { generateShortId } from '~~/server/utils/slug'
import { instructionCreateSchema } from '~~/shared/schemas/instruction'
import { EMPTY_DOC } from '~~/shared/types/instruction'

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, instructionCreateSchema.parse)

  const features = effectiveFeaturesForUser(tenant, user)
  if (features.maxInstructions !== -1) {
    // Archived instructions don't count against the limit — that's how users
    // free up slots without losing their data.
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

  const slugTaken = await prisma.instruction.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: body.slug } }
  })
  if (slugTaken) throw createError({ statusCode: 400, statusMessage: 'Этот slug уже используется' })

  if (body.productBarcode) {
    const barcodeTaken = await prisma.instruction.findUnique({
      where: { tenantId_productBarcode: { tenantId: tenant.id, productBarcode: body.productBarcode } }
    })
    if (barcodeTaken) throw createError({ statusCode: 400, statusMessage: 'Этот ШК уже указан у другой инструкции' })
  }

  const instruction = await prisma.instruction.create({
    data: {
      tenantId: tenant.id,
      slug: body.slug,
      shortId: generateShortId(),
      title: body.title,
      language: body.language,
      productBarcode: body.productBarcode || null,
      productGroupId: body.productGroupId,
      createdById: user.id,
      draftContent: EMPTY_DOC as object
    }
  })
  return { instruction }
})
