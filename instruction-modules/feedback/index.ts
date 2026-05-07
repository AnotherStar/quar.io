import type { ModuleDefinition } from '~~/modules-sdk/types'

// Feedback — public contact form (ФИО / Телефон / Email / Telegram / сообщение).
// Per-instance config is intentionally absent: the editor block has no
// "Настроить" button. All settings (recipient email, which fields are
// required, success message) live in the tenant-wide admin form on
// /dashboard/modules and are inherited by every block of this module.
const definition: ModuleDefinition = {
  manifest: {
    code: 'feedback',
    name: 'Обратная связь',
    description: 'Форма обратной связи (ФИО, телефон, email, telegram, сообщение). Настраивается в разделе «Модули» — параметры одинаковы для всех инструкций.',
    version: '1.0.0',
    requiresPlan: 'free',
    configSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', default: 'Свяжитесь с нами' },
        description: { type: 'string', default: 'Оставьте сообщение — мы ответим в течение рабочего дня.' },
        recipientEmail: { type: 'string', format: 'email' },
        requireFio: { type: 'boolean', default: true },
        requirePhone: { type: 'boolean', default: false },
        requireEmail: { type: 'boolean', default: true },
        requireTelegram: { type: 'boolean', default: false },
        requireMessage: { type: 'boolean', default: true },
        successMessage: { type: 'string', default: 'Спасибо! Ваше сообщение получено.' }
      }
    },
    configFields: [
      { key: 'title', label: 'Заголовок формы', type: 'string', default: 'Свяжитесь с нами' },
      { key: 'description', label: 'Подзаголовок', type: 'string', default: 'Оставьте сообщение — мы ответим в течение рабочего дня.' },
      { key: 'recipientEmail', label: 'Email получателя', type: 'string', required: true },
      { key: 'requireFio', label: 'ФИО — обязательное поле', type: 'boolean', default: true },
      { key: 'requirePhone', label: 'Телефон — обязательное поле', type: 'boolean', default: false },
      { key: 'requireEmail', label: 'Email — обязательное поле', type: 'boolean', default: true },
      { key: 'requireTelegram', label: 'Telegram — обязательное поле', type: 'boolean', default: false },
      { key: 'requireMessage', label: 'Сообщение — обязательное поле', type: 'boolean', default: true },
      { key: 'successMessage', label: 'Сообщение об успехе', type: 'string', default: 'Спасибо! Ваше сообщение получено.' }
    ]
  },
  PublicComponent: () => import('./Public.vue'),
  // No EditorConfigComponent on purpose — per-instance overrides aren't
  // allowed for feedback. Tenant-wide config is the single source of truth.
  dashboardNavItem: {
    to: '/dashboard/modules/feedback',
    label: 'Обратная связь',
    icon: 'lucide:mail'
  }
}

export default definition
