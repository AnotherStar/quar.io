import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { instructionUpdateSchema } from '~~/shared/schemas/instruction'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, instructionUpdateSchema.parse)

  const exists = await prisma.instruction.findFirst({ where: { id, tenantId: tenant.id } })
  if (!exists) throw createError({ statusCode: 404 })

  if (body.slug && body.slug !== exists.slug) {
    const taken = await prisma.instruction.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: body.slug } }
    })
    if (taken) throw createError({ statusCode: 400, statusMessage: 'Slug уже используется' })
  }

  const instruction = await prisma.instruction.update({
    where: { id },
    data: {
      title: body.title,
      slug: body.slug,
      description: body.description,
      language: body.language,
      productGroupId: body.productGroupId,
      draftContent: body.draftContent ?? undefined
    }
  })
  return { instruction }
})
