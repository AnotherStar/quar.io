// Yandex.Metrika конфиг и канонический список целей.
//
// Каждый код должен быть заведён в интерфейсе Метрики как цель типа
// «JavaScript-событие» с тем же идентификатором — иначе reachGoal'ы не
// попадут в отчёты и не будут доступны в Директе.

export const YM_COUNTER_ID = 109158550

export const YM_GOALS = [
  // Верх воронки
  'landing_cta_click',
  'pricing_view',

  // Регистрация и активация
  'signup_started',
  'signup_completed',
  'trial_started',
  'email_verified',
  'password_recovery_started',

  // Ключевые продуктовые действия
  'instruction_created',
  'instruction_published',
  'module_added',

  // Редактор
  'editor_ai_used',
  'editor_image_uploaded',
  'analytics_viewed',

  // Деньги. Коды зарезервированы — выстрелы появятся, когда подключим
  // checkout-флоу. Создавать в Метрике их уже можно, чтобы стратегии
  // Директа сразу видели полный список.
  'pricing_plan_selected',
  'checkout_started',
  'payment_completed',
  'plan_upgraded',
  'subscription_renewed'
] as const

export type YmGoal = (typeof YM_GOALS)[number]
