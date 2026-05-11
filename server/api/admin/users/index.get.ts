// Список всех пользователей платформы для админа. НЕ tenant-scoped.
// Поддерживает поиск по email/имени и пагинацию.
//
// Для каждого пользователя возвращаем:
//   - его memberships (tenant + plan + role)
//   - суммарное число инструкций по всем его тенантам
//   - суммарное число визитов за 30 дней
//
// Стати считаются простыми агрегатами через groupBy — для нескольких сотен
// пользователей это OK; если база сильно вырастет, перепишем на $queryRaw с
// JOIN'ами по списку tenantId.
import { requireAdmin } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const q = getQuery(event)

  const search = typeof q.search === 'string' ? q.search.trim() : ''
  const take = Math.min(200, Math.max(1, Number(q.take ?? 50)))
  const skip = Math.max(0, Number(q.skip ?? 0))

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } }
        ]
      }
    : {}

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip,
      include: {
        memberships: {
          include: {
            tenant: {
              include: {
                subscription: { include: { plan: true } },
                _count: { select: { instructions: true } }
              }
            }
          }
        }
      }
    })
  ])

  const tenantIds = Array.from(
    new Set(users.flatMap((u) => u.memberships.map((m) => m.tenantId)))
  )
  const since30 = dayjs().subtract(30, 'day').toDate()

  // Визиты за 30d по каждому tenant'у (через JOIN с Instruction). Один запрос
  // на все тенанты — иначе N+1.
  const visitsByTenant = tenantIds.length
    ? await prisma.$queryRaw<Array<{ tenantId: string; count: bigint }>>`
        SELECT i."tenantId", COUNT(v.id)::bigint AS count
        FROM "Visit" v
        JOIN "Instruction" i ON i.id = v."instructionId"
        WHERE i."tenantId" = ANY(${tenantIds}::text[])
          AND v."isBot" = false
          AND v."startedAt" >= ${since30}
        GROUP BY i."tenantId"
      `
    : []
  const visitsMap = new Map(visitsByTenant.map((r) => [r.tenantId, Number(r.count)]))

  return {
    total,
    take,
    skip,
    users: users.map((u) => {
      const tenants = u.memberships.map((m) => ({
        id: m.tenant.id,
        slug: m.tenant.slug,
        name: m.tenant.name,
        role: m.role,
        plan: m.tenant.subscription?.plan.code ?? 'free',
        planName: m.tenant.subscription?.plan.name ?? 'Free',
        subscriptionStatus: m.tenant.subscription?.status ?? null,
        instructionsCount: m.tenant._count.instructions,
        visits30d: visitsMap.get(m.tenant.id) ?? 0
      }))
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        avatarUrl: u.avatarUrl,
        isAdmin: u.isAdmin,
        emailVerifiedAt: u.emailVerifiedAt,
        createdAt: u.createdAt,
        tenants,
        instructionsTotal: tenants.reduce((s, t) => s + t.instructionsCount, 0),
        visits30dTotal: tenants.reduce((s, t) => s + t.visits30d, 0)
      }
    })
  }
})
