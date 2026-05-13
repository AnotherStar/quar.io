import { requireUser } from '~~/server/utils/auth'
import { sendVerificationEmail } from '~~/server/utils/emailVerification'
import { takeToken } from '~~/server/utils/rateLimit'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (user.emailVerifiedAt) {
    return { ok: true, alreadyVerified: true }
  }

  // 3 sends per user per 10 minutes — enough for legitimate retries, blocks abuse.
  const ok = takeToken({ key: `verify-resend:${user.id}`, limit: 3, windowMs: 10 * 60 * 1000 })
  if (!ok) {
    throw createError({ statusCode: 429, statusMessage: 'Слишком много запросов, попробуйте через несколько минут' })
  }

  try {
    await sendVerificationEmail({ id: user.id, email: user.email, name: user.name })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'Не удалось отправить письмо. Попробуйте позже.' })
  }
  return { ok: true }
})
