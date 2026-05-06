import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(300).optional(),
  content: z.any().optional()
})

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, schema.parse)
  const exists = await prisma.section.findFirst({ where: { id, tenantId: tenant.id } })
  if (!exists) throw createError({ statusCode: 404 })
  const section = await prisma.section.update({
    where: { id },
    data: { name: body.name, description: body.description, content: body.content ?? undefined }
  })
  return { section }
})
