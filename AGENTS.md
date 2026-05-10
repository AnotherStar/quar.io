# AGENTS.md — инструкции для ИИ-агентов в репозитории quar.io

Этот файл — единая точка входа для любого ИИ-ассистента, работающего с quar.io: Codex, Claude Code, Cursor, Aider и т.п.
Симлинки `CLAUDE.md` и `.cursorrules` указывают сюда, чтобы правила были одни на всех.

---

## 1. Что такое quar.io

quar.io — Nuxt 3 fullstack SaaS для размещения, редактирования и аналитики интерактивных инструкций к товарам. Покупатель сканирует QR на упаковке и попадает на публичную инструкцию, а продавец управляет инструкциями, секциями, модулями, публикациями и аналитикой из дашборда.

Ключевые свойства продукта:

- multi-tenant: пользователь работает внутри своей компании (`Tenant`)
- notion-like редактор на TipTap
- immutable versions: публикация создаёт снапшот `InstructionVersion`
- approval workflow: `DRAFT` → `IN_REVIEW` → `PUBLISHED`
- reusable sections: общие блоки, подключаемые к инструкциям
- pluggable instruction modules: `instruction-modules/*`
- публичные URL: `/<tenantSlug>/<instructionSlug>` и `/s/<shortId>`
- аналитика, block-level feedback и поиск по инструкции
- тарифная деградация на рендере: данные сохраняются, но платные возможности скрываются через `server/utils/plan.ts`

Стек:

- Nuxt 3 + Nitro API routes
- Vue 3 + Tailwind + CSS tokens
- Prisma + PostgreSQL
- TipTap
- S3-compatible storage: MinIO locally, S3-compatible provider in production
- Zod for request validation and shared contracts

---

## 2. Структура проекта

- `pages/` — Nuxt pages: landing, auth, dashboard, public instruction pages, short links
- `components/ui/` — базовые UI-примитивы
- `components/editor/` — TipTap editor, toolbar, slash menu, editor extensions
- `components/public/` — публичный рендер инструкции, аналитика, feedback, поиск
- `composables/` — клиентские/Nuxt composables
- `layouts/` — Nuxt layouts
- `middleware/` — Nuxt route middleware
- `plugins/` — Nuxt plugins
- `server/api/` — Nitro endpoints
- `server/utils/` — auth, tenancy, plan gating, storage, slug, Prisma, AI helpers
- `server/routes/` — custom Nitro routes
- `server/middleware/` — Nitro middleware
- `shared/` — общие типы и Zod-схемы для клиента и сервера
- `modules-sdk/` — контракт и registry подключаемых модулей
- `instruction-modules/` — runtime-модули инструкций (`warranty-registration`, `chat-consultant`, `faq`, `feedback`)
- `prisma/` — schema и seed
- `assets/css/` — design tokens и global CSS
- `wiki-gen/` — AI-генератор wiki-документации
- `wiki/` — генерируемая Markdown wiki, если она уже создана

Важно: папка называется `instruction-modules/`, а не `modules/`, потому что `modules` зарезервировано Nuxt.

---

## 3. Правила кода

- Основной язык — TypeScript.
- В Nuxt/Vue-коде следуй существующему стилю проекта: Composition API, `<script setup lang="ts">`, одиночные кавычки, без лишних точек с запятой.
- Для серверных endpoint'ов валидируй входные данные через Zod (`readValidatedBody`, shared schemas) или явно сужай `unknown`.
- Не импортируй серверный код во frontend. Общие типы, схемы и контракты держи в `shared/` или `modules-sdk/`.
- Prisma — единый слой доступа к БД через `server/utils/prisma.ts`.
- Не ломай tenant isolation: любые операции с инструкциями, секциями, модулями, медиа и аналитикой должны проверять принадлежность к текущему tenant.
- Не меняй immutable published versions задним числом. Draft можно редактировать, published snapshot должен оставаться историческим снимком.
- Не удаляй данные секций/модулей при тарифной деградации. Ограничения тарифа применяются на рендере/доступе.
- Новые публичные endpoints должны быть осторожны с rate limiting, analytics spam и раскрытием чужих tenant-данных.
- Для TipTap document JSON допускается более мягкая типизация только там, где это уже принято в проекте; в остальном избегай `any`.

---

## 4. Где искать контекст

Когда нужен контекст, читай в таком порядке:

1. `README.md` — обзор продукта, структура, локальный запуск, архитектурные решения.
2. `AGENTS.md` — эти инструкции для агента.
3. `wiki/README.md` и релевантные страницы в `wiki/`, если wiki уже сгенерирована.
4. Код — финальный источник истины. Если wiki/README расходятся с кодом, прав код.
5. `TODO.md` — backlog и архитектурные обещания для будущих фич.
6. `DESIGN-notion.md` — дизайн-система. Обязательно читать перед задачами, которые затрагивают UI, вёрстку, цвета, типографику, отступы, страницы или компоненты.
7. `prisma/schema.prisma` — модель данных, статусы, связи, ограничения.

---

## 5. Дизайн и frontend

Перед любыми изменениями UI прочитай `DESIGN-notion.md`.

Соблюдай местные паттерны:

- design tokens лежат в `assets/css/tokens.css` и подключены через Tailwind config
- базовые компоненты находятся в `components/ui/`
- lucide icons подключены через `@nuxt/icon`; используй `<Icon name="lucide:...">`
- dashboard-интерфейсы должны быть плотными, рабочими и сканируемыми
- публичные инструкции должны быть чистыми, понятными и устойчивыми на мобильных экранах
- не вводи новую палитру, если можно выразить состояние существующими токенами
- проверяй, что текст не переполняет кнопки, карточки и панели на мобильных ширинах

---

## 6. Подключаемые модули инструкций

Модуль инструкции состоит из папки `instruction-modules/<code>/` и обычно содержит:

- `index.ts` — manifest и definition модуля
- `Public.vue` — публичный renderer
- `EditorConfig.vue` — конфигурация в дашборде, если нужна

Чтобы добавить модуль:

1. Создай папку в `instruction-modules/<code>/`.
2. Реализуй `ModuleDefinition` из `modules-sdk/types.ts`.
3. Зарегистрируй модуль в `modules-sdk/registry.ts`.
4. Добавь seed-данные в `prisma/seed.ts`, если модуль должен появляться в каталоге.
5. Проверь публичный рендер и dashboard-настройки.

Не добавляй module-specific логику в ядро, если её можно выразить через контракт модуля.

---

## 7. Wiki generator

Wiki генерируется через `wiki-gen/`.

Команды из корня:

```bash
pnpm wiki:dry-run
pnpm wiki:generate
pnpm wiki:generate -- --section server
pnpm wiki:generate -- --module api-instructions
pnpm wiki:update -- api-instructions server
```

Разделы:

- `server` — `server/api`, `server/utils`, `server/middleware`, `server/routes`
- `client` — `pages`, `components`, `composables`, `layouts`, `middleware`, `plugins`, `assets/css`, `app.vue`
- `shared` — `shared/*`, `modules-sdk`
- `modules` — `instruction-modules/*`
- `data` — `prisma`

Правила:

- Не редактируй сгенерированные wiki-страницы руками без необходимости.
- После значимого изменения модуля обнови его страницу через `pnpm wiki:update -- <module> <section>`.
- Перед массовой генерацией сначала запускай `pnpm wiki:dry-run`.
- Ключи `OPENAI_API_KEY` или `ANTHROPIC_API_KEY` читаются из корневого `.env` или `wiki-gen/.env`.

---

## 8. Команды разработки

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm db:push
pnpm db:seed
pnpm dev
```

Проверки:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

База данных:

```bash
pnpm db:push
pnpm db:migrate
pnpm db:seed
pnpm db:studio
```

Дев-сервер работает на `http://localhost:4200`.
MinIO admin локально: `http://localhost:9001`.

---

## 9. Типичные задачи

### Добавить backend endpoint

1. Найди соседние endpoints в `server/api/<domain>/`.
2. Проверь auth/tenant helpers в `server/utils/`.
3. Добавь или переиспользуй Zod-схему в `shared/schemas/`.
4. Проверь tenant isolation и ошибки доступа.
5. Запусти `pnpm typecheck` и релевантную ручную проверку.

### Добавить dashboard-фичу

1. Прочитай `DESIGN-notion.md`.
2. Найди соседнюю страницу в `pages/dashboard/`.
3. Переиспользуй `components/ui/` и существующие composables.
4. Не дублируй API-клиентскую логику, если есть `useApi` или профильный composable.
5. Проверь mobile и пустые/ошибочные состояния.

### Изменить публичный рендер инструкции

1. Начни с `pages/[tenantSlug]/[instructionSlug].vue`.
2. Проверь `components/public/*` и `server/utils/publicResolve.ts`.
3. Учитывай тарифную деградацию, версии, analytics beacon, block ids и feedback.
4. Не ломай короткие ссылки `/s/<shortId>`.

### Добавить новый instruction module

1. Работай через `instruction-modules/` и `modules-sdk/`.
2. Проверь seed и registry.
3. Убедись, что модуль корректно скрывается/показывается по тарифам.
4. Обнови wiki: `pnpm wiki:update -- <code> modules`.

---

## 10. Симлинки для ассистентов

Единый файл правил — `AGENTS.md`.

```bash
ln -s AGENTS.md CLAUDE.md
ln -s AGENTS.md .cursorrules
```

Если другой инструмент требует свой файл правил, добавь новый симлинк на `AGENTS.md`, а не копию.
