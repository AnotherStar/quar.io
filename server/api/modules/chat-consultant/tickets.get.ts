import { z } from 'zod'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

const querySchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'CLOSED', 'all']).optional().default('all')
})

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const query = querySchema.parse(getQuery(event))
  const items = await prisma.supportTicket.findMany({
    where: {
      tenantId: tenant.id,
      ...(query.status === 'all' ? {} : { status: query.status })
    },
    orderBy: { updatedAt: 'desc' },
    take: 200,
    include: {
      customer: true,
      instruction: { select: { id: true, title: true, slug: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  })

  return {
    items: items.map((ticket) => ({
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
      lastMessage: ticket.messages[0]
        ? {
            id: ticket.messages[0].id,
            sender: ticket.messages[0].sender.toLowerCase(),
            text: ticket.messages[0].text,
            mediaKind: ticket.messages[0].mediaKind.toLowerCase(),
            createdAt: ticket.messages[0].createdAt
          }
        : null
    }))
  }
})
