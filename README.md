# ManualOnline

SaaS для размещения и редактирования инструкций к товарам. Покупатель сканирует QR на упаковке → попадает на красивую инструкцию, которую продавец редактирует в notion-like редакторе.

**Стек:** Nuxt 3 (fullstack, без NestJS) + Prisma + PostgreSQL + TipTap + S3 (MinIO локально).

## Что внутри

### MVP включает
- ✅ **Регистрация и multi-tenant** — у пользователя своя компания (tenant), можно подключать соавторов (схема готова)
- ✅ **Notion-like редактор (TipTap)** — заголовки, списки, картинки, видео, чек-листы, **спец-блок безопасности** (3 уровня: info / warning / danger), slash-команды (`/`)
- ✅ **Загрузка медиа** — изображения и видео через MinIO (S3-совместимое)
- ✅ **Иммутабельное версионирование** — каждая публикация = отдельный snapshot
- ✅ **Approval workflow** — draft → review → published; редакторы запрашивают, владелец одобряет
- ✅ **Кастомные URL** — `/<tenantSlug>/<instructionSlug>` (atvel/f-16) + короткие `/s/<shortId>`
- ✅ **Переиспользуемые секции** — `Спасибо за покупку`, `Бонус за отзыв` и т.д., добавляются в любую инструкцию
- ✅ **Подключаемые модули** — `warranty-registration` и `chat-consultant` (каждый — папка в `modules/`, манифест + Vue-компонент); добавление модуля не требует изменения ядра
- ✅ **Тарифы и деградация** — все секции/модули остаются в БД даже после неоплаты; рендер просто их пропускает (см. `server/utils/plan.ts`). Ссылки на инструкции живут вечно.
- ✅ **Аналитика** — page views, уникальные сессии, гео (Cloudflare-ready), устройство, скролл-глубина, время на странице, view + dwell на блоках
- ✅ **Block-level feedback** — наведи на любой блок → 👍 Полезно / 😕 Непонятно / ⚠️ Ошибка / 💬 Комментарий
- ✅ **Поиск внутри инструкции** — клиентский (⌘K), индексирует блоки, скроллит и подсвечивает
- ✅ **Дашборд** — обзор, инструкции, секции, модули, аналитика, биллинг, команда, настройки
- ✅ **Дизайн по DESIGN-notion.md** — токены через CSS-vars, Tailwind конфиг, готов под per-tenant брендинг

### Backlog
См. [TODO.md](./TODO.md). Архитектура подготовлена для всех фич: i18n, кастомные домены, AI-ассистент, бренд, embed, API, webhooks, A/B тесты, тепловые карты, AR и т.д.

## Запуск

```bash
# 1. Зависимости
pnpm install

# 2. Локальная инфраструктура (PostgreSQL + MinIO)
docker compose up -d

# 3. Окружение
cp .env.example .env

# 4. Миграция БД + seed (тарифы + манифесты модулей)
pnpm db:push
pnpm db:seed

# 5. Дев-сервер
pnpm dev
```

Откроется на http://localhost:4200.

MinIO admin: http://localhost:9001 (`manualonline` / `manualonline-secret`). Бакет `manualonline-media` создаётся автоматически.

## Первый сценарий

1. Откройте http://localhost:4200 → «Начать бесплатно»
2. Зарегистрируйтесь, придумайте slug компании (например `atvel`)
3. В дашборде → «Инструкции» → «+ Новая» (slug, например `f-16`)
4. В редакторе нажмите `/` для меню блоков — попробуйте Заголовок, Список, **Блок: Внимание**
5. «Опубликовать» → откройте `http://localhost:4200/atvel/f-16`
6. Наведите на любой блок → виджет обратной связи; нажмите ⌘K → поиск
7. Вернитесь в дашборд → инструкция → «Аналитика» — увидите свой просмотр

## Структура проекта

```
.
├── prisma/                  # schema.prisma + seed
├── server/
│   ├── api/                 # Nitro endpoints
│   │   ├── auth/            # register, login, logout, me
│   │   ├── instructions/    # CRUD + publish + review + analytics + feedback
│   │   ├── sections/        # reusable sections CRUD
│   │   ├── modules/         # tenant module configs + warranty submission
│   │   ├── media/           # S3 upload
│   │   └── public/          # public render data + analytics ingest + feedback ingest
│   └── utils/               # prisma, auth, tenant resolution, plan gating, slug, storage
├── shared/                  # shared types + zod schemas (server + client)
├── modules-sdk/             # contract for pluggable modules
├── instruction-modules/     # actual modules (warranty-registration, chat-consultant)
│                            #   — name avoids Nuxt's reserved `modules/`
├── components/
│   ├── ui/                  # design system primitives
│   ├── editor/              # TipTap editor + extensions (BlockId, SafetyBlock) + slash menu
│   └── public/              # public-page renderers, analytics, feedback, search
├── pages/
│   ├── index.vue            # marketing landing
│   ├── pricing.vue
│   ├── auth/                # login / register
│   ├── dashboard/           # instructions / sections / modules / analytics / billing / team / settings
│   ├── [tenantSlug]/        # public instruction page
│   └── s/[shortId].vue      # short-id redirect
├── layouts/                 # default / dashboard / blank / public
├── composables/             # useAuthState, useApi, useViewerSession
├── middleware/              # auth, guest
├── assets/css/              # tokens.css (DESIGN-notion.md → CSS-vars), global.css
├── tailwind.config.ts       # token-driven Tailwind
├── nuxt.config.ts
└── docker-compose.yml       # postgres + minio
```

## Архитектурные решения

**Почему без NestJS** — Nuxt 3 + Nitro даёт API-роуты, middleware, SSR публичных страниц без отдельного бэкенда. Один процесс, один деплой, общие типы между клиентом и сервером.

**Почему immutable versions** — продали товар, потом обновили инструкцию → должен быть способ показать ровно ту версию, которая была активна в момент покупки. Каждый publish создаёт `InstructionVersion` со снапшотом.

**Почему модули как отдельные папки** — добавление нового модуля = новая папка в `instruction-modules/<code>/` + одна строка в `modules-sdk/registry.ts` + запись в `prisma/seed.ts`. Никакого затрагивания ядра.

**Почему деградация на рендере** — подписка истекла → данные секций и модулей **сохраняются** в БД, просто `effectiveFeatures()` возвращает Free фичи и публичный рендер их пропускает. Когда оплатят снова — сразу появляются.

**Block ids в редакторе** — TipTap-расширение `BlockId` присваивает каждому top-level блоку стабильный `id` (через `data-block-id`). Это нужно для аналитики (BLOCK_VIEW), feedback-виджета и поиска. Идентификаторы переживают версии.

**Аналитика батчами** — клиент собирает события в очередь, отправляет пачкой каждые 10 событий или на `visibilitychange` через `sendBeacon`. Не нагружает основной рендер.

## Команды

```bash
pnpm dev               # дев-сервер
pnpm build             # production build
pnpm db:push           # применить schema → db (без миграций — для прототипирования)
pnpm db:migrate        # создать миграцию
pnpm db:seed           # засеять тарифы + модули
pnpm db:studio         # Prisma Studio
pnpm wiki:dry-run      # проверить список wiki-модулей без генерации
pnpm wiki:generate     # сгенерировать wiki в ./wiki через AI-провайдера
pnpm wiki:update -- api-instructions server
pnpm typecheck
pnpm lint
```

## Что добавить дальше

См. `TODO.md`. Самые ценные следующие шаги:
1. **Биллинг** (Stripe / ЮKassa) — сейчас все на free
2. **Кастомный домен** + автоматический SSL
3. **AI-ассистент** на инструкции (RAG по блокам)
4. **PDF-экспорт** инструкции
5. **Multi-user UI** (приглашения в команду)
