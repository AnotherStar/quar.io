import { loadPublicByShortId } from '~~/server/utils/publicResolve'
import { getSessionUser } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const shortId = getRouterParam(event, 'shortId')!
  const qrCode = await prisma.activationQrCode.findUnique({
    where: { shortId },
    include: {
      tenant: { select: { id: true, name: true, slug: true } },
      instruction: { select: { slug: true, status: true } }
    }
  })

  if (qrCode) {
    if (qrCode.instructionId && qrCode.instruction?.status === 'PUBLISHED') {
      return {
        kind: 'boundQr',
        tenant: qrCode.tenant,
        instruction: { slug: qrCode.instruction.slug }
      }
    }

    const user = await getSessionUser(event)
    const membership = user
      ? await prisma.membership.findUnique({
          where: { userId_tenantId: { userId: user.id, tenantId: qrCode.tenantId } },
          select: { role: true }
        })
      : null

    return {
      kind: 'activationQr',
      qrCode: {
        id: qrCode.id,
        shortId: qrCode.shortId,
        boundAt: qrCode.boundAt
      },
      tenant: qrCode.tenant,
      canBind: !!membership && membership.role !== 'VIEWER'
    }
  }

  const data = await loadPublicByShortId(shortId)
  if (!data) throw createError({ statusCode: 404 })
  return { kind: 'instruction', ...data }
})
