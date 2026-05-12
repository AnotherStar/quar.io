import { loadPublicByShortId } from '~~/server/utils/publicResolve'
import { getSessionUser } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'

// Set when the visitor lands via a QR short-link. The public-page beacon
// reads it on first event to attribute the visit as entrySource='qr'.
// Short TTL — only needs to survive the immediate redirect + first flush.
function markEntryAsQr(event: any, shortId: string) {
  setCookie(event, 'mo_entry', JSON.stringify({ qr: shortId, ts: Date.now() }), {
    path: '/',
    maxAge: 120,
    sameSite: 'lax'
  })
}

export default defineEventHandler(async (event) => {
  const shortId = getRouterParam(event, 'shortId')!
  const qrCode = await prisma.activationQrCode.findUnique({
    where: { shortId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          brandingLogoUrl: true,
          brandingPrimaryColor: true,
          supportEmail: true,
          supportPhone: true,
          supportTelegram: true
        }
      },
      instruction: { select: { id: true, slug: true, title: true, status: true } }
    }
  })

  if (qrCode) {
    if (qrCode.instructionId && qrCode.instruction?.status === 'PUBLISHED') {
      markEntryAsQr(event, shortId)
      const user = await getSessionUser(event)
      const membership = user
        ? await prisma.membership.findUnique({
            where: { userId_tenantId: { userId: user.id, tenantId: qrCode.tenantId } },
            select: { role: true }
          })
        : null
      return {
        kind: 'boundQr',
        tenant: qrCode.tenant,
        qrCode: { id: qrCode.id, shortId: qrCode.shortId },
        instruction: {
          id: qrCode.instruction.id,
          slug: qrCode.instruction.slug,
          title: qrCode.instruction.title
        },
        canManage: !!membership && membership.role !== 'VIEWER'
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
      canBind: !!membership && membership.role !== 'VIEWER',
      // Нужен клиенту, чтобы отличить «незалогинен» от «залогинен, но
      // этот QR из чужого tenant'а». Первому показываем «ШК не привязан»,
      // второму — «Это не ваш ШК».
      viewerAuthenticated: !!user
    }
  }

  const data = await loadPublicByShortId(shortId)
  if (!data) throw createError({ statusCode: 404 })
  markEntryAsQr(event, shortId)
  return { kind: 'instruction', ...data }
})
