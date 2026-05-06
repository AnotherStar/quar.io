import { H3Event, createError } from 'h3'
import type { Role } from '@prisma/client'
import { prisma } from './prisma'
import { requireUser } from './auth'

// Resolve and require a tenant the user has access to.
// Tenant id can come from a header (`x-tenant-id`) for dashboard requests,
// or from path params for tenant-scoped routes.
export async function requireTenant(event: H3Event, opts: { minRole?: Role } = {}) {
  const user = await requireUser(event)
  const tenantId =
    getHeader(event, 'x-tenant-id') ||
    getRouterParam(event, 'tenantId') ||
    getQuery(event).tenantId

  if (!tenantId || typeof tenantId !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Tenant id required' })
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId } },
    include: { tenant: { include: { subscription: { include: { plan: true } } } } }
  })

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
