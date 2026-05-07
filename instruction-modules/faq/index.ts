import type { ModuleDefinition } from '~~/modules-sdk/types'

// FAQ — per-instruction-instance Q&A accordion. Configuration lives on the
// editor node (configOverride) and is edited via a modal opened from the
// module-ref dropdown. There is no tenant-wide config: each FAQ block is
// authored where it's placed.
const definition: ModuleDefinition = {
  manifest: {
    code: 'faq',
    name: 'Вопрос — Ответ (FAQ)',
    description: 'Аккордеон с вопросами и ответами. Настраивается прямо в редакторе кнопкой «Настроить».',
    version: '1.0.0',
    requiresPlan: 'free',
    configSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', default: 'Часто задаваемые вопросы' },
        expandedByDefault: { type: 'boolean', default: false },
        items: {
          type: 'array',
          maxItems: 10,
          default: [],
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              answer: { type: 'string' }
            },
            required: ['question', 'answer']
          }
        }
      }
    }
    // No configFields → tenant admin form is empty by design.
  },
  PublicComponent: () => import('./Public.vue'),
  EditorConfigComponent: () => import('./EditorConfig.vue')
}

export default definition
