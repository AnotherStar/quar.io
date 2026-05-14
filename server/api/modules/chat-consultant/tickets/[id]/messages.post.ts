import { z } from 'zod'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { getChatModuleConfig, isWebSupportCustomer, telegramApi, type TelegramMessage } from '~~/server/utils/telegramSupport'

const schema = z.object({
  text: z.string().trim().max(4000).optional(),
  mediaAssetId: z.string().optional()
}).refine((v) => Boolean(v.text || v.mediaAssetId), { message: 'Введите текст или прикрепите файл' })

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, schema.parse)
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, tenantId: tenant.id },
    include: { customer: true }
  })
  if (!ticket) throw createError({ statusCode: 404 })
  if (ticket.status === 'CLOSED') {
    throw createError({ statusCode: 400, statusMessage: 'Тикет закрыт' })
  }

  let asset: { id: string; url: string; mimeType: string; key: string } | null = null
  if (body.mediaAssetId) {
    asset = await prisma.mediaAsset.findFirst({
      where: { id: body.mediaAssetId, tenantId: tenant.id },
      select: { id: true, url: true, mimeType: true, key: true }
    })
    if (!asset) throw createError({ statusCode: 404, statusMessage: 'Файл не найден' })
  }

  let sent: TelegramMessage | null = null
  const chatConfig = await getChatModuleConfig(tenant.id)
  const canSendTelegram = !isWebSupportCustomer(ticket.customer.telegramUserId) && chatConfig?.row.enabled && chatConfig.config.botToken
  if (canSendTelegram) {
    const botToken = chatConfig.config.botToken!
    if (asset?.mimeType.startsWith('image/')) {
      sent = await telegramApi<TelegramMessage>(botToken, 'sendPhoto', {
        chat_id: ticket.customer.chatId,
        photo: asset.url,
        caption: body.text || undefined
      })
    } else if (asset) {
      sent = await telegramApi<TelegramMessage>(botToken, 'sendDocument', {
        chat_id: ticket.customer.chatId,
        document: asset.url,
        caption: body.text || undefined
      })
    } else {
      sent = await telegramApi<TelegramMessage>(botToken, 'sendMessage', {
        chat_id: ticket.customer.chatId,
        text: body.text
      })
    }
  }

  const mediaKind = asset?.mimeType.startsWith('image/') ? 'PHOTO' : asset ? 'DOCUMENT' : 'TEXT'
  const message = await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      sender: 'OPERATOR',
      text: body.text || null,
      mediaKind,
      mediaUrl: asset?.url,
      mediaFileName: asset?.key.split('/').pop(),
      telegramChatId: sent ? ticket.customer.chatId : undefined,
      telegramMessageId: sent ? String(sent.message_id) : undefined,
      operatorUserId: user.id,
      operatorName: user.name ?? user.email
    }
  })
  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status: 'PENDING', updatedAt: new Date() }
  })

  return {
    message: {
      id: message.id,
      sender: message.sender.toLowerCase(),
      text: message.text,
      mediaKind: message.mediaKind.toLowerCase(),
      mediaUrl: message.mediaUrl,
      mediaFileName: message.mediaFileName,
      operatorName: message.operatorName,
      createdAt: message.createdAt
    }
  }
})
