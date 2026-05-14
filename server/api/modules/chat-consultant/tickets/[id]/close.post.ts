import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { getChatModuleConfig, isWebSupportCustomer, telegramApi } from '~~/server/utils/telegramSupport'

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, tenantId: tenant.id },
    include: { customer: true }
  })
  if (!ticket) throw createError({ statusCode: 404 })
  if (ticket.status === 'CLOSED') return { ok: true }

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
      operatorUserId: user.id,
      operatorName: user.name ?? user.email
    }
  })
  const chatConfig = await getChatModuleConfig(tenant.id)
  if (!isWebSupportCustomer(ticket.customer.telegramUserId) && chatConfig?.row.enabled && chatConfig.config.botToken) {
    await telegramApi(chatConfig.config.botToken, 'sendMessage', {
      chat_id: ticket.customer.chatId,
      text: chatConfig.config.closedMessage || 'Спасибо за обращение! Если вопрос останется, напишите нам снова.'
    })
  }

  return { ok: true }
})
