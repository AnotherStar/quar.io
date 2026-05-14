// Имитация оплаты картой: фронт открывает модалку с заранее заполненной
// тестовой картой, на «Оплатить» дёргает этот endpoint и сумма зачисляется
// на бонусный счёт компании. При появлении реального шлюза (ЮKassa / Stripe)
// этот endpoint станет webhook'ом провайдера, а бонусный счёт продолжит
// работать как буфер при продлении.
import { z } from 'zod'
import { requireTenant, invalidateTenantMembershipCache } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

const TOPUP_AMOUNT_RUB = 5000

const schema = z.object({
  amount: z.number().int().positive().optional()
})

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'OWNER' })
  const body = await readValidatedBody(event, schema.parse).catch(() => ({}))
  const amount = body.amount ?? TOPUP_AMOUNT_RUB

  const [updated, payment] = await prisma.$transaction([
    prisma.tenant.update({
      where: { id: tenant.id },
      data: { bonusBalance: { increment: amount } },
      select: { id: true, bonusBalance: true }
    }),
    prisma.payment.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        kind: 'bonus_topup',
        amount,
        status: 'succeeded',
        cardLast4: '4242',
        description: 'Пополнение бонусного счёта'
      }
    })
  ])

  invalidateTenantMembershipCache(tenant.id)

  return {
    bonusBalance: updated.bonusBalance,
    credited: amount,
    paymentId: payment.id
  }
})
