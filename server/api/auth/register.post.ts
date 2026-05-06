import { registerSchema } from '~~/shared/schemas/auth'
import { hashPassword, createSession } from '~~/server/utils/auth'
import { prisma } from '~~/server/utils/prisma'
import { isReservedSlug } from '~~/server/utils/slug'

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, registerSchema.parse)

  if (isReservedSlug(body.tenantSlug)) {
    throw createError({ statusCode: 400, statusMessage: 'Этот slug зарезервирован' })
  }

  const exists = await prisma.user.findUnique({ where: { email: body.email } })
  if (exists) throw createError({ statusCode: 400, statusMessage: 'Email уже занят' })

  const slugTaken = await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } })
  if (slugTaken) throw createError({ statusCode: 400, statusMessage: 'Этот slug уже занят' })

  const freePlan = await prisma.plan.findUnique({ where: { code: 'free' } })
  if (!freePlan) throw createError({ statusCode: 500, statusMessage: 'Free plan missing — run prisma db seed' })

  const passwordHash = await hashPassword(body.password)

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: body.email, passwordHash, name: body.name }
    })
    const tenant = await tx.tenant.create({
      data: {
        slug: body.tenantSlug,
        name: body.tenantName,
        memberships: { create: { userId: user.id, role: 'OWNER' } },
        subscription: { create: { planId: freePlan.id, status: 'active' } }
      }
    })
    return { user, tenant }
  })

  await createSession(event, result.user.id)
  return { user: { id: result.user.id, email: result.user.email, name: result.user.name }, tenant: result.tenant }
})
