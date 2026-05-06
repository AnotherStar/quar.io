import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeatures } from '~~/server/utils/plan'
import { EMPTY_DOC } from '~~/shared/types/instruction'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  content: z.any().optional()
})

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  // Custom sections require paid plan; we still allow creation but flag it,
  // because public renderer hides them when plan is inactive (data preserved).
  // Editor UI should communicate this.
  const features = effectiveFeatures(tenant)
  if (!features.customSections) {
    throw createError({ statusCode: 402, statusMessage: 'Кастомные секции доступны на Plus и выше' })
  }
  const body = await readValidatedBody(event, schema.parse)
  const section = await prisma.section.create({
    data: {
      tenantId: tenant.id,
      name: body.name,
      description: body.description,
      content: body.content ?? (EMPTY_DOC as object)
    }
  })
  return { section }
})
