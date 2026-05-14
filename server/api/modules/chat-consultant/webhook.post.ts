import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { getTelegramWebhookUrl, normalizeSupportConfig, telegramApi } from '~~/server/utils/telegramSupport'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const row = await prisma.tenantModuleConfig.findFirst({
    where: { tenantId: tenant.id, module: { code: 'chat-consultant' } }
  })
  const config = normalizeSupportConfig(row?.config)
  if (!row || !row.enabled || !config.botToken || !config.webhookSecret) {
    throw createError({ statusCode: 400, statusMessage: 'Сначала сохраните token бота и включите модуль' })
  }

  const webhookUrl = getTelegramWebhookUrl(row.id, config.webhookSecret)
  await telegramApi(config.botToken, 'setWebhook', {
    url: webhookUrl,
    secret_token: config.webhookSecret,
    allowed_updates: ['message', 'callback_query']
  })

  return { ok: true, webhookUrl }
})
