import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { webSupportCustomerKey } from '~~/server/utils/telegramSupport'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const querySchema = z.object({
  sessionId: z.string().min(8).max(80)
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const query = querySchema.parse(getQuery(event))
  const customerKey = webSupportCustomerKey(query.sessionId)

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
    res.write(`event: messages\ndata: ${JSON.stringify(payload)}\n\n`)
    ;(res as any).flush?.()
  }

  let lastSignature = ''
  while (!closed && !res.destroyed && !res.writableEnded) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        customer: true,
        messages: { orderBy: { createdAt: 'asc' } }
      }
    })
    if (!ticket || ticket.customer.telegramUserId !== customerKey) break

    const signature = `${ticket.updatedAt}:${ticket.status}:${ticket.messages.length}:${ticket.messages.at(-1)?.id ?? ''}`
    if (signature !== lastSignature) {
      lastSignature = signature
      send({
        messages: ticket.messages.map((message) => ({
          id: message.id,
          sender: message.sender.toLowerCase(),
          text: message.text,
          mediaKind: message.mediaKind.toLowerCase(),
          mediaFileName: message.mediaFileName,
          mediaUrl: message.mediaUrl,
          createdAt: message.createdAt
        }))
      })
    } else {
      res.write(': keepalive\n\n')
    }
    await sleep(1000)
  }

  res.end()
})
