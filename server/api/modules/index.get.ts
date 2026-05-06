import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeatures, planAllowsModule } from '~~/server/utils/plan'

// Returns all modules with: tenant config (if any) + whether allowed by current plan.
export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const features = effectiveFeatures(tenant)

  const [manifests, configs] = await Promise.all([
    prisma.moduleManifest.findMany({ where: { isActive: true } }),
    prisma.tenantModuleConfig.findMany({ where: { tenantId: tenant.id } })
  ])

  return {
    modules: manifests.map((m) => {
      const cfg = configs.find((c) => c.moduleId === m.id)
      return {
        id: m.id,
        code: m.code,
        name: m.name,
        description: m.description,
        version: m.version,
        configSchema: m.configSchema,
        requiresPlan: m.requiresPlan,
        allowedByPlan: planAllowsModule(features, m.code),
        tenantConfig: cfg
          ? { id: cfg.id, enabled: cfg.enabled, config: cfg.config, updatedAt: cfg.updatedAt }
          : null
      }
    })
  }
})
