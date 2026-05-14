import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { webSupportCustomerKey } from '~~/server/utils/telegramSupport'

const querySchema = z.object({
  sessionId: z.string().min(8).max(80)
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const query = querySchema.parse(getQuery(event))
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      customer: true,
      messages: { orderBy: { createdAt: 'asc' } }
    }
  })
  if (!ticket || ticket.customer.telegramUserId !== webSupportCustomerKey(query.sessionId)) {
    throw createError({ statusCode: 404 })
  }

  return {
    ticket: {
      id: ticket.id,
      status: ticket.status.toLowerCase(),
      messages: ticket.messages.map((message) => ({
        id: message.id,
        sender: message.sender.toLowerCase(),
        text: message.text,
        mediaKind: message.mediaKind.toLowerCase(),
        mediaFileName: message.mediaFileName,
        mediaUrl: message.mediaUrl,
        createdAt: message.createdAt
      }))
    }
  }
})
