import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const id = getRouterParam(event, 'id')!

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  })
  const res = event.node.res
  ;(res as any).flushHeaders?.()

  let closed = false
  res.on('close', () => { closed = true })

  const send = (payload: unknown) => {
    if (closed || res.destroyed || res.writableEnded) return
    res.write(`event: ticket\ndata: ${JSON.stringify(payload)}\n\n`)
    ;(res as any).flush?.()
  }

  let lastSignature = ''
  while (!closed && !res.destroyed && !res.writableEnded) {
    const ticket = await loadTicket(id, tenant.id)
    if (!ticket) break
    const signature = `${ticket.updatedAt}:${ticket.status}:${ticket.messages.length}:${ticket.messages.at(-1)?.id ?? ''}`
    if (signature !== lastSignature) {
      lastSignature = signature
      send({ ticket })
    } else {
      res.write(': keepalive\n\n')
    }
    await sleep(1000)
  }

  res.end()
})

async function loadTicket(id: string, tenantId: string) {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, tenantId },
    include: {
      customer: true,
      instruction: { select: { id: true, title: true, slug: true } },
      messages: { orderBy: { createdAt: 'asc' } }
    }
  })
  if (!ticket) return null
  return {
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
