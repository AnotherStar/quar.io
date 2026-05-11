// Глобальная статистика платформы для админа. НЕ tenant-scoped.
// Возвращает сводку: пользователи, тенанты, инструкции, визиты — и
// распределение тенантов по тарифам.
import { requireAdmin } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'
import dayjs from 'dayjs'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const since30 = dayjs().subtract(30, 'day').toDate()
  const since7 = dayjs().subtract(7, 'day').toDate()

  const [
    usersTotal,
    usersNew30d,
    tenantsTotal,
    instructionsTotal,
    publishedInstructions,
    visits30d,
    visits7d,
    plansBreakdownRaw,
    adminsCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.tenant.count(),
    prisma.instruction.count(),
    prisma.instruction.count({ where: { status: 'PUBLISHED' } }),
    prisma.visit.count({ where: { isBot: false, startedAt: { gte: since30 } } }),
    prisma.visit.count({ where: { isBot: false, startedAt: { gte: since7 } } }),
    prisma.$queryRaw<Array<{ code: string | null; name: string | null; count: bigint }>>`
      SELECT p."code", p."name", COUNT(t.id)::bigint AS count
      FROM "Tenant" t
      LEFT JOIN "Subscription" s ON s."tenantId" = t.id
      LEFT JOIN "Plan" p ON p.id = s."planId"
      GROUP BY p."code", p."name"
      ORDER BY count DESC
    `,
    prisma.user.count({ where: { isAdmin: true } })
  ])

  return {
    users: {
      total: usersTotal,
      new30d: usersNew30d,
      admins: adminsCount
    },
    tenants: {
      total: tenantsTotal,
      byPlan: plansBreakdownRaw.map((r) => ({
        code: r.code ?? 'free',
        name: r.name ?? 'Free (без подписки)',
        count: Number(r.count)
      }))
    },
    instructions: {
      total: instructionsTotal,
      published: publishedInstructions
    },
    visits: {
      last30d: visits30d,
      last7d: visits7d
    }
  }
})
