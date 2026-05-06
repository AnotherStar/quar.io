import { H3Event, getCookie, setCookie, deleteCookie, createError } from 'h3'
import argon2 from 'argon2'
import { prisma } from './prisma'

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
    await prisma.session.delete({ where: { id } }).catch(() => {})
  }
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export async function getSessionUser(event: H3Event) {
  const id = getCookie(event, SESSION_COOKIE)
  if (!id) return null
  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true }
  })
  if (!session || session.expiresAt < new Date()) return null
  return session.user
}

export async function requireUser(event: H3Event) {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  return user
}
