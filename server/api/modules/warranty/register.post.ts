// Public endpoint — submission of warranty registration form from public instruction page.
// Validates that the warranty module is attached + active for the instruction.
// Attachment can be either slot-based (InstructionModuleAttachment) or inline
// (TipTap moduleRef node embedded in the published doc).
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeatures, planAllowsModule } from '~~/server/utils/plan'
import { isModuleAttachedToPublished } from '~~/server/utils/moduleAttached'
import { z } from 'zod'

const schema = z.object({
  instructionId: z.string(),
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email(),
  customerPhone: z.string().max(40).optional(),
  serialNumber: z.string().max(80).optional(),
  purchaseDate: z.string().datetime().optional()
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

  const reg = await prisma.warrantyRegistration.create({
    data: {
      instructionId: body.instructionId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      serialNumber: body.serialNumber,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined
    }
  })
  return { ok: true, id: reg.id }
})
