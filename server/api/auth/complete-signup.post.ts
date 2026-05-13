// Превращает анонимный trial-аккаунт в полноценный: задаёт email/пароль
// текущему User'у (требует passwordHash IS NULL — для обычных юзеров эндпоинт
// бесполезен и ничего не делает), опционально переименовывает первый OWNER
// tenant. После этого триггерит письмо верификации.

import { completeSignupSchema } from '~~/shared/schemas/auth'
import { hashPassword, requireUser, invalidateUserCache } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'
import { isReservedSlug } from '~~/server/utils/slug'
import { sendVerificationEmail } from '~~/server/utils/emailVerification'

export default defineEventHandler(async (event) => {
  const sessionUser = await requireUser(event)
  if (sessionUser.passwordHash) {
    throw createError({ statusCode: 400, statusMessage: 'Аккаунт уже зарегистрирован' })
  }

  const body = await readValidatedBody(event, completeSignupSchema.parse)

  // Email должен быть свободен — кроме случая, когда он совпадает с
  // синтетическим email текущего юзера (мы его всё равно заменяем).
  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing && existing.id !== sessionUser.id) {
    throw createError({ statusCode: 400, statusMessage: 'Email уже занят' })
  }

  if (body.tenantSlug) {
    if (isReservedSlug(body.tenantSlug)) {
      throw createError({ statusCode: 400, statusMessage: 'Этот slug зарезервирован' })
    }
    const slugTaken = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } })
    // Свой собственный анонимный slug разрешаем оставить — slugTaken тогда
    // принадлежит нашему же tenant'у, поверка дальше.
  }

  // Берём «первый» OWNER tenant — для свеже-созданного анонима он один.
  const ownerMembership = await prisma.membership.findFirst({
    where: { userId: sessionUser.id, role: 'OWNER' },
    orderBy: { createdAt: 'asc' }
  })

  const passwordHash = await hashPassword(body.password)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: sessionUser.id },
      data: {
        email: body.email,
        passwordHash,
        name: body.name ?? sessionUser.name
      }
    })

    if (ownerMembership && (body.tenantName || body.tenantSlug)) {
      // Если slug меняется — проверка на занятость другим tenant'ом.
      if (body.tenantSlug) {
        const taken = await tx.tenant.findUnique({ where: { slug: body.tenantSlug } })
        if (taken && taken.id !== ownerMembership.tenantId) {
          throw createError({ statusCode: 400, statusMessage: 'Этот slug уже занят' })
        }
      }
      await tx.tenant.update({
        where: { id: ownerMembership.tenantId },
        data: {
          ...(body.tenantName ? { name: body.tenantName } : {}),
          ...(body.tenantSlug ? { slug: body.tenantSlug } : {})
        }
      })
    }
  })

  invalidateUserCache(sessionUser.id)

  // Письмо верификации — best-effort, не валим запрос если не ушло.
  try {
    await sendVerificationEmail({ id: sessionUser.id, email: body.email, name: body.name ?? sessionUser.name })
  } catch (e) {
    console.error('[complete-signup] verification email failed:', e)
  }

  return { ok: true }
})
