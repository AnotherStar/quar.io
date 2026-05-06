import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Plans — feature flags drive runtime gating
  const plans = [
    {
      code: 'free',
      name: 'Free',
      priceMonthly: 0,
      priceYearly: 0,
      features: {
        maxInstructions: 3,
        customSections: false,
        modules: [],
        customDomain: false,
        analyticsRetentionDays: 30,
        teamMembers: 1,
        approvalWorkflow: false
      }
    },
    {
      code: 'plus',
      name: 'Plus',
      priceMonthly: 1900,
      priceYearly: 19000,
      features: {
        maxInstructions: 50,
        customSections: true,
        modules: ['warranty-registration'],
        customDomain: false,
        analyticsRetentionDays: 365,
        teamMembers: 3,
        approvalWorkflow: true
      }
    },
    {
      code: 'business',
      name: 'Business',
      priceMonthly: 4900,
      priceYearly: 49000,
      features: {
        maxInstructions: -1,
        customSections: true,
        modules: ['warranty-registration', 'chat-consultant'],
        customDomain: true,
        analyticsRetentionDays: -1,
        teamMembers: 25,
        approvalWorkflow: true
      }
    }
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { code: plan.code },
      update: { ...plan, features: plan.features as object },
      create: { ...plan, features: plan.features as object }
    })
  }

  // Module manifests — code-defined, mirrored to DB so tenants can enable/configure
  const modules = [
    {
      code: 'warranty-registration',
      name: 'Регистрация расширенной гарантии',
      description: 'Форма для регистрации расширенной гарантии прямо в инструкции.',
      version: '1.0.0',
      requiresPlan: 'plus',
      configSchema: {
        type: 'object',
        properties: {
          warrantyMonths: { type: 'integer', default: 12, minimum: 1, maximum: 120 },
          requirePhone: { type: 'boolean', default: false },
          requireSerial: { type: 'boolean', default: true },
          successMessage: { type: 'string', default: 'Спасибо! Ваша гарантия зарегистрирована.' }
        }
      }
    },
    {
      code: 'chat-consultant',
      name: 'Чат с консультантом',
      description: 'Кнопка чата на странице инструкции (интеграция с внешним чатом).',
      version: '1.0.0',
      requiresPlan: 'business',
      configSchema: {
        type: 'object',
        properties: {
          provider: { type: 'string', enum: ['intercom', 'crisp', 'custom'], default: 'crisp' },
          siteId: { type: 'string' }
        }
      }
    }
  ]

  for (const mod of modules) {
    await prisma.moduleManifest.upsert({
      where: { code: mod.code },
      update: { ...mod, configSchema: mod.configSchema as object },
      create: { ...mod, configSchema: mod.configSchema as object }
    })
  }

  console.log('✓ Seeded plans:', plans.map(p => p.code).join(', '))
  console.log('✓ Seeded modules:', modules.map(m => m.code).join(', '))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
