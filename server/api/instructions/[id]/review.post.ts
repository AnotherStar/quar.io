import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { z } from 'zod'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('request'), message: z.string().max(500).optional() }),
  z.object({
    action: z.literal('decide'),
    requestId: z.string(),
    decision: z.enum(['APPROVED', 'REJECTED']),
    note: z.string().max(500).optional()
  })
])

export default defineEventHandler(async (event) => {
  const { tenant, user, role } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, schema.parse)

  const instruction = await prisma.instruction.findFirst({ where: { id, tenantId: tenant.id } })
  if (!instruction) throw createError({ statusCode: 404 })

  if (body.action === 'request') {
    const req = await prisma.reviewRequest.create({
      data: { instructionId: id, requestedById: user.id, message: body.message }
    })
    await prisma.instruction.update({ where: { id }, data: { status: 'IN_REVIEW' } })
    return { reviewRequest: req }
  }

  // decide
  if (role !== 'OWNER') {
    throw createError({ statusCode: 403, statusMessage: 'Только владелец может одобрять' })
  }
  const req = await prisma.reviewRequest.update({
    where: { id: body.requestId },
    data: {
      status: body.decision,
      reviewNote: body.note,
      reviewedById: user.id,
      reviewedAt: new Date()
    }
  })
  if (body.decision === 'REJECTED') {
    await prisma.instruction.update({ where: { id }, data: { status: 'DRAFT' } })
  }
  return { reviewRequest: req }
})
