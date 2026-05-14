import { z } from 'zod'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { createWebhookSecret, getTelegramWebhookUrl, maskBotToken, normalizeSupportConfig } from '~~/server/utils/telegramSupport'

const schema = z.object({
  enabled: z.boolean().default(true),
  config: z.object({
    botToken: z.string().trim().optional().default(''),
    botUsername: z.string().trim().optional().default(''),
    supportChatId: z.string().trim().optional().default(''),
    workingHours: z.string().trim().optional().default('Пн–Пт 10:00–19:00'),
    buttonLabel: z.string().trim().optional().default('Задать вопрос в Telegram'),
    welcomeMessage: z.string().trim().optional().default('Здравствуйте! Напишите ваш вопрос, мы ответим здесь.'),
    closedMessage: z.string().trim().optional().default('Спасибо за обращение! Если вопрос останется, напишите нам снова.'),
    webhookSecret: z.string().trim().optional()
  }).default({})
})

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, schema.parse)
  const manifest = await prisma.moduleManifest.findUnique({ where: { code: 'chat-consultant' } })
  if (!manifest) throw createError({ statusCode: 404, statusMessage: 'Module "chat-consultant" not found' })

  const existing = await prisma.tenantModuleConfig.findUnique({
    where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: manifest.id } }
  })
  const previous = normalizeSupportConfig(existing?.config)
  const incoming = body.config
  const botToken = incoming.botToken && !incoming.botToken.includes('••••')
    ? incoming.botToken
    : previous.botToken ?? ''
  const webhookSecret = previous.webhookSecret || incoming.webhookSecret || createWebhookSecret()

  const config = {
    ...previous,
    ...incoming,
    botToken,
    botUsername: incoming.botUsername.replace(/^@/, ''),
    webhookSecret
  }

  const cfg = await prisma.tenantModuleConfig.upsert({
    where: { tenantId_moduleId: { tenantId: tenant.id, moduleId: manifest.id } },
    update: { enabled: body.enabled, config },
    create: { tenantId: tenant.id, moduleId: manifest.id, enabled: body.enabled, config }
  })

  return {
    tenantConfig: {
      id: cfg.id,
      enabled: cfg.enabled,
      config: {
        ...config,
        botToken: maskBotToken(config.botToken)
      },
      webhookUrl: getTelegramWebhookUrl(cfg.id, webhookSecret),
      updatedAt: cfg.updatedAt
    }
  }
})
