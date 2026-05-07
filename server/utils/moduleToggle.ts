// Shared toggle/upsert handler for `PUT /api/modules/<code>`.
// Lives here because Nitro's file router matches static dirs (feedback/,
// warranty/) before dynamic siblings ([code].put.ts) and does NOT fall
// through to the dynamic handler when the static branch lacks a method
// match. So each shadowing dir provides its own thin index.put.ts that
// calls this utility with the correct code.
import type { H3Event } from 'h3'
import { z } from 'zod'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

const schema = z.object({
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.any()).default({})
})

export async function toggleModule(event: H3Event, code: string) {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, schema.parse)
  const manifest = await prisma.moduleManifest.findUnique({ where: { code } })
  if (!manifest) throw createError({ statusCode: 404, statusMessage: `Module "${code}" not found` })

  const cfg = await prisma.tenantModuleConfig.upsert({
    where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: manifest.id } },
    update: { enabled: body.enabled, config: body.config },
    create: { tenantId: tenant.id, moduleId: manifest.id, enabled: body.enabled, config: body.config }
  })
  return { tenantConfig: cfg }
}
