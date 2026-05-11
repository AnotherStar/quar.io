// Public endpoint — submission of warranty registration form from public instruction page.
// Validates that the warranty module is attached + active for the instruction.
// Attachment can be either slot-based (InstructionModuleAttachment) or inline
// (TipTap moduleRef node embedded in the published doc).
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeatures, planAllowsModule } from '~~/server/utils/plan'
import { isModuleAttachedToPublished } from '~~/server/utils/moduleAttached'
import { recordGoalForVisit } from '~~/server/utils/visit'
import { SystemGoal } from '~~/shared/schemas/goals'
import { z } from 'zod'

const schema = z.object({
  instructionId: z.string(),
  versionId: z.string().optional(),
  sessionId: z.string().min(8).max(64).optional(),
  pageUrl: z.string().url().max(2048).optional(),
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email(),
  customerPhone: z.string().max(40).optional(),
  serialNumber: z.string().max(80).optional(),
  purchaseDate: z.string().datetime().optional(),
  consent: z.object({
    personalData: z.literal(true),
    marketing: z.boolean().optional().default(false),
    documentVersionIds: z.array(z.string()).max(10).optional().default([])
  })
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, schema.parse)

  const instr = await prisma.instruction.findUnique({
    where: { id: body.instructionId },
    include: {
      tenant: { include: { subscription: { include: { plan: true } } } }
    }
  })
  if (!instr || instr.status !== 'PUBLISHED') throw createError({ statusCode: 404 })

  const features = effectiveFeatures(instr.tenant)
  if (!planAllowsModule(features, 'warranty-registration')) {
    throw createError({ statusCode: 402, statusMessage: 'Module unavailable on this tenant plan' })
  }

  const attached = await isModuleAttachedToPublished(body.instructionId, 'warranty-registration')
  if (!attached) {
    throw createError({ statusCode: 404, statusMessage: 'Module not attached' })
  }

  const ip = getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ?? getRequestHeader(event, 'x-real-ip') ?? null
  const userAgent = getRequestHeader(event, 'user-agent') ?? null

  const reg = await prisma.$transaction(async (tx) => {
    const consentEvent = await tx.consentEvent.create({
      data: {
        tenantId: instr.tenantId,
        instructionId: body.instructionId,
        versionId: body.versionId,
        sessionId: body.sessionId,
        subjectKey: body.customerEmail.toLowerCase(),
        formType: 'warranty-registration',
        purpose: 'Регистрация расширенной гарантии и обратная связь по товару',
        documentVersionIds: body.consent.documentVersionIds,
        checkboxValues: {
          personalData: body.consent.personalData,
          marketing: body.consent.marketing
        },
        pageUrl: body.pageUrl,
        ip,
        userAgent
      }
    })

    return tx.warrantyRegistration.create({
      data: {
        instructionId: body.instructionId,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        customerPhone: body.customerPhone,
        serialNumber: body.serialNumber,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
        consentEventId: consentEvent.id
      }
    })
  })

  await recordGoalForVisit({
    instructionId: body.instructionId,
    versionId: body.versionId,
    sessionId: body.sessionId,
    code: SystemGoal.WARRANTY_SUBMITTED,
    meta: { registrationId: reg.id }
  })

  return { ok: true, id: reg.id }
})
