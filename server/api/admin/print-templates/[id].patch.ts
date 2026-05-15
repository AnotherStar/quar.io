// Переключение публичности печатного шаблона. Только админ.
import { z } from 'zod'
import { requireAdmin } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'

const BodySchema = z.object({
  isPublic: z.boolean()
})

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, BodySchema.parse)

  const updated = await prisma.printTemplateDesign.update({
    where: { id },
    data: { isPublic: body.isPublic },
    select: { id: true, isPublic: true }
  })

  return updated
})
