import { randomBytes } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'

export interface TelegramSupportConfig {
  botToken?: string
  botUsername?: string
  supportChatId?: string
  workingHours?: string
  buttonLabel?: string
  welcomeMessage?: string
  closedMessage?: string
  webhookSecret?: string
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}

export interface TelegramMessage {
  message_id: number
  chat: { id: number | string; type: string; title?: string }
  from?: TelegramUser
  text?: string
  caption?: string
  document?: { file_id: string; file_name?: string; mime_type?: string }
  photo?: Array<{ file_id: string; width: number; height: number }>
  reply_to_message?: TelegramMessage
}

export interface TelegramUser {
  id: number | string
  is_bot?: boolean
  first_name?: string
  last_name?: string
  username?: string
}

export function normalizeSupportConfig(config: unknown): TelegramSupportConfig {
  return (config && typeof config === 'object' ? config : {}) as TelegramSupportConfig
}

export function createWebhookSecret() {
  return randomBytes(24).toString('hex')
}

export function getTelegramWebhookBaseUrl() {
  const cfg = useRuntimeConfig()
  return cfg.telegramSupport.webhookBaseUrl || cfg.public.appUrl
}

export function getTelegramWebhookUrl(configId: string, secret: string) {
  return `${getTelegramWebhookBaseUrl().replace(/\/$/, '')}/api/telegram-support/webhook/${configId}?secret=${encodeURIComponent(secret)}`
}

export function maskBotToken(token?: string) {
  if (!token) return ''
  const [id, secret] = token.split(':')
  if (!id || !secret) return '••••••'
  return `${id}:${secret.slice(0, 4)}••••${secret.slice(-4)}`
}

export function webSupportCustomerKey(sessionId: string) {
  return `web:${sessionId}`
}

export function isWebSupportCustomer(telegramUserId: string) {
  return telegramUserId.startsWith('web:')
}

export async function telegramApi<T = any>(
  botToken: string,
  method: string,
  payload: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.ok) {
    const description = data?.description ?? `Telegram ${method} failed`
    throw createError({ statusCode: 502, statusMessage: description })
  }
  return data.result as T
}

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function telegramName(user?: TelegramUser | null) {
  if (!user) return 'Оператор'
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || String(user.id)
}

export function getMessageText(message: TelegramMessage) {
  return message.text ?? message.caption ?? ''
}

export function getMessageMedia(message: TelegramMessage): {
  kind: 'TEXT' | 'PHOTO' | 'DOCUMENT'
  fileId?: string
  fileName?: string
} {
  if (message.document) {
    return { kind: 'DOCUMENT', fileId: message.document.file_id, fileName: message.document.file_name }
  }
  if (message.photo?.length) {
    return { kind: 'PHOTO', fileId: message.photo[message.photo.length - 1]?.file_id }
  }
  return { kind: 'TEXT' }
}

export async function getChatModuleConfig(tenantId: string) {
  const row = await prisma.tenantModuleConfig.findFirst({
    where: {
      tenantId,
      module: { code: 'chat-consultant' }
    },
    include: { module: true }
  })
  if (!row) return null
  const config = normalizeSupportConfig(row.config)
  return { row, config }
}

export async function requireChatModuleConfig(tenantId: string) {
  const data = await getChatModuleConfig(tenantId)
  if (!data?.row.enabled) {
    throw createError({ statusCode: 400, statusMessage: 'Модуль поддержки выключен' })
  }
  if (!data.config.botToken || !data.config.supportChatId) {
    throw createError({ statusCode: 400, statusMessage: 'Telegram bot token и группа поддержки не настроены' })
  }
  return data
}

export async function sendTicketToSupportGroup(params: {
  botToken: string
  supportChatId: string
  ticket: Prisma.SupportTicketGetPayload<{
    include: {
      customer: true
      instruction: { include: { productGroup: true; tenant: true } }
    }
  }>
  message: TelegramMessage
  appUrl: string
}) {
  const customer = params.ticket.customer
  const instruction = params.ticket.instruction
  const text = getMessageText(params.message)
  const media = getMessageMedia(params.message)
  const customerLabel = [
    customer.firstName,
    customer.lastName,
    customer.username ? `@${customer.username}` : null
  ].filter(Boolean).join(' ')

  const body = [
    `🟡 <b>Новый вопрос #${params.ticket.id.slice(-6)}</b>`,
    '',
    `Товар: ${escapeHtml(instruction?.productGroup?.name ?? '—')}`,
    `Инструкция: ${escapeHtml(instruction?.title ?? '—')}`,
    `Покупатель: ${escapeHtml(customerLabel || '—')}`,
    `Telegram ID: ${escapeHtml(customer.telegramUserId)}`,
    '',
    'Сообщение:',
    escapeHtml(text || (media.kind === 'PHOTO' ? '[Фото]' : media.kind === 'DOCUMENT' ? `[Файл: ${media.fileName ?? 'document'}]` : '—')),
    '',
    'Оператор: ответьте reply-сообщением на это сообщение, чтобы отправить ответ покупателю.'
  ].join('\n')

  const instructionUrl = instruction
    ? `${params.appUrl.replace(/\/$/, '')}/${instruction.tenant.slug}/${instruction.slug}`
    : params.appUrl

  const supportMessage = await telegramApi<TelegramMessage>(params.botToken, 'sendMessage', {
    chat_id: params.supportChatId,
    text: body,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Взять в работу', callback_data: `support_take:${params.ticket.id}` },
          { text: 'Закрыть', callback_data: `support_close:${params.ticket.id}` }
        ],
        [{ text: 'Открыть инструкцию', url: instructionUrl }]
      ]
    }
  })

  return supportMessage
}
