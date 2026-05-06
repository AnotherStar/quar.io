// Activate a 30-day trial of the Plus plan for the current tenant.
// One-shot per tenant: trialUsedAt is set on first activation and prevents re-trial.
// During trial, plan features apply but maxInstructions is capped at the free
// tier limit (handled in effectiveFeatures), so nothing has to be hidden when
// the trial ends.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { z } from 'zod'

const TRIAL_DAYS = 30
const TRIAL_PLAN_CODE = 'plus'

const schema = z.object({
  planCode: z.string().optional()    // override which plan to trial (default: plus)
})

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'OWNER' })
  const body = await readValidatedBody(event, schema.parse).catch(() => ({}))
  const planCode = body.planCode || TRIAL_PLAN_CODE

  const existing = await prisma.subscription.findUnique({
    where: { tenantId: tenant.id },
    include: { plan: true }
  })

  if (existing?.trialUsedAt) {
    throw createError({ statusCode: 400, statusMessage: 'Триал уже использован для этой компании' })
  }
  if (existing && existing.status === 'active' && existing.plan.code !== 'free') {
    throw createError({ statusCode: 400, statusMessage: 'У вас уже активный платный тариф' })
  }

  const plan = await prisma.plan.findUnique({ where: { code: planCode } })
  if (!plan) throw createError({ statusCode: 404, statusMessage: 'План не найден' })

  const ends = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  const updated = await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {
      planId: plan.id,
      status: 'trialing',
      currentPeriodEnd: ends,
      trialUsedAt: new Date()
    },
    create: {
      tenantId: tenant.id,
      planId: plan.id,
      status: 'trialing',
      currentPeriodEnd: ends,
      trialUsedAt: new Date()
    },
    include: { plan: true }
  })

  return {
    subscription: {
      planCode: updated.plan.code,
      status: updated.status,
      currentPeriodEnd: updated.currentPeriodEnd,
      trialUsedAt: updated.trialUsedAt
    }
  }
})
