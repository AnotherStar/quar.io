// Email verification flow.
// Tokens are stored in the existing MagicLink table (kept generic so we can
// reuse it for password reset later). We store only the SHA-256 hash of the
// token; the raw value lives in the verification URL we email out.

import { randomBytes, createHash } from 'node:crypto'
import { prisma } from './prisma'
import { sendEmail } from './email'

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24h

function appUrl() {
  return process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:4200'
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createVerificationToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await prisma.magicLink.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS)
    }
  })
  return token
}

export async function sendVerificationEmail(user: { id: string; email: string; name: string | null }) {
  const token = await createVerificationToken(user.id)
  const link = `${appUrl()}/auth/verify?token=${encodeURIComponent(token)}`
  const greeting = user.name ? `Здравствуйте, ${user.name}!` : 'Здравствуйте!'

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      <h1 style="font-size:22px;margin:0 0 16px">Подтвердите email на quar.io</h1>
      <p style="font-size:15px;line-height:1.5;margin:0 0 16px">${greeting}</p>
      <p style="font-size:15px;line-height:1.5;margin:0 0 24px">
        Подтвердите ваш адрес — это снимет красную плашку с публичных страниц инструкций и нужно для будущих уведомлений.
      </p>
      <p style="margin:0 0 24px">
        <a href="${link}" style="display:inline-block;background:#0039df;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:500">
          Подтвердить email
        </a>
      </p>
      <p style="font-size:13px;color:#666;line-height:1.5;margin:0 0 8px">
        Если кнопка не работает, скопируйте ссылку в браузер:
      </p>
      <p style="font-size:13px;color:#666;word-break:break-all;margin:0 0 24px">${link}</p>
      <p style="font-size:13px;color:#999;margin:0">
        Ссылка действует 24 часа. Если вы не регистрировались на quar.io — просто проигнорируйте это письмо.
      </p>
    </div>
  `

  const text = [
    'Подтвердите email на quar.io',
    '',
    greeting,
    '',
    'Перейдите по ссылке, чтобы подтвердить ваш адрес:',
    link,
    '',
    'Ссылка действует 24 часа.'
  ].join('\n')

  await sendEmail({
    to: user.email,
    subject: 'Подтвердите email на quar.io',
    html,
    text
  })
}

export async function consumeVerificationToken(token: string): Promise<{ userId: string } | null> {
  if (!token) return null
  const link = await prisma.magicLink.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!link) return null
  if (link.consumedAt) return null
  if (link.expiresAt < new Date()) return null

  const now = new Date()
  const [, user] = await prisma.$transaction([
    prisma.magicLink.update({ where: { id: link.id }, data: { consumedAt: now } }),
    prisma.user.update({
      where: { id: link.userId },
      data: { emailVerifiedAt: now }
    })
  ])

  return { userId: user.id }
}
