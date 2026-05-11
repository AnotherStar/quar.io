import { prisma } from '~~/server/utils/prisma'
import { recordGoalForVisit } from '~~/server/utils/visit'
import { SystemGoal } from '~~/shared/schemas/goals'
import { takeToken } from '~~/server/utils/rateLimit'
import { getClientIp, hashIp } from '~~/server/utils/visit'
import { z } from 'zod'

const schema = z.object({
  instructionId: z.string(),
  versionId: z.string().optional(),
  sessionId: z.string().min(8).max(64),
  blockId: z.string(),
  kind: z.enum(['HELPFUL', 'CONFUSING', 'INCORRECT', 'COMMENT']),
  comment: z.string().max(1000).optional()
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)

  const ip = getClientIp(event)
  const rlKey = `feedback:${ip ? hashIp(ip) : 'unknown'}`
  if (!takeToken({ key: rlKey, limit: 30, windowMs: 60_000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Rate limit exceeded' })
  }

  const fb = await prisma.blockFeedback.create({ data: body })

  await recordGoalForVisit({
    instructionId: body.instructionId,
    versionId: body.versionId,
    sessionId: body.sessionId,
    code: SystemGoal.BLOCK_FEEDBACK_LEFT,
    meta: { blockId: body.blockId, kind: body.kind }
  })

  return { ok: true, id: fb.id }
})
