// Применяет сброс пароля: потребляет token, обновляет passwordHash,
// инвалидирует все активные сессии этого пользователя (на случай если
// атакующий получил доступ к старому паролю), затем логинит юзера новой
// сессией — UX: после reset сразу попадаешь в дашборд.

import { z } from 'zod'
import { consumePasswordResetToken } from '~~/server/utils/passwordReset'
import { hashPassword, createSession, invalidateUserCache } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(200)
})

export default defineEventHandler(async (event) => {
  const { token, password } = await readValidatedBody(event, schema.parse)

  const result = await consumePasswordResetToken(token)
  if (!result) {
    throw createError({ statusCode: 400, statusMessage: 'Ссылка недействительна или истекла' })
  }

  const passwordHash = await hashPassword(password)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: result.userId },
      data: { passwordHash }
    }),
    // Все старые сессии — в утиль. Кэш почистим ниже.
    prisma.session.deleteMany({ where: { userId: result.userId } })
  ])

  invalidateUserCache(result.userId)

  // Новая сессия — пользователь сразу залогинен.
  await createSession(event, result.userId)

  return { ok: true }
})
