// Единая таблица фич quar.io и их разбивки по тарифам.
//
// Это рабочая спецификация продукта, а не runtime-источник тарифов.
// Реальные ограничения для биллинга/гейтинга живут в `server/utils/plan.ts`
// и Prisma-модели `Plan`. Здесь — то, что должно быть в карточке тарифа
// и в админской сводке: какие фичи существуют, в каком статусе и как
// распределены по тарифным линейкам.
//
// Поле `description` намеренно написано в формате «промпта на исполнение»:
// 2–8 предложений, конкретные модели/пути/ограничения, чтобы можно было
// скопировать и передать агенту как задачу.

export type FeatureStatus = 'ready' | 'preview' | 'draft'

export const FEATURE_STATUS_LABEL: Record<FeatureStatus, string> = {
  ready: 'Готова',
  preview: 'Превью',
  draft: 'Черновик'
}

export interface FeatureMatrixPlan {
  code: string
  name: string
  // Цена в рублях за месяц (или разовая — см. `priceNote`).
  price: number
  priceNote?: string
}

export const FEATURE_MATRIX_PLANS: FeatureMatrixPlan[] = [
  { code: 'start', name: 'Старт', price: 500, priceNote: 'в месяц' },
  { code: 'business', name: 'Бизнес', price: 2900, priceNote: 'в месяц' },
  { code: 'pro', name: 'Про', price: 9900, priceNote: 'в месяц' }
]

// Значение для конкретной ячейки фича × тариф.
// `null` — фича недоступна на тарифе.
// `true` — доступна без ограничений.
// `false` — явное «нет» (рендерится как «нет» вместо пустой ячейки).
// `string` — конкретный лимит/квота (например, «10 инструкций», «По счётчику»).
export type FeatureCell = null | boolean | string

export interface FeatureRow {
  code: string
  name: string
  status: FeatureStatus
  // Развёрнутое описание/ТЗ. Раскрывается по клику на строке в админке,
  // оттуда же копируется как промпт. Текст в свободной форме, 2–8 предложений.
  description: string
  // Цена за превышение лимита (если у фичи есть квота).
  overage?: string
  // Ключи совпадают с `FEATURE_MATRIX_PLANS[].code`.
  byPlan: Record<string, FeatureCell>
}

export const FEATURE_MATRIX: FeatureRow[] = [
  {
    code: 'instructions-editor',
    name: 'Редактор инструкций',
    status: 'ready',
    overage: '10 ₽ за инструкцию',
    description:
      'Поддерживать TipTap-редактор инструкций в pages/dashboard/instructions/[id]/edit.vue: блочная структура, slash-меню, инлайн-форматирование, drag-and-drop, вставка медиа. ' +
      'Лимит количества инструкций по тарифу применяется в server/utils/plan.ts через effectiveFeatures().maxInstructions. ' +
      'При превышении лимита черновик сохраняется, но публикация требует апгрейда или оплаты сверх квоты. ' +
      'В pages/dashboard/instructions/index.vue показывать индикатор «N из M» и апселл при попытке создать сверх квоты.',
    byPlan: { start: '10 инструкций', business: '100 инструкций', pro: '1000 инструкций' }
  },
  {
    code: 'custom-sections',
    name: 'Пользовательские секции',
    status: 'ready',
    overage: '100 ₽ за секцию',
    description:
      'Переиспользуемые блоки (Section), которые подключаются к нескольким инструкциям через SectionRef в TipTap-документе. ' +
      'Управление — pages/dashboard/sections/, рендер на публичной странице через server/utils/publicResolve.ts. ' +
      'Лимит активных секций гейтится по тарифу в server/utils/plan.ts (features.customSections). ' +
      'При тарифной деградации данные секций не удаляются — на рендере просто скрываются ссылки на них, а в дашборде помечаются как заблокированные.',
    byPlan: { start: '3 секции', business: '10 секций', pro: '50 секций' }
  },
  {
    code: 'ai-image-generation',
    name: 'ИИ-генерация изображений',
    status: 'ready',
    description:
      'Генерация иллюстраций через OpenAI Images API прямо из редактора. ' +
      'Эндпоинт — server/api/ai/image-generate.post.ts, расход пишется в AiUsageEvent с feature=image-generation. ' +
      'На тарифе Старт жёсткий лимит 3 генерации в месяц, на Бизнес/Про — по счётчику с расчётом стоимости по факт-цене провайдера. ' +
      'Готовое изображение сохраняется в S3 под ключом ${tenantId}/... и вставляется в TipTap-документ как обычный image-блок.',
    byPlan: { start: '3 / месяц', business: 'По счётчику', pro: 'По счётчику' }
  },
  {
    code: 'ai-instruction-generation',
    name: 'ИИ-генерация инструкций',
    status: 'preview',
    description:
      'Импорт черновика инструкции из PDF: парсер выгружает страницы как изображения в S3, vision-LLM анализирует их и возвращает структурированные TipTap-блоки. ' +
      'Логика — server/api/instructions/[id]/generate-stream.post.ts, на клиенте SSE-стрим прогресса по шагам. ' +
      'Сейчас аплоадятся все извлечённые превью, а используется малая часть — добавить ленивый upload или фоновый cleanup сирот в S3. ' +
      'Доступ — Бизнес/Про, биллинг по AiUsageEvent с feature=instruction-generation.',
    byPlan: { start: null, business: 'По счётчику', pro: 'По счётчику' }
  },
  {
    code: 'ai-advisor',
    name: 'ИИ-адвайзер',
    status: 'draft',
    description:
      'Side-panel в редакторе инструкции, который анализирует текущий черновик и предлагает улучшения: что переписать, какие блоки добавить, какой модуль подключить под задачу. ' +
      'Доступ через кнопку в тулбаре редактора, контекст — текущий TipTap-документ + метаданные инструкции. ' +
      'Доступ — только Про, расход пишется в AiUsageEvent с feature=advisor. ' +
      'Подсказки должны быть actionable: каждая с кнопкой «применить», которая правит документ через TipTap-команды.',
    byPlan: { start: false, business: false, pro: true }
  },
  {
    code: 'visits-analytics',
    name: 'Аналитика по визитам',
    status: 'preview',
    description:
      'Дашборд визитов по публичным инструкциям: уникальные посетители, география, устройства, время сессии, источники. ' +
      'Данные собираются через beacon в server/api/analytics/visit.post.ts и пишутся в ViewEvent с типом VISIT. ' +
      'Страница — pages/dashboard/analytics/index.vue и per-instruction pages/dashboard/instructions/[id]/analytics.vue. ' +
      'Retention данных управляется features.analyticsRetentionDays в тарифе; на Старте — недоступно, на Бизнес/Про — полный доступ.',
    byPlan: { start: false, business: true, pro: true }
  },
  {
    code: 'module-warranty',
    name: 'Модуль: расширенная гарантия',
    status: 'preview',
    description:
      'Модуль регистрации покупки: посетитель оставляет данные через форму на публичной инструкции, согласие сохраняется в WarrantyRegistration с embedding-копией текста согласия для compliance. ' +
      'Конфиг полей — instruction-modules/warranty-registration/EditorConfig.vue, рендер — Public.vue. ' +
      'Управление заявками в pages/dashboard/modules/warranty.vue, экспорт CSV для CRM. ' +
      'Доступ — Бизнес/Про; при деградации тарифа данные сохраняются, форма скрывается.',
    byPlan: { start: null, business: true, pro: true }
  },
  {
    code: 'header-logo',
    name: 'Свой логотип в шапке',
    status: 'ready',
    description:
      'Кастомный логотип в шапке публичной инструкции. ' +
      'Загружается в настройках тенанта (pages/dashboard/settings.vue → Tenant.brandingLogoUrl), применяется в pages/[tenantSlug]/[instructionSlug].vue через publicResolve. ' +
      'Доступно на всех тарифах. При тарифной деградации логотип не сбрасывается — продолжает отображаться.',
    byPlan: { start: null, business: null, pro: null }
  },
  {
    code: 'advanced-analytics',
    name: 'Расширенная аналитика',
    status: 'draft',
    description:
      'Углублённая аналитика поверх базовой: воронка прохождения блоков, retention посетителей по инструкции, сравнение версий, экспорт сырых событий CSV. ' +
      'Источник — события ViewEvent (VISIT, BLOCK_VIEW, BLOCK_DWELL), агрегация в фоне через BullMQ в материализованные view. ' +
      'Визуализация — pages/dashboard/analytics/ с фильтрами по периодам, группам товаров, тегам. ' +
      'Доступ — только Про.',
    byPlan: { start: null, business: null, pro: true }
  },
  {
    code: 'footer-contacts',
    name: 'Свои контакты в футере',
    status: 'draft',
    description:
      'Произвольные контакты тенанта в футере публичной инструкции: телефон, email, мессенджеры, ссылки на соцсети. ' +
      'Поля настраиваются в pages/dashboard/settings.vue, хранятся как JSON в Tenant. ' +
      'Рендер — в футер-компоненте публичной страницы под /components/public/. ' +
      'Тариф пока не зафиксирован: решить, оставить базовым или сделать частью брендирования Бизнес+.',
    byPlan: { start: null, business: null, pro: null }
  },
  {
    code: 'free-qr',
    name: 'Бесплатные QR-коды',
    status: 'draft',
    overage: '1 ₽ за код',
    description:
      'Лимит бесплатно сгенерированных активационных QR-кодов на месяц. ' +
      'Считается по числу созданных ActivationQrCode за текущий период подписки (subscription.currentPeriodStart). ' +
      'Старт — 100, Бизнес — 500, Про — 3000; сверх лимита — 1 ₽ за код, биллится через баланс/карту. ' +
      'При сбросе подписки счётчик не обнуляется, а пересчитывается на дату нового периода.',
    byPlan: { start: '100 / месяц', business: '500 / месяц', pro: '3000 / месяц' }
  },
  {
    code: 'sticker-editor',
    name: 'Редактор стикеров',
    status: 'draft',
    description:
      'WYSIWYG-редактор шаблонов для печати QR-стикеров: фон, размер, положение QR, доп. текст, штрихкод. ' +
      'Сохраняется в PrintTemplateDesign, фоновое изображение — в S3 под tenant-префиксом. ' +
      'Управление шаблонами в pages/dashboard/print/, применение к партии при создании PrintBatch. ' +
      'Доступ — Бизнес/Про.',
    byPlan: { start: null, business: true, pro: true }
  },

  // --- Редактор и контент ---
  {
    code: 'approval-workflow',
    name: 'Согласование публикации: черновик → ревью → публикация',
    status: 'ready',
    description:
      'Жизненный цикл инструкции: DRAFT → IN_REVIEW → PUBLISHED. ' +
      'Редактор отправляет инструкцию на ревью, владелец/админ публикует. ' +
      'Статусы — Instruction.status, переходы в server/api/instructions/[id]/status.post.ts с проверкой ролей. ' +
      'При публикации создаётся неизменяемый InstructionVersion-снапшот, draftContent остаётся редактируемым. Доступно на всех тарифах.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'versioning',
    name: 'История версий и неизменяемые снапшоты',
    status: 'ready',
    description:
      'Каждая публикация создаёт неизменяемый InstructionVersion с полным TipTap-документом и метаданными. ' +
      'Публичная страница рендерит последний опубликованный снапшот, а не draft — это даёт стабильные QR-ссылки и возможность откатиться. ' +
      'Логика — server/api/instructions/[id]/publish.post.ts и server/utils/publicResolve.ts. ' +
      'Строго: published-версии никогда не редактируются задним числом — только создаётся новая.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'safety-block',
    name: 'Спецблок «Безопасность / предупреждение»',
    status: 'ready',
    description:
      'Специальный блок в редакторе с акцентным фоном и иконкой предупреждения, не редактируется как обычный параграф. ' +
      'Реализован как кастомное TipTap-расширение в components/editor/extensions/, вставляется через slash-меню. ' +
      'На публичной странице рендерится выделенным и не сворачивается. ' +
      'Доступен на всех тарифах — базовый инструмент compliance.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'templates',
    name: 'Шаблоны инструкций',
    status: 'draft',
    description:
      'Системные инструкции с флагом isTemplate=true, на основе которых пользователь создаёт свою. ' +
      'Диалог «Создать из шаблона» в pages/dashboard/instructions/index.vue: превью, категории (бытовая техника, инструменты, электроника, ...), поиск. ' +
      'Шаблоны живут в seed-данных, видны всем тенантам, при выборе копируются в новый Instruction draftContent. ' +
      'Доступно на всех тарифах.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'bulk-import',
    name: 'Массовый импорт CSV / JSON',
    status: 'draft',
    description:
      'Страница массового импорта: загрузка CSV/JSON со списком товаров (SKU, название, штрихкод, ссылка на PDF/изображения), dry-run превью того, что создастся, батч-создание с прогресс-баром. ' +
      'Парсер обрабатывает файл через BullMQ-очередь, чтобы не блокировать запрос. ' +
      'Результат: набор Instruction в статусе DRAFT, готовых к редактированию. ' +
      'Доступ — Бизнес/Про.',
    byPlan: { start: null, business: true, pro: true }
  },
  {
    code: 'pdf-draft-import',
    name: 'Импорт черновика инструкции из PDF',
    status: 'preview',
    description:
      'Загрузить PDF → разбить на страницы → выгрузить превью в S3 → vision-LLM генерирует TipTap-документ → отдать пользователю как черновик. ' +
      'Реализовано в server/api/instructions/[id]/generate-stream.post.ts с SSE-стримом статусов шагов. ' +
      'После генерации пользователь видит готовый Instruction.draftContent и редактирует обычным редактором. ' +
      'Биллинг — AiUsageEvent, доступ — Бизнес/Про.',
    byPlan: { start: null, business: 'По счётчику', pro: 'По счётчику' }
  },

  // --- Публичный читатель ---
  {
    code: 'instruction-search',
    name: 'Поиск внутри инструкции',
    status: 'ready',
    description:
      'Поиск по содержимому опубликованной инструкции на публичной странице. ' +
      'Поле в шапке, моментальный фильтр блоков по совпадению текста с подсветкой. ' +
      'Реализуется на клиенте без обращений к серверу — все блоки уже на странице после SSR. ' +
      'Доступно на всех тарифах, должен корректно работать на мобильных и не мешать сбору BLOCK_VIEW.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'block-feedback',
    name: 'Реакции и отзывы на отдельные блоки',
    status: 'ready',
    description:
      'Виджет реакций (👍 / 👎 / комментарий) под каждым блоком публичной инструкции, без авторизации посетителя. ' +
      'Данные пишутся в FeedbackSubmission, на endpoint — rate-limit через server/utils/rateLimit.ts по IP/блоку. ' +
      'Сводка показывается на странице аналитики инструкции — где блоки получают негатив или вопросы. ' +
      'Включено на всех тарифах.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'step-by-step',
    name: 'Пошаговый режим чтения',
    status: 'draft',
    description:
      'Альтернативный режим чтения инструкции: один блок на экране, кнопки «дальше / назад», прогресс-бар сверху. ' +
      'Тоггл в шапке публичной страницы, состояние сохраняется в URL (?step=N). ' +
      'Реализовать как отдельный рендерер (StepByStepRenderer.vue) поверх того же набора блоков — схема не меняется. ' +
      'Аналитика прохождения идёт через те же BLOCK_VIEW-события. Доступно на всех тарифах.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'tts',
    name: 'Озвучка инструкции (TTS)',
    status: 'draft',
    description:
      'Кнопка «слушать» на публичной странице, проигрывает инструкцию голосом. ' +
      'Базовый режим — клиентский Web Speech API (бесплатный, ограниченное качество, доступен на Бизнес+). ' +
      'Премиум-режим — серверная генерация через ElevenLabs/OpenAI TTS с кешем по instructionVersionId в S3 (доступен только на Про). ' +
      'Учёт расхода — AiUsageEvent с feature=tts.',
    byPlan: { start: false, business: true, pro: true }
  },
  {
    code: 'pdf-export',
    name: 'Экспорт инструкции в PDF',
    status: 'draft',
    description:
      'Кнопка «скачать PDF» на публичной странице. ' +
      'Сервер рендерит HTML→PDF через Playwright (server/utils/printPdf.ts уже есть для других сценариев). ' +
      'Кеш файла — по instructionVersionId в S3, чтобы повторные скачивания не нагружали LLM/рендер. ' +
      'Дизайн PDF: чистая типографика, QR на первой странице, оглавление по h1/h2. Доступ — Бизнес/Про.',
    byPlan: { start: null, business: true, pro: true }
  },
  {
    code: 'pwa-offline',
    name: 'Офлайн-доступ к посещённым инструкциям (PWA)',
    status: 'draft',
    description:
      'Подключить Nuxt PWA модуль: web manifest, иконка установки на главный экран, service worker. ' +
      'Service worker кеширует посещённые публичные страницы (HTML + CSS + изображения), чтобы инструкция открывалась без сети. ' +
      'Аналитика в офлайне ставится в очередь и досылается при возврате онлайн. ' +
      'Доступно на всех тарифах.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'video-chapters',
    name: 'Видео с главами',
    status: 'draft',
    description:
      'Расширение существующего video-блока в редакторе: массив chapters: { time, label, blockId }. ' +
      'На публичной странице — таймлайн под видео с метками, по клику переход к секунде. ' +
      'Текстовые блоки могут ссылаться на таймкод через ссылку: клик прокручивает видео и проигрывает с нужной секунды. ' +
      'Доступно на всех тарифах.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'conditional-content',
    name: 'Условный контент: блок «развилка»',
    status: 'draft',
    description:
      'Новый тип блока «развилка» в TipTap: набор вариантов с условиями («модель X», «дата покупки позже Y», «выбран ответ Z»). ' +
      'На публичной странице — UI выбора пользователем, далее блоки скрываются/показываются в зависимости от выбора, состояние держится в URL. ' +
      'Контракт условий — JSON schema в shared/schemas/, рендерер — отдельный компонент в components/public/. ' +
      'Доступ — Бизнес/Про.',
    byPlan: { start: null, business: true, pro: true }
  },

  // --- Модули инструкций ---
  {
    code: 'module-feedback',
    name: 'Модуль: обратная связь',
    status: 'ready',
    description:
      'Модуль для приёма обратной связи с публичной инструкции: настраиваемая форма с произвольными полями (текст, выбор, рейтинг, контакт). ' +
      'Конфиг — instruction-modules/feedback/EditorConfig.vue, рендер — Public.vue, заявки в FeedbackSubmission. ' +
      'Управление в pages/dashboard/modules/feedback.vue: фильтрация, статусы, экспорт. ' +
      'Доступно на всех тарифах.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'module-faq',
    name: 'Модуль: FAQ-аккордеон',
    status: 'ready',
    description:
      'Модуль FAQ: блок с разворачиваемыми вопросами и ответами, конфигурируется per-block прямо в редакторе. ' +
      'Источник — instruction-modules/faq/, рендер на публичной странице — accordion с анимацией. ' +
      'Аналитика разворачиваний пишется в ViewEvent (новый подтип FAQ_OPEN) — видно, какие вопросы реально читают. ' +
      'Доступно на всех тарифах.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'module-chat-consultant',
    name: 'Модуль: чат-консультант с Telegram-ботом',
    status: 'ready',
    description:
      'Чат-виджет на публичной инструкции, который перенаправляет сообщения посетителя в Telegram-чат поддержки тенанта. ' +
      'Webhook бота — server/api/telegram-support/webhook/[configId].post.ts, тикеты и сообщения — SupportTicket / SupportMessage. ' +
      'Настройка бота (токен, чат-ID, приветствие) — в pages/dashboard/modules/support.vue. ' +
      'Доступ — Бизнес/Про.',
    byPlan: { start: null, business: true, pro: true }
  },

  // --- ИИ ---
  {
    code: 'ai-image-edit',
    name: 'ИИ-правка изображений в редакторе',
    status: 'ready',
    description:
      'Кнопка правки картинки в редакторе: загрузить изображение, опционально выделить область, задать prompt («убери фон», «замени надпись на X», «увеличь резкость»). ' +
      'Эндпоинт — server/api/ai/image-edit.post.ts, длинные операции через job-модель AiImageEditJob с поллингом статуса. ' +
      'Результат сохраняется в S3 рядом с оригиналом. ' +
      'Биллинг — AiUsageEvent с feature=image-edit, доступ — Бизнес/Про.',
    byPlan: { start: null, business: 'По счётчику', pro: 'По счётчику' }
  },
  {
    code: 'ai-proofreading',
    name: 'ИИ-проверка текста инструкции',
    status: 'draft',
    description:
      'Кнопка «проверить» в редакторе запускает LLM-проход по блокам инструкции и возвращает предложения diff-style: опечатки, неоднозначности, тон, повторы, противоречия. ' +
      'Пользователь видит правки списком и принимает/отклоняет каждую поштучно (применение — через TipTap-команды). ' +
      'Расход — AiUsageEvent с feature=proofreading. ' +
      'Доступ — только Про.',
    byPlan: { start: null, business: null, pro: true }
  },
  {
    code: 'ai-rag-assistant',
    name: 'ИИ-ассистент по инструкции (RAG-чат)',
    status: 'draft',
    description:
      'Чат-ассистент на публичной странице инструкции: посетитель задаёт вопрос, LLM отвечает с привязкой к содержимому. ' +
      'Эмбеддинги блоков хранятся в pgvector (миграция Postgres), поиск по similarity, ответ генерируется LLM с цитатами на конкретные блоки. ' +
      'Включается per-instruction в настройках, embed-виджет на публичной странице. ' +
      'Доступ — только Про, расход в AiUsageEvent с feature=rag.',
    byPlan: { start: null, business: null, pro: true }
  },

  // --- Аналитика ---
  {
    code: 'block-heatmaps',
    name: 'Тепловые карты по блокам',
    status: 'draft',
    description:
      'Визуализация внимания посетителей на странице аналитики инструкции: каждый блок подкрашен по доле просмотров и среднему времени dwell. ' +
      'Источник — события ViewEvent типов BLOCK_VIEW и BLOCK_DWELL (уже пишутся в MVP). ' +
      'Агрегация в фоне (BullMQ → материализованная таблица), оверлей рендерится поверх превью инструкции в pages/dashboard/instructions/[id]/analytics.vue. ' +
      'Доступ — только Про.',
    byPlan: { start: null, business: null, pro: true }
  },
  {
    code: 'ab-testing',
    name: 'A/B-тестирование версий',
    status: 'draft',
    description:
      'Эксперименты между двумя InstructionVersion одного товара: распределение трафика, цели (просмотр блока, конверсия модуля, прохождение step-by-step). ' +
      'Новая модель Experiment, splitter на публичной странице по cookie/посетителю, чтобы один и тот же человек видел одну версию. ' +
      'Дашборд — confidence-интервалы и эффект размера, а не голые проценты конверсии. ' +
      'Доступ — только Про.',
    byPlan: { start: null, business: null, pro: true }
  },

  // --- QR и печать ---
  {
    code: 'activation-qr',
    name: 'Активационные QR с привязкой по штрихкоду',
    status: 'ready',
    description:
      'QR-коды, которые печатаются ДО того, как инструкция готова: на партии товара. ' +
      'Каждый код хранит productBarcode (GTIN/штрихкод). ' +
      'При сканировании штрихкода в pages/dashboard/scan-qr.vue код привязывается к существующей Instruction по productBarcode — навсегда. ' +
      'Модель — ActivationQrCode, лимит по тарифу ограничен через free-qr.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'print-batches',
    name: 'Печать партий QR-стикеров с шаблонами',
    status: 'ready',
    description:
      'Пакетная печать QR-стикеров: выбираем PrintTemplateDesign, размер партии, генерируется PDF с N стикерами на лист. ' +
      'Модели — PrintBatch + связи с ActivationQrCode, PDF в S3 (PrintBatch.pdfStorageKey). ' +
      'Управление — pages/dashboard/print/. ' +
      'Доступ на всех тарифах, размер партии ограничен лимитом бесплатных QR.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'qr-generator',
    name: 'Генератор стилизованных QR (PDF / SVG / PNG)',
    status: 'draft',
    description:
      'Самостоятельный генератор QR-кодов в дашборде, не привязанный к инструкциям: ввод URL → настройка цветов, формы точек, логотипа → экспорт в PDF/SVG/PNG. ' +
      'Использовать библиотеку qr-code-styling. ' +
      'Отдельная страница в дашборде, результат скачивается без сохранения в БД (или опционально сохраняется как «мои QR»). ' +
      'Доступно на всех тарифах.',
    byPlan: { start: true, business: true, pro: true }
  },
  {
    code: 'version-warning',
    name: 'Предупреждение о неактуальной версии при сканировании',
    status: 'draft',
    description:
      'В QR при печати запекается параметр ?v=<versionId>. ' +
      'На публичной странице сравнивается с текущей опубликованной версией; если устарела — показывается баннер «доступна новая версия инструкции» со ссылкой на актуальную. ' +
      'Логика — в server/utils/publicResolve.ts при разрешении версии. ' +
      'Доступно на всех тарифах.',
    byPlan: { start: true, business: true, pro: true }
  },

  // --- Брендинг и интеграции ---
  {
    code: 'brand-colors-font',
    name: 'Фирменный цвет и шрифт публичной страницы',
    status: 'preview',
    description:
      'Брендирование публичной страницы: фирменный primary-цвет и шрифт. ' +
      'Поля уже есть в схеме: Tenant.brandingPrimaryColor, brandingFontFamily. ' +
      'Применять как CSS-переменные override в pages/[tenantSlug]/[instructionSlug].vue (поверх токенов из assets/css/tokens.css). ' +
      'Доступ — Бизнес/Про; на Старте — стандартная палитра quar.io.',
    byPlan: { start: null, business: true, pro: true }
  },
  {
    code: 'custom-domain',
    name: 'Свой домен для публичных инструкций',
    status: 'draft',
    description:
      'Подключение собственного домена тенанта (например, instructions.brand.com) к публичным инструкциям. ' +
      'Поле Tenant.customDomain уже есть; нужны DNS-проверка через TXT-запись, SSL (Caddy on-demand TLS или Cloudflare for SaaS) и middleware-резолвер в server/middleware/, который определяет тенант по Host. ' +
      'UI настройки и статуса верификации — в pages/dashboard/settings.vue. ' +
      'Доступ — только Про.',
    byPlan: { start: null, business: null, pro: true }
  },
  {
    code: 'embed-widget',
    name: 'Embed-виджет инструкции (iframe)',
    status: 'draft',
    description:
      'Режим встраивания инструкции в чужой сайт через iframe. ' +
      'Отдельный route /embed/[tenantSlug]/[instructionSlug] без шапки/футера/cookie-баннеров — минималистичный лейаут. ' +
      'Whitelist разрешённых origin-ов через Tenant.embedAllowedOrigins (уже есть в схеме), заголовки Content-Security-Policy: frame-ancestors и X-Frame-Options. ' +
      'Доступ — только Про.',
    byPlan: { start: null, business: null, pro: true }
  },
  {
    code: 'multilingual',
    name: 'Мультиязычные версии инструкции',
    status: 'draft',
    description:
      'Несколько языковых вариантов одной инструкции. ' +
      'В схеме уже есть Instruction.language и Instruction.productGroupId (группа объединяет языковые варианты одного товара). ' +
      'Нужно: UI связывания вариантов в pages/dashboard/instructions/[id]/edit.vue, переключатель языка на публичной странице, копирование структуры при создании нового варианта. ' +
      'Доступ — Бизнес/Про.',
    byPlan: { start: null, business: true, pro: true }
  },
  {
    code: 'lang-autodetect',
    name: 'Авто-выбор языка по браузеру',
    status: 'draft',
    description:
      'Middleware на публичной странице читает заголовок Accept-Language посетителя и ищет вариант инструкции на нужном языке в productGroup. ' +
      'Если есть — 302-редирект на /<tenantSlug>/<instructionSlug-lang>; если нет — fallback на дефолтный язык. ' +
      'Учитывать ручной выбор языка (cookie, query) и не делать редирект, если посетитель уже переключился. ' +
      'Доступ — Бизнес/Про, идёт вместе с мультиязычностью.',
    byPlan: { start: null, business: true, pro: true }
  },

  // --- Команда, API и операции ---
  {
    code: 'team-roles',
    name: 'Команда: роли и приглашения по email',
    status: 'preview',
    description:
      'Несколько пользователей внутри одного тенанта с ролями OWNER / EDITOR / VIEWER. ' +
      'Модели Membership + Role уже есть в Prisma. ' +
      'Нужны: страница pages/dashboard/team.vue (сейчас заглушка), эндпоинт приглашений по email с токеном-ссылкой, email-шаблон, проверка прав в API через server/utils/auth.ts. ' +
      'Доступ — Бизнес/Про.',
    byPlan: { start: null, business: true, pro: true }
  },
  {
    code: 'public-api',
    name: 'Публичный API и webhooks',
    status: 'preview',
    description:
      'Публичный REST API для интеграций и исходящие webhooks на события (instruction.published, feedback.received, warranty.registered). ' +
      'Модель ApiKey уже есть (keyHash + prefix + scopes + expiresAt). ' +
      'Нужны: OpenAPI-спека, страница управления ключами в дашборде, webhook-delivery с retry через BullMQ. ' +
      'Доступ — только Про.',
    byPlan: { start: null, business: null, pro: true }
  },
  {
    code: 'version-email-notify',
    name: 'Email-уведомления при обновлении инструкции',
    status: 'draft',
    description:
      'Email-рассылка пользователям, зарегистрированным через модуль гарантии, при публикации новой InstructionVersion. ' +
      'Триггер — событие publish, рассылка через очередь BullMQ + провайдер (Resend/SES). ' +
      'Email содержит описание изменений (опционально — diff блоков) и ссылку на актуальную версию. ' +
      'Доступ — Бизнес/Про.',
    byPlan: { start: null, business: true, pro: true }
  },
  {
    code: 'legal-docs',
    name: 'Юридические документы: политика, согласия, DPA',
    status: 'ready',
    description:
      'Юридические документы тенанта с версионностью: политика конфиденциальности, согласие на обработку ПДн, пользовательское соглашение, cookie, DPA, ToS. ' +
      'Модели — TenantLegalProfile + LegalDocumentVersion (6 типов, immutable версии). ' +
      'Документы подставляются в модули (warranty, feedback) для корректного отображения согласий и embedding-копии текста в каждой submission. ' +
      'Доступно на всех тарифах как базовая compliance-инфраструктура.',
    byPlan: { start: true, business: true, pro: true }
  }
]
