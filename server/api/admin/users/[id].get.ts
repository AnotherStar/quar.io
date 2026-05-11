// Детали одного пользователя для админа. Возвращает все его tenant'ы и
// список инструкций в каждом из них со статистикой визитов за 30 дней.
import { requireAdmin } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')!

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      memberships: {
        orderBy: { createdAt: 'asc' },
        include: {
          tenant: {
            include: {
              subscription: { include: { plan: true } }
            }
          }
        }
      }
    }
  })
  if (!user) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  const tenantIds = user.memberships.map((m) => m.tenantId)
  const since30 = dayjs().subtract(30, 'day').toDate()

  const [instructions, visitsByInstruction, sessionsCount] = await Promise.all([
    tenantIds.length
      ? prisma.instruction.findMany({
          where: { tenantId: { in: tenantIds } },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            tenantId: true,
            createdAt: true,
            updatedAt: true,
            publishedAt: true
          }
        })
      : [],
    tenantIds.length
      ? prisma.$queryRaw<Array<{ instructionId: string; visits: bigint; pageViews: bigint }>>`
          SELECT v."instructionId",
                 COUNT(v.id)::bigint AS visits,
                 SUM(v."pageViews")::bigint AS "pageViews"
          FROM "Visit" v
          JOIN "Instruction" i ON i.id = v."instructionId"
          WHERE i."tenantId" = ANY(${tenantIds}::text[])
            AND v."isBot" = false
            AND v."startedAt" >= ${since30}
          GROUP BY v."instructionId"
        `
      : [],
    prisma.session.count({ where: { userId: user.id } })
  ])

  const statsMap = new Map(
    visitsByInstruction.map((r) => [r.instructionId, {
      visits: Number(r.visits),
      pageViews: Number(r.pageViews ?? 0)
    }])
  )

  const tenants = user.memberships.map((m) => {
    const tInstructions = instructions
      .filter((i) => i.tenantId === m.tenantId)
      .map((i) => ({
        id: i.id,
        slug: i.slug,
        title: i.title,
        status: i.status,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
        publishedAt: i.publishedAt,
        visits30d: statsMap.get(i.id)?.visits ?? 0,
        pageViews30d: statsMap.get(i.id)?.pageViews ?? 0
      }))
    return {
      id: m.tenant.id,
      slug: m.tenant.slug,
      name: m.tenant.name,
      role: m.role,
      plan: m.tenant.subscription?.plan.code ?? 'free',
      planName: m.tenant.subscription?.plan.name ?? 'Free',
      subscriptionStatus: m.tenant.subscription?.status ?? null,
      currentPeriodEnd: m.tenant.subscription?.currentPeriodEnd ?? null,
      createdAt: m.tenant.createdAt,
      instructions: tInstructions,
      instructionsCount: tInstructions.length,
      visits30d: tInstructions.reduce((s, i) => s + i.visits30d, 0)
    }
  })

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      activeSessions: sessionsCount
    },
    tenants,
    totals: {
      tenants: tenants.length,
      instructions: tenants.reduce((s, t) => s + t.instructionsCount, 0),
      visits30d: tenants.reduce((s, t) => s + t.visits30d, 0)
    }
  }
})
