import { requireTenant } from '~~/server/utils/tenant'
import { effectiveFeatures, trialState } from '~~/server/utils/plan'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const sub = await prisma.subscription.findUnique({
    where: { tenantId: tenant.id },
    include: { plan: true }
  })
  const features = effectiveFeatures({ ...tenant, subscription: sub })
  const trial = trialState(sub)
  return {
    plan: sub?.plan.code ?? 'free',
    status: sub?.status ?? 'inactive',
    currentPeriodEnd: sub?.currentPeriodEnd ?? null,
    features,
    trial
  }
})
