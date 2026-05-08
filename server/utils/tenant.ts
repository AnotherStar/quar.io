import { H3Event, createError } from 'h3'
import type { Role } from '@prisma/client'
import { prisma } from './prisma'
import { requireUser } from './auth'
import { membershipCache } from './cache'

// Resolve and require a tenant the user has access to.
// Tenant id can come from a header (`x-tenant-id`) for dashboard requests,
// or from path params for tenant-scoped routes.
//
// Membership lookups are cached for ~60s in memory (see cache.ts) so most
// API requests don't pay the round-trip to Postgres for this.
export async function requireTenant(event: H3Event, opts: { minRole?: Role } = {}) {
  const user = await requireUser(event)
  const headerTenantId = getHeader(event, 'x-tenant-id')
  const paramTenantId = getRouterParam(event, 'tenantId')
  const queryTenantId = getQuery(event).tenantId
  const cookieTenantId = getCookie(event, 'mo_currentTenantId')
  const tenantId =
    headerTenantId ||
    paramTenantId ||
    queryTenantId ||
    cookieTenantId

  if (!tenantId || typeof tenantId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Tenant id required' })
  }

  const cacheKey = `${user.id}:${tenantId}`
  let membership = membershipCache.get(cacheKey)

  if (!membership) {
    membership = await prisma.membership.findUnique({
      where: { userId_tenantId: { userId: user.id, tenantId } },
      include: { tenant: { include: { subscription: { include: { plan: true } } } } }
    })
    if (membership) {
      // Stash userId on the cached object so invalidateUserCache can clean
      // entries by user without a separate index.
      membershipCache.set(cacheKey, { ...membership, userId: user.id })
    }
  }

  if (!membership) {
    throw createError({ statusCode: 403, statusMessage: 'No access to tenant' })
  }

  if (opts.minRole && !roleAtLeast(membership.role, opts.minRole)) {
    throw createError({ statusCode: 403, statusMessage: 'Insufficient role' })
  }

  return { user, tenant: membership.tenant, role: membership.role, membership }
}

const ROLE_ORDER: Record<Role, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 }
export function roleAtLeast(role: Role, min: Role) {
  return ROLE_ORDER[role] >= ROLE_ORDER[min]
}

// Force-clear membership entries for a tenant — call on plan change or
// role change so cached features/role don't outlive the update.
export function invalidateTenantMembershipCache(tenantId: string) {
  for (const [k] of (membershipCache as any).map.entries()) {
    if (k.endsWith(`:${tenantId}`)) membershipCache.delete(k)
  }
}
