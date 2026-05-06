import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { z } from 'zod'

const schema = z.object({
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.any()).default({})
})

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const code = getRouterParam(event, 'code')!
  const body = await readValidatedBody(event, schema.parse)
  const manifest = await prisma.moduleManifest.findUnique({ where: { code } })
  if (!manifest) throw createError({ statusCode: 404 })

  const cfg = await prisma.tenantModuleConfig.upsert({
    where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: manifest.id } },
    update: { enabled: body.enabled, config: body.config },
    create: { tenantId: tenant.id, moduleId: manifest.id, enabled: body.enabled, config: body.config }
  })
  return { tenantConfig: cfg }
})
