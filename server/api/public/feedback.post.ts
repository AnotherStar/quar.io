import { prisma } from '~~/server/utils/prisma'
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
  const fb = await prisma.blockFeedback.create({ data: body })
  return { ok: true, id: fb.id }
})
