import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeatures, planAllowsModule } from '~~/server/utils/plan'
import { isModuleAttachedToPublished } from '~~/server/utils/moduleAttached'
import {
  getChatModuleConfig,
  sendTicketToSupportGroup,
  webSupportCustomerKey,
  type TelegramMessage
} from '~~/server/utils/telegramSupport'

const schema = z.object({
  instructionId: z.string(),
  sessionId: z.string().min(8).max(80),
  text: z.string().trim().min(1).max(4000),
  name: z.string().trim().max(160).optional(),
  email: z.string().trim().email().max(160).optional()
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)
  const instruction = await prisma.instruction.findUnique({
    where: { id: body.instructionId },
    include: {
      tenant: { include: { subscription: { include: { plan: true } } } },
      productGroup: true
    }
  })
  if (!instruction || instruction.status !== 'PUBLISHED') throw createError({ statusCode: 404 })

  const features = effectiveFeatures(instruction.tenant)
  if (!planAllowsModule(features, 'chat-consultant')) {
    throw createError({ statusCode: 402, statusMessage: 'Модуль недоступен на текущем тарифе' })
  }
  const attached = await isModuleAttachedToPublished(instruction.id, 'chat-consultant')
  if (!attached) {
    throw createError({ statusCode: 404, statusMessage: 'Модуль не подключён к инструкции' })
  }

  const key = webSupportCustomerKey(body.sessionId)
  const customer = await prisma.supportCustomer.upsert({
    where: { tenantId_telegramUserId: { tenantId: instruction.tenantId, telegramUserId: key } },
    update: {
      instructionId: instruction.id,
      chatId: key,
      firstName: body.name,
      username: body.email
    },
    create: {
      tenantId: instruction.tenantId,
      instructionId: instruction.id,
      telegramUserId: key,
      chatId: key,
      firstName: body.name,
      username: body.email
    }
  })

  let ticket = await prisma.supportTicket.findFirst({
    where: {
      tenantId: instruction.tenantId,
      customerId: customer.id,
      instructionId: instruction.id,
      status: { in: ['OPEN', 'PENDING'] }
    },
    include: { customer: true, instruction: { include: { productGroup: true, tenant: true } } },
    orderBy: { updatedAt: 'desc' }
  })
  if (!ticket) {
    ticket = await prisma.supportTicket.create({
      data: { tenantId: instruction.tenantId, customerId: customer.id, instructionId: instruction.id, status: 'OPEN' },
      include: { customer: true, instruction: { include: { productGroup: true, tenant: true } } }
    })
  }

  const message = await prisma.supportMessage.create({
    data: {
      ticketId: ticket.id,
      sender: 'CUSTOMER',
      text: body.text,
      mediaKind: 'TEXT',
      metadata: { source: 'site', sessionId: body.sessionId }
    }
  })
  await prisma.supportTicket.update({ where: { id: ticket.id }, data: { updatedAt: new Date() } })

  const chatConfig = await getChatModuleConfig(instruction.tenantId)
  if (chatConfig?.row.enabled && chatConfig.config.botToken && chatConfig.config.supportChatId) {
    const pseudoMessage: TelegramMessage = {
      message_id: Date.now(),
      chat: { id: key, type: 'private' },
      from: {
        id: key,
        first_name: body.name || 'Покупатель',
        username: body.email
      },
      text: body.text
    }
    const runtimeConfig = useRuntimeConfig()
    const supportMessage = await sendTicketToSupportGroup({
      botToken: chatConfig.config.botToken,
      supportChatId: chatConfig.config.supportChatId,
      ticket,
      message: pseudoMessage,
      appUrl: runtimeConfig.public.appUrl
    }).catch(() => null)

    if (supportMessage) {
      await prisma.supportMessageMap.create({
        data: {
          ticketId: ticket.id,
          supportChatId: chatConfig.config.supportChatId,
          supportMessageId: String(supportMessage.message_id),
          customerChatId: key,
          customerMessageId: message.id
        }
      }).catch(() => null)
    }
  }

  return {
    ticketId: ticket.id,
    message: {
      id: message.id,
      sender: message.sender.toLowerCase(),
      text: message.text,
      mediaKind: message.mediaKind.toLowerCase(),
      createdAt: message.createdAt
    }
  }
})
