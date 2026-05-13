// Создаёт «анонимный» trial-аккаунт: User без пароля + новый Tenant с auto-slug.
// После этого юзер сразу попадает в дашборд и может «дозаполнить» регистрацию
// позже через /api/auth/complete-signup. Признак анонима — отсутствие
// passwordHash; email — синтетический (anon-<id>@anonymous.quar.io.local).

import { customAlphabet } from 'nanoid'
import { createSession } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'
import { takeToken } from '~~/server/utils/rateLimit'

const shortId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8)

export default defineEventHandler(async (event) => {
  // Бросовая регистрация — самый «спамабельный» эндпоинт, поэтому строгий
  // лимит по IP: 5 trial-аккаунтов с одного IP за час.
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!takeToken({ key: `anon-start:${ip}`, limit: 5, windowMs: 60 * 60 * 1000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Слишком много trial-аккаунтов с этого IP. Попробуйте позже.' })
  }

  const freePlan = await prisma.plan.findUnique({ where: { code: 'free' } })
  if (!freePlan) throw createError({ statusCode: 500, statusMessage: 'Free plan missing — run prisma db seed' })

  // Пытаемся создать пару (user + tenant). slug-коллизия маловероятна, но всё
  // равно ретраим до 5 раз — DB unique-ошибки на @@unique по slug ловим как
  // P2002 и перегенерируем хвост.
  const result = await createWithRetry(freePlan.id, 5)

  await createSession(event, result.user.id)
  return {
    user: { id: result.user.id, email: result.user.email, name: result.user.name },
    tenant: { id: result.tenant.id, slug: result.tenant.slug, name: result.tenant.name }
  }
})

async function createWithRetry(freePlanId: string, attempts: number) {
  let lastError: unknown = null
  for (let i = 0; i < attempts; i++) {
    const id = shortId()
    const email = `anon-${id}@anonymous.quar.io.local`
    const slug = `try-${id}`
    try {
      return await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email, passwordHash: null, name: null }
        })
        const tenant = await tx.tenant.create({
          data: {
            slug,
            name: `Trial ${id}`,
            memberships: { create: { userId: user.id, role: 'OWNER' } },
            subscription: { create: { planId: freePlanId, status: 'active' } }
          }
        })
        return { user, tenant }
      })
    } catch (e: any) {
      // P2002 — unique constraint, скорее всего по slug или email; пробуем ещё.
      if (e?.code === 'P2002') { lastError = e; continue }
      throw e
    }
  }
  throw lastError ?? new Error('Failed to create anonymous account')
}
