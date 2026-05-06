import type { ModuleDefinition } from '~~/modules-sdk/types'

const definition: ModuleDefinition = {
  manifest: {
    code: 'warranty-registration',
    name: 'Регистрация расширенной гарантии',
    description: 'Форма регистрации расширенной гарантии прямо на странице инструкции.',
    version: '1.0.0',
    requiresPlan: 'plus',
    configSchema: {
      type: 'object',
      properties: {
        warrantyMonths: { type: 'integer', default: 12 },
        requirePhone: { type: 'boolean', default: false },
        requireSerial: { type: 'boolean', default: true },
        successMessage: { type: 'string', default: 'Спасибо! Гарантия зарегистрирована.' }
      }
    },
    configFields: [
      { key: 'warrantyMonths', label: 'Срок гарантии (мес.)', type: 'number', default: 12 },
      { key: 'requirePhone', label: 'Запрашивать телефон', type: 'boolean', default: false },
      { key: 'requireSerial', label: 'Запрашивать серийный номер', type: 'boolean', default: true },
      { key: 'successMessage', label: 'Сообщение об успехе', type: 'string', default: 'Спасибо! Гарантия зарегистрирована.' }
    ]
  },
  PublicComponent: () => import('./Public.vue')
}

export default definition
