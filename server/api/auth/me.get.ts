import { getSessionUser } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) return { user: null, memberships: [] }

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: {
      tenant: { include: { subscription: { include: { plan: true } } } }
    },
    orderBy: { createdAt: 'asc' }
  })
  return {
    user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
    memberships: memberships.map((m) => ({
      role: m.role,
      tenant: {
        id: m.tenant.id,
        slug: m.tenant.slug,
        name: m.tenant.name,
        plan: m.tenant.subscription?.plan.code ?? 'free'
      }
    }))
  }
})
