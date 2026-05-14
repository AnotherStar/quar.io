import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const id = getRouterParam(event, 'id')!
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, tenantId: tenant.id },
    include: {
      customer: true,
      instruction: { select: { id: true, title: true, slug: true } },
      messages: { orderBy: { createdAt: 'asc' } }
    }
  })
  if (!ticket) throw createError({ statusCode: 404 })

  return {
    ticket: {
      id: ticket.id,
      status: ticket.status.toLowerCase(),
      assignedOperatorName: ticket.assignedOperatorName,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      closedAt: ticket.closedAt,
      customer: {
        id: ticket.customer.id,
        telegramUserId: ticket.customer.telegramUserId,
        username: ticket.customer.username,
        firstName: ticket.customer.firstName,
        lastName: ticket.customer.lastName
      },
      instruction: ticket.instruction,
      messages: ticket.messages.map((message) => ({
        id: message.id,
        sender: message.sender.toLowerCase(),
        text: message.text,
        mediaKind: message.mediaKind.toLowerCase(),
        mediaFileName: message.mediaFileName,
        mediaUrl: message.mediaUrl,
        operatorName: message.operatorName,
        createdAt: message.createdAt
      }))
    }
  }
})
