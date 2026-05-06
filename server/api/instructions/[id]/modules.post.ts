import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { z } from 'zod'

const schema = z.object({
  tenantModuleConfigId: z.string(),
  position: z.number().int().min(0).default(0),
  slot: z.enum(['before', 'after', 'sidebar']).default('after'),
  configOverride: z.record(z.string(), z.any()).optional()
})

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, schema.parse)

  const [instr, cfg] = await Promise.all([
    prisma.instruction.findFirst({ where: { id, tenantId: tenant.id } }),
    prisma.tenantModuleConfig.findFirst({ where: { id: body.tenantModuleConfigId, tenantId: tenant.id } })
  ])
  if (!instr || !cfg) throw createError({ statusCode: 404 })

  const att = await prisma.instructionModuleAttachment.upsert({
    where: { instructionId_tenantModuleConfigId: { instructionId: id, tenantModuleConfigId: body.tenantModuleConfigId } },
    update: { position: body.position, slot: body.slot, configOverride: body.configOverride ?? {} },
    create: {
      instructionId: id,
      tenantModuleConfigId: body.tenantModuleConfigId,
      position: body.position,
      slot: body.slot,
      configOverride: body.configOverride ?? {}
    }
  })
  return { attachment: att }
})
