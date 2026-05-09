import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { generateShortId } from '~~/server/utils/slug'
import { qrBatchCreateSchema } from '~~/shared/schemas/qrCode'

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, qrBatchCreateSchema.parse)

  const createdIds: string[] = []

  while (createdIds.length < body.count) {
    const need = body.count - createdIds.length
    const candidates = new Set<string>()
    while (candidates.size < Math.ceil(need * 1.4) + 10) {
      candidates.add(generateShortId())
    }

    const shortIds = [...candidates]
    const [instructionCollisions, qrCollisions] = await Promise.all([
      prisma.instruction.findMany({
        where: { shortId: { in: shortIds } },
        select: { shortId: true }
      }),
      prisma.activationQrCode.findMany({
        where: { shortId: { in: shortIds } },
        select: { shortId: true }
      })
    ])
    const taken = new Set([...instructionCollisions, ...qrCollisions].map((r) => r.shortId))
    const available = shortIds.filter((id) => !taken.has(id)).slice(0, need)

    if (!available.length) continue

    await prisma.activationQrCode.createMany({
      data: available.map((shortId) => ({
        shortId,
        tenantId: tenant.id,
        createdById: user.id
      })),
      skipDuplicates: true
    })
    createdIds.push(...available)
  }

  const codes = await prisma.activationQrCode.findMany({
    where: { tenantId: tenant.id, shortId: { in: createdIds } },
    orderBy: { createdAt: 'desc' }
  })

  return { codes }
})
