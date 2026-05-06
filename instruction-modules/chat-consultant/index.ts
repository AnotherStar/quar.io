import type { ModuleDefinition } from '~~/modules-sdk/types'

const definition: ModuleDefinition = {
  manifest: {
    code: 'chat-consultant',
    name: 'Чат с консультантом',
    description: 'Кнопка чата на публичной странице инструкции (заглушка для интеграции с внешним чатом).',
    version: '1.0.0',
    requiresPlan: 'business',
    configSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['intercom', 'crisp', 'custom'], default: 'crisp' },
        siteId: { type: 'string' }
      }
    },
    configFields: [
      {
        key: 'provider',
        label: 'Провайдер',
        type: 'select',
        default: 'crisp',
        options: [
          { value: 'crisp', label: 'Crisp' },
          { value: 'intercom', label: 'Intercom' },
          { value: 'custom', label: 'Custom' }
        ]
      },
      { key: 'siteId', label: 'Site ID', type: 'string' }
    ]
  },
  PublicComponent: () => import('./Public.vue')
}

export default definition
