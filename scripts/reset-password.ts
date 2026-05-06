// Resets the password of an existing user.
// Reads MANUALONLINE_USERNAME (email) and MANUALONLINE_PASSWORD (new password)
// from .env. Use for dev/recovery; do not ship to production.
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'
import { config } from 'dotenv'

config()

const email = process.env.MANUALONLINE_USERNAME
const password = process.env.MANUALONLINE_PASSWORD

if (!email || !password) {
  console.error('Set MANUALONLINE_USERNAME and MANUALONLINE_PASSWORD in .env')
  process.exit(1)
}
if (password.length < 8) {
  console.error('Password must be at least 8 characters')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`User not found: ${email}`)
    process.exit(1)
  }
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
  // Invalidate all existing sessions for safety
  await prisma.session.deleteMany({ where: { userId: user.id } })
  console.log(`✓ Password reset for ${email}`)
  console.log(`  All sessions invalidated — login again with the new password.`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
