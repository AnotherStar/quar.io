// Sidebar badges: per-user, per-tenant counts of "new since last visit" items
// for inbox-style modules. Used by the dashboard layout to render small
// counters on module nav entries (and the total on the mobile menu button).
//
// Semantics: на первый запрос для нового user×tenant×module создаём запись
// ModuleSeen с lastSeenAt = now(), чтобы исторические данные не моргнули
// бейджем «N новых». Бейджи показывают только то, что появилось после первого
// открытия дашборда (или после последнего визита на страницу модуля).
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { BADGE_MODULE_CODES } from '~~/shared/constants/moduleBadges'

export default defineEventHandler(async (event) => {
  const { user, tenant } = await requireTenant(event)

  const existing = await prisma.moduleSeen.findMany({
    where: {
      userId: user.id,
      tenantId: tenant.id,
      moduleCode: { in: [...BADGE_MODULE_CODES] }
    }
  })

  const seenMap = new Map<string, Date>()
  for (const r of existing) seenMap.set(r.moduleCode, r.lastSeenAt)

  // Сиды для отсутствующих кодов: ставим lastSeenAt = now(), чтобы старые
  // записи не считались «новыми». Используем upsert на случай гонки между
  // двумя одновременными запросами.
  const missing = [...BADGE_MODULE_CODES].filter((c) => !seenMap.has(c))
  if (missing.length) {
    const now = new Date()
    await prisma.$transaction(
      missing.map((code) =>
        prisma.moduleSeen.upsert({
          where: { userId_tenantId_moduleCode: { userId: user.id, tenantId: tenant.id, moduleCode: code } },
          update: {},
          create: { userId: user.id, tenantId: tenant.id, moduleCode: code, lastSeenAt: now }
        })
      )
    )
    for (const c of missing) seenMap.set(c, now)
  }

  const feedbackSince = seenMap.get('feedback')!
  const chatSince = seenMap.get('chat-consultant')!
  const warrantySince = seenMap.get('warranty-registration')!

  const [feedbackCount, warrantyCount, chatCount] = await Promise.all([
    prisma.feedbackSubmission.count({
      where: { instruction: { tenantId: tenant.id }, createdAt: { gt: feedbackSince } }
    }),
    prisma.warrantyRegistration.count({
      where: { instruction: { tenantId: tenant.id }, createdAt: { gt: warrantySince } }
    }),
    // Для чата считаем тикеты с новыми сообщениями от покупателя — это
    // ближе к UX «непрочитанные диалоги», чем число всех сообщений.
    prisma.supportTicket.count({
      where: {
        tenantId: tenant.id,
        messages: {
          some: { sender: 'CUSTOMER', createdAt: { gt: chatSince } }
        }
      }
    })
  ])

  const counts: Record<string, number> = {
    feedback: feedbackCount,
    'warranty-registration': warrantyCount,
    'chat-consultant': chatCount
  }
  const total = feedbackCount + warrantyCount + chatCount

  return { counts, total }
})
