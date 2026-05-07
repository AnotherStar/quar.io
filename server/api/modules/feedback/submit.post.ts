// Public endpoint — feedback form submission. Validates the module is
// attached to the published instruction and the tenant plan allows it.
// Mirrors the warranty endpoint to keep module surface consistent.
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeatures, planAllowsModule } from '~~/server/utils/plan'
import { isModuleAttachedToPublished } from '~~/server/utils/moduleAttached'
import { z } from 'zod'

const schema = z.object({
  instructionId: z.string(),
  fio: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(160).optional(),
  telegram: z.string().max(80).optional(),
  message: z.string().max(4000).optional()
}).refine(
  (v) => Boolean(v.fio || v.phone || v.email || v.telegram || v.message),
  { message: 'Заполните хотя бы одно поле' }
)

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)

  const instr = await prisma.instruction.findUnique({
    where: { id: body.instructionId },
    include: { tenant: { include: { subscription: { include: { plan: true } } } } }
  })
  if (!instr || instr.status !== 'PUBLISHED') throw createError({ statusCode: 404 })

  const features = effectiveFeatures(instr.tenant)
  if (!planAllowsModule(features, 'feedback')) {
    throw createError({ statusCode: 402, statusMessage: 'Модуль недоступен на текущем тарифе' })
  }

  const attached = await isModuleAttachedToPublished(body.instructionId, 'feedback')
  if (!attached) {
    throw createError({ statusCode: 404, statusMessage: 'Модуль не подключён к инструкции' })
  }

  const submission = await prisma.feedbackSubmission.create({
    data: {
      instructionId: body.instructionId,
      fio: body.fio,
      phone: body.phone,
      email: body.email,
      telegram: body.telegram,
      message: body.message
    }
  })

  // TODO(notification): forward to recipientEmail from TenantModuleConfig.config.
  // Wired here so it stays a single integration point when SMTP/queue is added.
  return { ok: true, id: submission.id }
})
