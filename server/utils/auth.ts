import { H3Event, getCookie, setCookie, deleteCookie, createError } from 'h3'
import argon2 from 'argon2'
import { prisma } from './prisma'
import { sessionCache, membershipCache } from './cache'

const SESSION_COOKIE = 'mo_session'
const SESSION_TTL_DAYS = 30

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id })
}

export async function verifyPassword(hash: string, password: string) {
  try {
    return await argon2.verify(hash, password)
  } catch {
    return false
  }
}

export async function createSession(event: H3Event, userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt,
      userAgent: getRequestHeader(event, 'user-agent') ?? null,
      ip: getRequestIP(event, { xForwardedFor: true }) ?? null
    }
  })
  setCookie(event, SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/'
  })
  return session
}

export async function destroySession(event: H3Event) {
  const id = getCookie(event, SESSION_COOKIE)
  if (id) {
    sessionCache.delete(id)
    // Membership cache keyed by userId+tenantId; we don't have userId here
    // without DB lookup, so just rely on its TTL to clear stale entries.
    await prisma.session.delete({ where: { id } }).catch(() => {})
  }
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export async function getSessionUser(event: H3Event) {
  const id = getCookie(event, SESSION_COOKIE)
  if (!id) return null

  const cached = sessionCache.get(id)
  if (cached) {
    if (cached.expiresAt < Date.now()) { sessionCache.delete(id); return null }
    return cached.user
  }

  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true }
  })
  if (!session || session.expiresAt < new Date()) return null
  sessionCache.set(id, { user: session.user, expiresAt: session.expiresAt.getTime() })
  return session.user
}

// Invalidate all cached entries that point to a given userId. Used on
// password reset / forced logout so no cached session can outlive the change.
export function invalidateUserCache(userId: string) {
  // Drop any session entries belonging to this user
  for (const [k, v] of (sessionCache as any).map.entries()) {
    if (v.value?.user?.id === userId) sessionCache.delete(k)
  }
  for (const [k, v] of (membershipCache as any).map.entries()) {
    if (v.value?.userId === userId) membershipCache.delete(k)
  }
}

export async function requireUser(event: H3Event) {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  return user
}
