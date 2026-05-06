import type { Plan, Subscription, Tenant } from '@prisma/client'

// Shape of `Plan.features` JSON. Kept in sync with prisma/seed.ts.
export interface PlanFeatures {
  maxInstructions: number              // -1 = unlimited
  customSections: boolean
  modules: string[]                    // module codes available on this plan
  customDomain: boolean
  analyticsRetentionDays: number       // -1 = unlimited
  teamMembers: number
  approvalWorkflow: boolean
}

export const FREE_FEATURES: PlanFeatures = {
  maxInstructions: 3,
  customSections: false,
  modules: [],
  customDomain: false,
  analyticsRetentionDays: 30,
  teamMembers: 1,
  approvalWorkflow: false
}

// Resolve effective features for a tenant.
// Key principle: if subscription is not active, fall back to FREE features —
// data stays intact, but rendering of paid sections/modules is skipped.
// This is what makes "ссылки живут после неоплаты" work.
//
// Trial: status='trialing' grants the paid plan's features but caps
// `maxInstructions` to the FREE limit. Reason: when trial ends, the tenant
// drops to free; if more than 3 instructions had been created, they would
// have to be hidden. Capping during trial prevents that footgun entirely.
export function effectiveFeatures(
  tenant: Tenant & { subscription: (Subscription & { plan: Plan }) | null }
): PlanFeatures {
  const sub = tenant.subscription
  if (!sub) return FREE_FEATURES

  const isLive = sub.status === 'active' || sub.status === 'trialing'
  if (!isLive) return FREE_FEATURES

  const expired = sub.currentPeriodEnd && sub.currentPeriodEnd < new Date()
  if (expired) return FREE_FEATURES

  const planFeatures = sub.plan.features as unknown as PlanFeatures
  if (sub.status === 'trialing') {
    const cap = FREE_FEATURES.maxInstructions
    const planMax = planFeatures.maxInstructions
    return {
      ...planFeatures,
      maxInstructions: planMax === -1 ? cap : Math.min(planMax, cap)
    }
  }
  return planFeatures
}

export function trialState(
  sub: (Subscription & { plan: Plan }) | null
): { isTrialing: boolean; daysLeft: number | null; trialUsedAt: Date | null } {
  if (!sub) return { isTrialing: false, daysLeft: null, trialUsedAt: null }
  const isTrialing =
    sub.status === 'trialing' && !!sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()
  const daysLeft = isTrialing
    ? Math.max(0, Math.ceil((sub.currentPeriodEnd!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null
  return { isTrialing, daysLeft, trialUsedAt: sub.trialUsedAt ?? null }
}

export function planAllowsModule(features: PlanFeatures, moduleCode: string) {
  return features.modules.includes(moduleCode)
}
