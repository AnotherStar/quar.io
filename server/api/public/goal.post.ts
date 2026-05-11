// Public goal endpoint — records a per-visit conversion event.
// Called from the public viewer via the useVisitGoals composable.
import { prisma } from '~~/server/utils/prisma'
import { goalRequestSchema } from '~~/shared/schemas/goals'
import { ensureVisit, getClientIp, hashIp } from '~~/server/utils/visit'
import { takeToken } from '~~/server/utils/rateLimit'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, goalRequestSchema.parse)

  const ip = getClientIp(event)
  const rlKey = `goal:${ip ? hashIp(ip) : 'unknown'}`
  if (!takeToken({ key: rlKey, limit: 30, windowMs: 60_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Rate limit exceeded' })
  }

  const visitId = await ensureVisit({
    event,
    instructionId: body.instructionId,
    versionId: body.versionId,
    sessionId: body.sessionId
  })

  await prisma.visitGoal.create({
    data: {
      visitId,
      code: body.code,
      meta: (body.meta ?? undefined) as any
    }
  })

  return { ok: true }
})
