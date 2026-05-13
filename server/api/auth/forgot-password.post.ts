// Запрос сброса пароля. Всегда отвечаем 200, не палим существование email —
// классический паттерн против user-enumeration. Письмо отправляется только
// если email реально привязан к аккаунту с заданным паролем (для анонимных
// trial-юзеров без passwordHash сброс не имеет смысла — у них нет пароля).

import { z } from 'zod'
import { prisma } from '~~/server/utils/prisma'
import { sendPasswordResetEmail } from '~~/server/utils/passwordReset'
import { takeToken } from '~~/server/utils/rateLimit'

const schema = z.object({ email: z.string().email() })

export default defineEventHandler(async (event) => {
  const { email } = await readValidatedBody(event, schema.parse)

  // Лимит по IP: 5 запросов сброса с одного IP за 10 минут.
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!takeToken({ key: `forgot-ip:${ip}`, limit: 5, windowMs: 10 * 60 * 1000 })) {
    throw createError({ statusCode: 429, statusMessage: 'Слишком много запросов, попробуйте позже' })
  }
  // Дополнительно — лимит по email: 3 раза в 10 минут на конкретный адрес
  // (защищает от спама конкретному получателю при rotation IP).
  if (!takeToken({ key: `forgot-email:${email.toLowerCase()}`, limit: 3, windowMs: 10 * 60 * 1000 })) {
    return { ok: true }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (user && user.passwordHash) {
    try {
      await sendPasswordResetEmail({ id: user.id, email: user.email, name: user.name })
    } catch (e) {
      console.error('[forgot-password] send failed:', e)
    }
  }

  return { ok: true }
})
