import type { ModuleDefinition } from '~~/modules-sdk/types'

const definition: ModuleDefinition = {
  manifest: {
    code: 'chat-consultant',
    name: 'Чат с поддержкой',
    description: 'Telegram-чат поддержки: покупатель пишет боту клиента, операторы отвечают из закрытой группы и из дашборда.',
    version: '1.0.0',
    requiresPlan: 'plus',
    configSchema: {
      type: 'object',
      properties: {
        botToken: { type: 'string' },
        botUsername: { type: 'string' },
        supportChatId: { type: 'string' },
        workingHours: { type: 'string', default: 'Пн–Пт 10:00–19:00' },
        buttonLabel: { type: 'string', default: 'Задать вопрос в Telegram' },
        welcomeMessage: { type: 'string', default: 'Здравствуйте! Напишите ваш вопрос, мы ответим здесь.' },
        closedMessage: { type: 'string', default: 'Спасибо за обращение! Если вопрос останется, напишите нам снова.' },
        webhookSecret: { type: 'string' }
      }
    },
    configFields: [
      { key: 'botToken', label: 'Telegram bot token', type: 'string', required: true },
      { key: 'botUsername', label: 'Bot username', type: 'string', required: true },
      { key: 'supportChatId', label: 'ID группы поддержки', type: 'string', required: true },
      { key: 'workingHours', label: 'Часы работы', type: 'string', default: 'Пн–Пт 10:00–19:00' },
      { key: 'buttonLabel', label: 'Текст кнопки', type: 'string', default: 'Задать вопрос в Telegram' },
      { key: 'welcomeMessage', label: 'Приветствие в боте', type: 'string', default: 'Здравствуйте! Напишите ваш вопрос, мы ответим здесь.' },
      { key: 'closedMessage', label: 'Сообщение при закрытии', type: 'string', default: 'Спасибо за обращение! Если вопрос останется, напишите нам снова.' }
    ]
  },
  PublicComponent: () => import('./Public.vue'),
  dashboardNavItem: {
    to: '/dashboard/modules/support',
    label: 'Поддержка',
    icon: 'lucide:messages-square'
  }
}

export default definition
