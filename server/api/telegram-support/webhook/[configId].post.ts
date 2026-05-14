import { prisma } from '~~/server/utils/prisma'
import {
  escapeHtml,
  getMessageMedia,
  getMessageText,
  isWebSupportCustomer,
  normalizeSupportConfig,
  sendTicketToSupportGroup,
  telegramApi,
  telegramName,
  type TelegramMessage,
  type TelegramUpdate
} from '~~/server/utils/telegramSupport'

function chatId(value: string | number) {
  return String(value)
}

function parseInstructionPayload(text?: string) {
  const payload = text?.match(/^\/start(?:@\w+)?\s+instruction_([A-Za-z0-9_-]+)$/)?.[1]
  return payload || null
}

export default defineEventHandler(async (event) => {
  const configId = getRouterParam(event, 'configId')!
  const query = getQuery(event)
  const update = await readBody<TelegramUpdate>(event)

  const tenantConfig = await prisma.tenantModuleConfig.findUnique({
    where: { id: configId },
    include: { tenant: true, module: true }
  })
  if (!tenantConfig || tenantConfig.module.code !== 'chat-consultant' || !tenantConfig.enabled) {
    throw createError({ statusCode: 404 })
  }

  const config = normalizeSupportConfig(tenantConfig.config)
  const secret = getRequestHeader(event, 'x-telegram-bot-api-secret-token') || query.secret
  if (config.webhookSecret && secret !== config.webhookSecret) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid Telegram webhook secret' })
  }
  if (!config.botToken || !config.supportChatId) {
    throw createError({ statusCode: 400, statusMessage: 'Telegram support is not configured' })
  }

  if (update.callback_query) {
    await handleCallback(update.callback_query, tenantConfig.tenantId, config.botToken, config.supportChatId, config.closedMessage)
    return { ok: true }
  }

  const message = update.message
  if (!message || message.from?.is_bot) return { ok: true }

  if (chatId(message.chat.id) === chatId(config.supportChatId)) {
    await handleSupportReply(message, tenantConfig.tenantId, config.botToken, config.supportChatId)
    return { ok: true }
  }

  if (message.chat.type === 'private') {
    await handleCustomerMessage(message, tenantConfig.tenantId, config.botToken, config.supportChatId, config.welcomeMessage)
  }

  return { ok: true }
})

async function handleCustomerMessage(
  message: TelegramMessage,
  tenantId: string,
  botToken: string,
  supportChatId: string,
  welcomeMessage?: string
) {
  const from = message.from
  if (!from) return

  const telegramUserId = chatId(from.id)
  const instructionPayload = parseInstructionPayload(message.text)
  const instruction = instructionPayload
    ? await prisma.instruction.findFirst({
        where: { id: instructionPayload, tenantId },
        include: { productGroup: true, tenant: true }
      })
    : null

  const customer = await prisma.supportCustomer.upsert({
    where: { tenantId_telegramUserId: { tenantId, telegramUserId } },
    update: {
      chatId: chatId(message.chat.id),
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      instructionId: instruction?.id,
      lastStartedAt: instructionPayload ? new Date() : undefined
    },
    create: {
      tenantId,
      instructionId: instruction?.id,
      telegramUserId,
      chatId: chatId(message.chat.id),
      username: from.username,
      firstName: from.first_name,
      lastName: from.last_name,
      lastStartedAt: instructionPayload ? new Date() : undefined
    }
  })

  if (instructionPayload) {
    await telegramApi(botToken, 'sendMessage', {
      chat_id: customer.chatId,
      text: welcomeMessage || 'Здравствуйте! Напишите ваш вопрос, мы ответим здесь.'
    })
    return
  }

  const instructionId = customer.instructionId
  if (!instructionId) {
    await telegramApi(botToken, 'sendMessage', {
      chat_id: customer.chatId,
      text: 'Откройте чат кнопкой на странице инструкции, чтобы мы поняли, по какому товару вопрос.'
    })
    return
  }

  let ticket = await prisma.supportTicket.findFirst({
    where: {
      tenantId,
      customerId: customer.id,
      instructionId,
      status: { in: ['OPEN', 'PENDING'] }
    },
    include: { customer: true, instruction: { include: { productGroup: true, tenant: true } } },
    orderBy: { updatedAt: 'desc' }
  })
  if (!ticket) {
    ticket = await prisma.supportTicket.create({
      data: { tenantId, customerId: customer.id, instructionId, status: 'OPEN' },
      include: { customer: true, instruction: { include: { productGroup: true, tenant: true } } }
    })
  }

  const media = getMessageMedia(message)
  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      sender: 'CUSTOMER',
      text: getMessageText(message) || null,
      mediaKind: media.kind,
      mediaFileId: media.fileId,
      mediaFileName: media.fileName,
      telegramChatId: chatId(message.chat.id),
      telegramMessageId: String(message.message_id)
    }
  })
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } })

  const runtimeConfig = useRuntimeConfig()
  const supportMessage = await sendTicketToSupportGroup({
    botToken,
    supportChatId,
    ticket,
    message,
    appUrl: runtimeConfig.public.appUrl
  })
  if (media.kind !== 'TEXT') {
    await telegramApi(botToken, 'copyMessage', {
      chat_id: supportChatId,
      from_chat_id: customer.chatId,
      message_id: message.message_id
    }).catch(() => null)
  }

  await prisma.supportMessageMap.create({
    data: {
      ticketId: ticket.id,
      supportChatId: chatId(supportChatId),
      supportMessageId: String(supportMessage.message_id),
      customerChatId: customer.chatId,
      customerMessageId: String(message.message_id)
    }
  })
}

async function handleSupportReply(
  message: TelegramMessage,
  tenantId: string,
  botToken: string,
  supportChatId: string
) {
  if (!message.reply_to_message) {
    await telegramApi(botToken, 'sendMessage', {
      chat_id: supportChatId,
      text: 'Чтобы ответить покупателю, нажмите Reply на сообщение с обращением.',
      reply_to_message_id: message.message_id
    })
    return
  }

  const map = await prisma.supportMessageMap.findUnique({
    where: {
      supportChatId_supportMessageId: {
        supportChatId: chatId(supportChatId),
        supportMessageId: String(message.reply_to_message.message_id)
      }
    },
    include: {
      ticket: {
        include: {
          customer: true,
          instruction: true
        }
      }
    }
  })
  if (!map || map.ticket.tenantId !== tenantId || map.ticket.status === 'CLOSED') return

  const media = getMessageMedia(message)
  let sent: TelegramMessage | null = null
  const isWebTicket = isWebSupportCustomer(map.ticket.customer.telegramUserId)
  if (media.kind === 'TEXT') {
    if (!getMessageText(message)) {
      await telegramApi(botToken, 'sendMessage', {
        chat_id: supportChatId,
        text: 'Пока поддерживаются текст, фото и файлы.',
        reply_to_message_id: message.message_id
      })
      return
    }
    if (!isWebTicket) {
      sent = await telegramApi<TelegramMessage>(botToken, 'sendMessage', {
        chat_id: map.customerChatId,
        text: getMessageText(message)
      })
    }
  } else {
    if (!isWebTicket) {
      sent = await telegramApi<TelegramMessage>(botToken, 'copyMessage', {
        chat_id: map.customerChatId,
        from_chat_id: supportChatId,
        message_id: message.message_id
      })
    }
  }

  await prisma.supportMessage.create({
    data: {
      ticketId: map.ticketId,
      sender: 'OPERATOR',
      text: getMessageText(message) || null,
      mediaKind: media.kind,
      mediaFileId: media.fileId,
      mediaFileName: media.fileName,
      telegramChatId: chatId(message.chat.id),
      telegramMessageId: String(message.message_id),
      operatorName: telegramName(message.from)
    }
  })
  await prisma.supportTicket.update({
    where: { id: map.ticketId },
    data: { status: 'PENDING', updatedAt: new Date() }
  })

  await prisma.supportMessageMap.create({
    data: {
      ticketId: map.ticketId,
      supportChatId: chatId(supportChatId),
      supportMessageId: String(message.message_id),
      customerChatId: map.customerChatId,
      customerMessageId: sent ? String(sent.message_id) : null
    }
  }).catch(() => null)

  await telegramApi(botToken, 'sendMessage', {
    chat_id: supportChatId,
    text: '✅ Ответ отправлен покупателю',
    reply_to_message_id: message.message_id
  })
}

async function handleCallback(
  callback: NonNullable<TelegramUpdate['callback_query']>,
  tenantId: string,
  botToken: string,
  supportChatId: string,
  closedMessage?: string
) {
  const data = callback.data ?? ''
  const [action, ticketId] = data.split(':')
  if (!ticketId || !['support_take', 'support_close'].includes(action)) return

  const ticket = await prisma.supportTicket.findFirst({
    where: { id: ticketId, tenantId },
    include: { customer: true }
  })
  if (!ticket) return

  await telegramApi(botToken, 'answerCallbackQuery', { callback_query_id: callback.id })

  if (action === 'support_take') {
    const operatorName = telegramName(callback.from)
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: 'PENDING',
        assignedOperatorTelegramId: chatId(callback.from.id),
        assignedOperatorName: operatorName
      }
    })
    await telegramApi(botToken, 'sendMessage', {
      chat_id: supportChatId,
      text: `👤 Взял в работу: ${escapeHtml(operatorName)}`,
      parse_mode: 'HTML',
      reply_to_message_id: callback.message?.message_id
    })
    return
  }

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status: 'CLOSED', closedAt: new Date() }
  })
  await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      sender: 'SYSTEM',
      text: 'Тикет закрыт',
      mediaKind: 'TEXT',
      operatorName: telegramName(callback.from)
    }
  })
  await telegramApi(botToken, 'sendMessage', {
    chat_id: ticket.customer.chatId,
    text: closedMessage || 'Спасибо за обращение! Если вопрос останется, напишите нам снова.'
  })
  await telegramApi(botToken, 'sendMessage', {
    chat_id: supportChatId,
    text: `✅ Тикет #${ticket.id.slice(-6)} закрыт`,
    reply_to_message_id: callback.message?.message_id
  })
}
