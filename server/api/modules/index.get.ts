import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeatures, planAllowsModule } from '~~/server/utils/plan'
import { getTelegramWebhookUrl, maskBotToken, normalizeSupportConfig } from '~~/server/utils/telegramSupport'

// Returns all modules with: tenant config (if any) + whether allowed by current plan.
export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const features = effectiveFeatures(tenant)

  const [manifests, configs] = await Promise.all([
    prisma.moduleManifest.findMany({ where: { isActive: true } }),
    prisma.tenantModuleConfig.findMany({ where: { tenantId: tenant.id } })
  ])

  function dashboardConfig(moduleCode: string, config: unknown, configId: string) {
    if (moduleCode !== 'chat-consultant') return config
    const normalized = normalizeSupportConfig(config)
    return {
      ...normalized,
      botToken: maskBotToken(normalized.botToken),
      webhookUrl: normalized.webhookSecret ? getTelegramWebhookUrl(configId, normalized.webhookSecret) : null
    }
  }

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
          ? { id: cfg.id, enabled: cfg.enabled, config: dashboardConfig(m.code, cfg.config, cfg.id), updatedAt: cfg.updatedAt }
          : null
      }
    })
  }
})
