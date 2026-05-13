// Password reset flow.
// Токены, как и для email-verification, лежат в таблице MagicLink — но хэш
// namespace'ится строкой 'password-reset:' так, чтобы verification-токен не мог
// быть употреблён на эндпоинте сброса пароля и наоборот.

import { randomBytes, createHash } from 'node:crypto'
import { prisma } from './prisma'
import { sendEmail } from './email'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 час — короче, чем для verify

function appUrl() {
  return process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:4200'
}

function hashToken(token: string) {
  return createHash('sha256').update(`password-reset:${token}`).digest('hex')
}

export async function createPasswordResetToken(userId: string): Promise<string> {
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

export async function sendPasswordResetEmail(user: { id: string; email: string; name: string | null }) {
  const token = await createPasswordResetToken(user.id)
  const link = `${appUrl()}/auth/reset?token=${encodeURIComponent(token)}`
  const greeting = user.name ? `Здравствуйте, ${user.name}!` : 'Здравствуйте!'

  const html = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
      <h1 style="font-size:22px;margin:0 0 16px">Сброс пароля на quar.io</h1>
      <p style="font-size:15px;line-height:1.5;margin:0 0 16px">${greeting}</p>
      <p style="font-size:15px;line-height:1.5;margin:0 0 24px">
        Кто-то запросил сброс пароля для вашего аккаунта. Если это были вы — задайте новый пароль по ссылке ниже.
      </p>
      <p style="margin:0 0 24px">
        <a href="${link}" style="display:inline-block;background:#0039df;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:500">
          Задать новый пароль
        </a>
      </p>
      <p style="font-size:13px;color:#666;line-height:1.5;margin:0 0 8px">
        Если кнопка не работает, скопируйте ссылку в браузер:
      </p>
      <p style="font-size:13px;color:#666;word-break:break-all;margin:0 0 24px">${link}</p>
      <p style="font-size:13px;color:#999;margin:0">
        Ссылка действует 1 час. Если вы не запрашивали сброс — просто проигнорируйте это письмо, ваш пароль не изменится.
      </p>
    </div>
  `

  const text = [
    'Сброс пароля на quar.io',
    '',
    greeting,
    '',
    'Перейдите по ссылке, чтобы задать новый пароль:',
    link,
    '',
    'Ссылка действует 1 час. Если вы не запрашивали сброс — проигнорируйте письмо.'
  ].join('\n')

  await sendEmail({
    to: user.email,
    subject: 'Сброс пароля на quar.io',
    html,
    text
  })
}

export async function consumePasswordResetToken(token: string): Promise<{ userId: string } | null> {
  if (!token) return null
  const link = await prisma.magicLink.findUnique({ where: { tokenHash: hashToken(token) } })
  if (!link) return null
  if (link.consumedAt) return null
  if (link.expiresAt < new Date()) return null

  // Помечаем consumed, но пароль обновляет caller — потому что нам нужен
  // хэшированный новый пароль, и хочется атомарно сделать reset+invalidate.
  await prisma.magicLink.update({ where: { id: link.id }, data: { consumedAt: new Date() } })
  return { userId: link.userId }
}
