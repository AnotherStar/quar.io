import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { z } from 'zod'

const schema = z.object({
  sectionId: z.string(),
  position: z.number().int().min(0).default(0),
  slot: z.enum(['before', 'after', 'sidebar']).default('after')
})

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, schema.parse)
  const [instr, section] = await Promise.all([
    prisma.instruction.findFirst({ where: { id, tenantId: tenant.id } }),
    prisma.section.findFirst({ where: { id: body.sectionId, tenantId: tenant.id } })
  ])
  if (!instr || !section) throw createError({ statusCode: 404 })

  const att = await prisma.instructionSectionAttachment.upsert({
    where: { instructionId_sectionId: { instructionId: id, sectionId: body.sectionId } },
    update: { position: body.position, slot: body.slot },
    create: { instructionId: id, sectionId: body.sectionId, position: body.position, slot: body.slot }
  })
  return { attachment: att }
})
