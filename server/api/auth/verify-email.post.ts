import { z } from 'zod'
import { consumeVerificationToken } from '~~/server/utils/emailVerification'
import { invalidateUserCache } from '~~/server/utils/auth'

const schema = z.object({ token: z.string().min(1) })

export default defineEventHandler(async (event) => {
  const { token } = await readValidatedBody(event, schema.parse)
  const result = await consumeVerificationToken(token)
  if (!result) {
    throw createError({ statusCode: 400, statusMessage: 'Ссылка недействительна или истекла' })
  }
  invalidateUserCache(result.userId)
  return { ok: true }
})
