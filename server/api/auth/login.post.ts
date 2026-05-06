import { loginSchema } from '~~/shared/schemas/auth'
import { verifyPassword, createSession } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, loginSchema.parse)
  const user = await prisma.user.findUnique({ where: { email: body.email } })
  if (!user || !user.passwordHash) {
    throw createError({ statusCode: 401, statusMessage: 'Неверный email или пароль' })
  }
  const ok = await verifyPassword(user.passwordHash, body.password)
  if (!ok) throw createError({ statusCode: 401, statusMessage: 'Неверный email или пароль' })

  await createSession(event, user.id)
  return { user: { id: user.id, email: user.email, name: user.name } }
})
