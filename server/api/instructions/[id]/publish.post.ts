import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeatures } from '~~/server/utils/plan'
import { publishSchema } from '~~/shared/schemas/instruction'

// Publish: snapshot current draftContent into immutable InstructionVersion,
// point publishedVersionId to it, set status PUBLISHED.
// If approval workflow is enforced by plan, an APPROVED ReviewRequest is required.
export default defineEventHandler(async (event) => {
  const { tenant, user, role } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  // Body is optional — accept missing/empty body as no changelog.
  const rawBody = await readBody(event).catch(() => ({}))
  const body = publishSchema.parse(rawBody ?? {})

  const instruction = await prisma.instruction.findFirst({
    where: { id, tenantId: tenant.id },
    include: { reviewRequests: { orderBy: { createdAt: 'desc' }, take: 1 } }
  })
  if (!instruction) throw createError({ statusCode: 404 })

  const features = effectiveFeatures(tenant)
  if (features.approvalWorkflow && role !== 'OWNER') {
    const last = instruction.reviewRequests[0]
    if (!last || last.status !== 'APPROVED') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Требуется одобрение от владельца перед публикацией'
      })
    }
  }

  const lastVersion = await prisma.instructionVersion.findFirst({
    where: { instructionId: id },
    orderBy: { versionNumber: 'desc' }
  })
  const versionNumber = (lastVersion?.versionNumber ?? 0) + 1

  const updated = await prisma.$transaction(async (tx) => {
    const version = await tx.instructionVersion.create({
      data: {
        instructionId: id,
        versionNumber,
        content: instruction.draftContent as object,
        changelog: body.changelog,
        createdById: user.id
      }
    })
    return tx.instruction.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        publishedVersionId: version.id,
        publishedAt: new Date()
      },
      include: {
        publishedVersion: { select: { id: true, versionNumber: true, createdAt: true } }
      }
    })
  })
  return { instruction: updated }
})
