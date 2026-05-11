// Назначает пользователя глобальным админом платформы (User.isAdmin = true).
// Также умеет снимать флаг (--revoke).
//
// Глобального admin-роля в схеме нет помимо этого булевого поля — здесь нет
// аудит-лога. Если когда-нибудь это понадобится — добавим отдельную таблицу.
//
// Использование:
//   pnpm tsx scripts/promote-admin.ts user@example.com
//   pnpm tsx scripts/promote-admin.ts user@example.com --revoke
import { PrismaClient } from '@prisma/client'

const args = process.argv.slice(2)
const email = args.find((a) => !a.startsWith('--'))
const revoke = args.includes('--revoke')

if (!email) {
  console.error('Usage: pnpm tsx scripts/promote-admin.ts <email> [--revoke]')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({ where: { email: email! } })
  if (!user) {
    console.error(`User not found: ${email}`)
    process.exit(1)
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: !revoke }
  })
  // Сбросим серверный in-memory кэш сессий косвенно: на dev-сервере
  // достаточно перелогиниться (sessionCache TTL = ~60s), либо рестартнуть
  // процесс. Уже залогиненный админ получит флаг при следующем /api/auth/me.
  console.log(`✓ ${email} — isAdmin = ${updated.isAdmin}`)
  if (!revoke) {
    console.log('  Перелогиньтесь, чтобы клиент увидел новый флаг.')
  }
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
