# page-dashboard

## Назначение

Модуль `page-dashboard` содержит страницы приватного кабинета продавца ManualOnline, расположенные в `pages/dashboard`. Он отвечает за управление инструкциями, публикацию, аналитику, переиспользуемые секции, подключаемые модули, биллинг, настройки аккаунта и служебные разделы дашборда.

Все страницы используют layout `dashboard` и middleware `auth`, то есть доступны только авторизованным пользователям.

## Ключевые возможности

- Главная страница дашборда с краткой статистикой по инструкциям.
- Управление инструкциями:
  - список активных и архивных инструкций;
  - поиск по названию и slug;
  - создание новой инструкции;
  - переход к публичному предпросмотру;
  - архивирование и восстановление;
  - переход к аналитике.
- Редактор инструкции:
  - редактирование заголовка, описания, slug и draft-контента;
  - автосохранение с debounce;
  - публикация инструкции;
  - восстановление из архива;
  - генерация контента из PDF/изображений через AI streaming;
  - popover для публичной ссылки, QR/copy UI и публикации.
- Страница аналитики инструкции за последние 30 дней:
  - просмотры;
  - уникальные сессии;
  - средний scroll depth;
  - среднее время;
  - разбивка по странам и устройствам;
  - отзывы по блокам.
- Управление переиспользуемыми секциями:
  - список секций;
  - создание и редактирование секции;
  - автосохранение;
  - удаление;
  - ограничение доступа по тарифу.
- Управление подключаемыми модулями:
  - включение/выключение модулей;
  - отображение доступности по тарифу;
  - страницы для `warranty-registration` и `feedback`.
- Настройка модуля обратной связи:
  - tenant-wide конфигурация формы;
  - список заявок;
  - экспорт заявок в CSV.
- Просмотр регистраций гарантии и экспорт в CSV.
- Страница биллинга с активацией trial-доступа.
- Базовые страницы настроек, команды и заглушка для сканирования QR.

## Архитектура

### Структура файлов

Модуль представлен 13 Vue-страницами Nuxt:

```text
pages/dashboard/
├── billing.vue
├── index.vue
├── settings.vue
├── team.vue
├── scan-qr.vue
├── instructions/
│   ├── index.vue
│   └── [id]/
│       ├── edit.vue
│       └── analytics.vue
├── modules/
│   ├── index.vue
│   ├── feedback.vue
│   └── warranty.vue
└── sections/
    ├── index.vue
    └── [id].vue
```

Каждая страница объявляет:

```ts
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
```

Это связывает страницы с приватным dashboard layout и авторизационным middleware.

### Основные страницы

#### `pages/dashboard/index.vue`

Главная страница кабинета. Загружает список инструкций через:

```ts
useAsyncData('dashboard-overview', () => api<{ instructions: any[] }>('/api/instructions'))
```

На основе списка вычисляет агрегаты:

- всего инструкций;
- опубликовано;
- черновики;
- на ревью.

Также показывает последние 5 инструкций и ссылку на полный список.

#### `pages/dashboard/instructions/index.vue`

Страница списка инструкций. Использует `/api/instructions` и локальные computed-состояния для:

- разделения активных и архивных инструкций;
- поиска по `title` и `slug`;
- подсчёта количества активных и архивных записей;
- создания новой инструкции;
- архивирования и восстановления;
- открытия row actions через kebab menu.

Создание новой инструкции выполняется через `POST /api/instructions` с временным slug вида:

```ts
${Math.random().toString(36).slice(2, 8)}
```

После создания выполняется переход на страницу редактирования:

```ts
/dashboard/instructions/{instruction.id}/edit
```

#### `pages/dashboard/instructions/[id]/edit.vue`

Основная страница редактирования инструкции.

Загружает инструкцию:

```ts
useAsyncData(`instruction-${id}`, () =>
  api<{ instruction: any }>(`/api/instructions/${id}`)
)
```

Если инструкция не найдена, выбрасывается fatal 404:

```ts
throw createError({
  statusCode: 404,
  statusMessage: 'Инструкция не найдена',
  fatal: true
})
```

Важная деталь реализации: страница сохраняет `initial` snapshot первой загрузки, чтобы переживать временные состояния `data.value = null` во время HMR, refetch или медленной навигации.

Редактируются поля:

- `title`;
- `slug`;
- `description`;
- `draftContent`.

Для контента используется компонент `InstructionEditor`, обёрнутый в `ClientOnly`.

Также страница интегрирована с AI streaming-генерацией через:

```ts
import { streamInstructionFromFile } from '~/composables/useInstructionStreaming'
```

и тип блоков:

```ts
import type { AiBlock } from '~~/server/utils/aiInstructionGenerator'
```

#### `pages/dashboard/instructions/[id]/analytics.vue`

Страница аналитики конкретной инструкции.

Параллельно загружает:

```ts
/api/instructions/{id}/analytics
/api/instructions/{id}/feedback
```

Отображает агрегаты аналитики, группировки и список feedback-событий по блокам.

#### `pages/dashboard/sections/index.vue`

Страница списка переиспользуемых секций.

Загружает:

```ts
/api/sections
```

Проверяет тариф через `currentTenant.plan`:

```ts
const isPaid = computed(() =>
  currentTenant.value?.plan && currentTenant.value.plan !== 'free'
)
```

На бесплатном тарифе кнопка создания секции disabled, а пользователю показывается предупреждение со ссылкой на `/dashboard/billing`.

#### `pages/dashboard/sections/[id].vue`

Страница создания и редактирования секции.

Поддерживает два режима:

- `/dashboard/sections/new` — новая секция в памяти;
- `/dashboard/sections/{id}` — существующая секция из API.

Для новой секции первый autosave выполняет `POST /api/sections`, после чего URL заменяется на реальный id без полной навигации:

```ts
window.history.replaceState({}, '', `/dashboard/sections/${section.id}`)
```

Дальнейшие сохранения выполняются через `PATCH /api/sections/{id}`.

Для редактирования контента используется `InstructionEditor` с флагом:

```vue
disable-section-refs
```

Это предотвращает вложенные ссылки на секции внутри секций.

#### `pages/dashboard/modules/index.vue`

Страница списка подключаемых модулей. Загружает:

```ts
/api/modules
```

Позволяет включать и выключать модули через:

```ts
PUT /api/modules/{code}
```

Для некоторых модулей отображаются дополнительные действия:

- `warranty-registration` → `/dashboard/modules/warranty`;
- `feedback` → `/dashboard/modules/feedback`.

#### `pages/dashboard/modules/feedback.vue`

Страница tenant-wide настройки модуля обратной связи и просмотра входящих сообщений.

Загружает:

```ts
/api/modules
/api/modules/feedback/submissions
```

Конфигурация хранится локально в reactive-форме и сохраняется через:

```ts
PUT /api/modules/feedback
```

Форма конфигурации включает:

- `title`;
- `description`;
- `recipientEmail`;
- обязательность ФИО;
- обязательность телефона;
- обязательность email;
- обязательность Telegram;
- обязательность сообщения;
- `successMessage`.

Также реализован экспорт сообщений в CSV на стороне клиента.

#### `pages/dashboard/modules/warranty.vue`

Страница регистраций гарантии. Загружает:

```ts
/api/modules/warranty/registrations
```

Отображает таблицу заявок и позволяет скачать CSV.

#### `pages/dashboard/billing.vue`

Страница тарифа и оплаты. Загружает состояние биллинга:

```ts
/api/billing/state
```

Позволяет активировать trial через:

```ts
POST /api/billing/trial
```

После активации обновляет данные биллинга и auth state:

```ts
await Promise.all([refresh(), refreshAuth()])
```

#### `pages/dashboard/settings.vue`

Простая страница настроек. Показывает данные пользователя и текущего tenant из `useAuthState()`.

#### `pages/dashboard/team.vue`

Информационная страница команды. Сообщает, что multi-user модель уже есть в схеме через `Membership`, но UI приглашений ещё не реализован.

#### `pages/dashboard/scan-qr.vue`

Заглушка раздела «Пикнуть QR». Функциональность сканирования QR пока не реализована.

### Используемые компоненты

Модуль активно использует UI-kit проекта:

- `UiCard`;
- `UiButton`;
- `UiBadge`;
- `UiAlert`;
- `UiInput`;
- `UiCopyableUrl`;
- `InstructionEditor`;
- `InstructionContent`;
- `Icon`;
- `NuxtLink`;
- `ClientOnly`.

`InstructionEditor` используется в двух местах:

1. Редактор инструкции.
2. Редактор переиспользуемой секции.

`InstructionContent` используется для read-only предпросмотра содержимого секций в списке.

### Composables

Используются внутренние composables:

- `useApi()` — клиент для обращения к Nitro API;
- `useAuthState()` — состояние пользователя, tenant и роли;
- `useAsyncData()` — SSR/CSR загрузка данных Nuxt;
- `useRoute()` — доступ к параметрам маршрута;
- `useRuntimeConfig()` — получение публичного `appUrl`;
- `onClickOutside()` из VueUse — закрытие popover в редакторе инструкции.

Отдельно в редакторе используется:

```ts
streamInstructionFromFile()
```

из `~/composables/useInstructionStreaming`.

### Взаимодействие страниц и API

Общий поток выглядит так:

1. Страница загружает данные через `useAsyncData`.
2. Запросы выполняются через `useApi`.
3. UI отображает данные и локальные computed-состояния.
4. Мутации выполняются через `POST`, `PATCH`, `PUT` или `DELETE`.
5. После мутации страница вызывает `refresh()` или выполняет `navigateTo()`.

Пример:

```ts
await api(`/api/instructions/${id}/archive`, { method: 'POST' })
await refresh()
```

## API / Интерфейс

### Nuxt pages

Это page-модуль, а не библиотека компонентов. Страницы не принимают props напрямую и не экспортируют публичные Vue events/slots. Их интерфейс определяется:

- URL-маршрутами Nuxt;
- route params;
- API-запросами;
- используемыми layout/middleware;
- дочерними компонентами.

### Маршруты страниц

| Файл | URL | Назначение |
|---|---|---|
| `pages/dashboard/index.vue` | `/dashboard` | Главная страница кабинета |
| `pages/dashboard/billing.vue` | `/dashboard/billing` | Тариф, trial и будущий биллинг |
| `pages/dashboard/settings.vue` | `/dashboard/settings` | Профиль и компания |
| `pages/dashboard/team.vue` | `/dashboard/team` | Информация о будущей multi-user функциональности |
| `pages/dashboard/scan-qr.vue` | `/dashboard/scan-qr` | Заглушка сканирования QR |
| `pages/dashboard/instructions/index.vue` | `/dashboard/instructions` | Список инструкций |
| `pages/dashboard/instructions/[id]/edit.vue` | `/dashboard/instructions/:id/edit` | Редактор инструкции |
| `pages/dashboard/instructions/[id]/analytics.vue` | `/dashboard/instructions/:id/analytics` | Аналитика инструкции |
| `pages/dashboard/sections/index.vue` | `/dashboard/sections` | Список переиспользуемых секций |
| `pages/dashboard/sections/[id].vue` | `/dashboard/sections/:id` | Создание/редактирование секции |
| `pages/dashboard/modules/index.vue` | `/dashboard/modules` | Список модулей |
| `pages/dashboard/modules/feedback.vue` | `/dashboard/modules/feedback` | Настройка feedback-модуля и заявки |
| `pages/dashboard/modules/warranty.vue` | `/dashboard/modules/warranty` | Регистрации гарантии |

### Параметры маршрутов

#### `/dashboard/instructions/:id/edit`

- `id: string` — идентификатор инструкции.

Используется для API-запросов:

```ts
/api/instructions/{id}
/api/instructions/{id}/publish
/api/instructions/{id}/unarchive
/api/instructions/{id}/generate-stream
```

#### `/dashboard/instructions/:id/analytics`

- `id: string` — идентификатор инструкции.

Используется для:

```ts
/api/instructions/{id}/analytics
/api/instructions/{id}/feedback
```

#### `/dashboard/sections/:id`

- `id: string | 'new'`.

Если `id === 'new'`, страница работает в режиме создания без начального fetch существующей секции.

### Используемые API endpoints

Ниже перечислены endpoints, которые явно вызываются из кода страниц.

#### Инструкции

| Метод | Endpoint | Где используется | Назначение |
|---|---|---|---|
| `GET` | `/api/instructions` | dashboard index, instructions index | Получение списка инструкций |
| `POST` | `/api/instructions` | instructions index | Создание инструкции |
| `GET` | `/api/instructions/{id}` | edit page | Получение инструкции |
| `PATCH` | `/api/instructions/{id}` | edit page | Автосохранение title/description/draftContent/slug |
| `POST` | `/api/instructions/{id}/publish` | edit page | Публикация инструкции |
| `POST` | `/api/instructions/{id}/archive` | instructions index | Архивирование инструкции |
| `POST` | `/api/instructions/{id}/unarchive` | instructions index, edit page | Восстановление инструкции |
| `GET` | `/api/instructions/{id}/analytics` | analytics page | Получение агрегированной аналитики |
| `GET` | `/api/instructions/{id}/feedback` | analytics page | Получение отзывов по блокам |
| `POST` | `/api/instructions/{id}/generate-stream` | edit page через `streamInstructionFromFile` | AI-генерация инструкции из файла |

#### Секции

| Метод | Endpoint | Где используется | Назначение |
|---|---|---|---|
| `GET` | `/api/sections` | sections index | Список секций |
| `GET` | `/api/sections/{id}` | section edit | Получение секции |
| `POST` | `/api/sections` | section edit в режиме `/new` | Создание секции |
| `PATCH` | `/api/sections/{id}` | section edit | Автосохранение секции |
| `DELETE` | `/api/sections/{id}` | section edit | Удаление секции |

#### Модули

| Метод | Endpoint | Где используется | Назначение |
|---|---|---|---|
| `GET` | `/api/modules` | modules index, feedback page | Список модулей и tenant config |
| `PUT` | `/api/modules/{code}` | modules index | Включение/выключение модуля |
| `PUT` | `/api/modules/feedback` | feedback page | Сохранение настроек feedback-модуля |
| `GET` | `/api/modules/feedback/submissions` | feedback page | Получение сообщений feedback |
| `GET` | `/api/modules/warranty/registrations` | warranty page | Получение регистраций гарантии |

#### Биллинг

| Метод | Endpoint | Где используется | Назначение |
|---|---|---|---|
| `GET` | `/api/billing/state` | billing page | Получение состояния тарифа/trial |
| `POST` | `/api/billing/trial` | billing page | Активация trial |

### Интерфейс внутренних компонентов

Компоненты не определены в данном модуле, но по использованию видны их контракты.

#### `InstructionEditor`

Используется как controlled component через `v-model`.

```vue
<InstructionEditor
  v-model="draft"
  placeholder="Введите «/» для команд или «Заполнить из файла»..."
  @ready="onEditorReady"
/>
```

Наблюдаемые props/events:

| Интерфейс | Назначение |
|---|---|
| `v-model` | JSON-документ TipTap |
| `placeholder` | Placeholder редактора |
| `disable-section-refs` | Отключение вставки ссылок на секции |
| `ready` event | Возвращает экземпляр редактора TipTap |

#### `InstructionContent`

Используется для read-only отображения TipTap-документа:

```vue
<InstructionContent :content="s.content" />
```

Наблюдаемые props:

| Prop | Назначение |
|---|---|
| `content` | JSON-контент инструкции или секции |

#### `UiCopyableUrl`

Используется в popover «Поделиться»:

```vue
<UiCopyableUrl
  :url="fullPublicUrl"
  :qr-filename="`${currentTenant?.slug}-${slug}`"
/>
```

Наблюдаемые props:

| Prop | Назначение |
|---|---|
| `url` | Полная публичная ссылка |
| `qr-filename` | Имя файла для QR/download |

## Бизнес-логика

### Авторизация

Все страницы дашборда защищены middleware `auth`:

```ts
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
```

Это означает, что модуль рассчитан на работу только внутри авторизованного кабинета.

### Статусы инструкций

В коде используются следующие статусы инструкций:

- `PUBLISHED`;
- `DRAFT`;
- `IN_REVIEW`;
- `ARCHIVED`.

На главной странице считаются:

```ts
published: status === 'PUBLISHED'
drafts: status === 'DRAFT'
inReview: status === 'IN_REVIEW'
```

На странице списка инструкции делятся на:

- активные — все, кроме `ARCHIVED`;
- архив — только `ARCHIVED`.

Архивная инструкция:

- скрывается из активного списка;
- может быть восстановлена;
- в редакторе показывает предупреждение;
- не может быть опубликована, так как кнопка публикации disabled при `instr.status === 'ARCHIVED'`.

### Создание инструкции

При создании новой инструкции клиент генерирует временный slug:

```ts
const slug = `${Math.random().toString(36).slice(2, 8)}`
```

Создаваемая инструкция получает:

```ts
{
  title: 'Без названия',
  slug,
  language: 'ru'
}
```

После успешного создания пользователь сразу переходит в редактор.

### Автосохранение инструкции

В редакторе инструкции автосохранение срабатывает при изменении:

- `title`;
- `slug`;
- `description`;
- `draft`.

Используется debounce 800 мс:

```ts
saveTimer = setTimeout(async () => {
  // PATCH
}, 800)
```

Slug отправляется на сервер только если:

1. он изменился относительно `initial.slug`;
2. соответствует регулярному выражению:

```ts
/^[a-z0-9-]+$/
```

3. имеет длину не менее 1 символа.

Это сделано, чтобы не показывать серверные ошибки slug во время набора.

Если серверная ошибка содержит слово `slug`, сообщение записывается в `slugError`.

### Публикация инструкции

Публикация выполняется кнопкой в popover «Поделиться»:

```ts
await api(`/api/instructions/${id}/publish`, { method: 'POST' })
await refresh()
```

Если инструкция уже опубликована, текст кнопки меняется на:

```text
Опубликовать новую версию
```

В UI явно указано, что текущая опубликованная версия остаётся неизменяемой, а новая публикация создаёт ещё одну версию.

### Публичный URL инструкции

Публичный URL строится из slug tenant и slug инструкции:

```ts
const publicUrl = computed(() =>
  `/${currentTenant.value?.slug}/${instr.value.slug}`
)
```

Полная ссылка использует `runtimeConfig.public.appUrl`:

```ts
const fullPublicUrl = computed(() => {
  const cfg = useRuntimeConfig().public
  return `${cfg.appUrl}${publicUrl.value}`
})
```

### AI streaming-генерация из файла

В редакторе есть функция «Заполнить из файла».

Поддерживаемый input:

```html
accept="application/pdf,image/*"
```

Алгоритм:

1. Пользователь выбирает PDF или изображение.
2. Если редактор не пустой, показывается `confirm`.
3. При подтверждении включается `isStreaming`.
4. Автосохранение временно отключается через `suppressAutosave = true`.
5. Редактор очищается.
6. Выполняется streaming-запрос через `streamInstructionFromFile(id, file, callbacks)`.
7. Каждый AI-блок преобразуется в TipTap node функцией `aiBlockToTipTapNode`.
8. Документ пересобирается целиком на каждом новом блоке:

   ```ts
   ed.commands.setContent({ type: 'doc', content: streamedNodes }, false)
   ```

   Это сделано, чтобы избежать бага с вложением новых блоков в предыдущий список при `insertContent`.
9. После завершения вызывается `refresh()`, а `draft` синхронизируется с JSON редактора.
10. Автосохранение снова включается.

Поддерживаемые типы AI-блоков:

- `heading`;
- `paragraph`;
- `bullet_list`;
- `numbered_list`;
- `safety`;
- `image`;
- `image_placeholder`.

### Аналитика

Страница аналитики отображает данные за последние 30 дней. Это следует из заголовка страницы:

```text
Аналитика · последние 30 дней
```

Показываются:

- `pageViews`;
- `uniqueSessions`;
- `avgScrollDepth`;
- `avgDurationMs`;
- `byCountry`;
- `byDevice`;
- `feedbackByKind`;
- список feedback items.

Формат и расчёт данных находятся на стороне API и в данном коде не раскрыты.

### Trial и биллинг

Страница биллинга показывает:

- текущий план;
- статус;
- trial state;
- дату окончания периода;
- количество дней до конца trial.

Trial можно активировать только если он не заблокирован:

```ts
const trialBlocked = computed(() =>
  !!data.value?.trial?.trialUsedAt ||
  (data.value?.plan !== 'free' && data.value?.status === 'active')
)
```

То есть trial недоступен, если:

- он уже был использован;
- tenant уже находится на активном платном тарифе.

В UI указано:

- trial длится 30 дней;
- доступны Plus-функции;
- лимит инструкций остаётся 3, как на Free;
- после окончания trial tenant возвращается на Free;
- кастомные секции и модули остаются в БД, но перестают отображаться на публичных страницах.

Реальный биллинг не подключён:

```text
Реальная оплата (Stripe / ЮKassa) — в TODO. Сейчас доступен только триал.
```

### Ограничения тарифа для секций

Переиспользуемые секции доступны только на платном тарифе:

```ts
const isPaid = computed(() =>
  currentTenant.value?.plan && currentTenant.value.plan !== 'free'
)
```

На Free:

- кнопка «Новая секция» disabled;
- показывается предупреждение;
- есть ссылка на страницу биллинга.

Важно: ограничение в этом файле реализовано на уровне UI. Серверная проверка не видна в предоставленном коде.

### Создание и автосохранение секций

Для `/dashboard/sections/new` не выполняется запрос к API существующей секции. Страница начинает с пустой секции:

```ts
{ name: 'Без названия', description: '', content: EMPTY_DOC }
```

Первое автосохранение создаёт запись через `POST /api/sections`.

Чтобы избежать одновременного создания нескольких секций при конкурентных autosave, используется `createInFlight`:

```ts
if (createInFlight) {
  await createInFlight
  await persist()
  return
}
```

После создания URL меняется на реальный id через History API.

### Удаление секций

Удаление требует подтверждения:

```text
Удалить секцию? Если она вставлена в инструкции, эти места просто перестанут отображаться.
```

Из этого следует поведение: удалённая секция не ломает инструкции, но места вставки перестают отображаться. Подробная серверная реализация в коде страницы не показана.

### Подключаемые модули

Список модулей содержит признаки:

- `version`;
- `requiresPlan`;
- `allowedByPlan`;
- `tenantConfig.enabled`;
- `tenantConfig.config`.

Кнопка включения/выключения disabled, если модуль недоступен на текущем тарифе:

```vue
:disabled="!m.allowedByPlan"
```

Для `feedback` страница настроек доступна при `allowedByPlan`, даже если модуль ещё не включён.

### Feedback module

Настройки feedback-модуля являются tenant-wide:

```ts
// Settings live in TenantModuleConfig.config and apply to every editor block
// of this module across all instructions
```

В коде явно указано, что в редакторе нет per-block config UI намеренно.

Если манифест модуля не найден в `/api/modules`, показывается предупреждение:

```text
Похоже, манифест не загружен в БД. Запустите pnpm prisma db seed.
```

### CSV export

Экспорт CSV реализован полностью на клиенте для:

- feedback submissions;
- warranty registrations.

Общий подход:

1. Собрать header.
2. Преобразовать items в rows.
3. Экранировать кавычки.
4. Создать `Blob`.
5. Создать временный object URL.
6. Программно кликнуть по `<a>`.
7. Отозвать object URL.

Пример экранирования:

```ts
String(c).replace(/"/g, '""')
```

## Зависимости

### Внутренние зависимости ManualOnline

- `useApi()` — API client для Nitro endpoints.
- `useAuthState()` — пользователь, tenant, роль, refresh auth state.
- `InstructionEditor` — TipTap-редактор инструкций и секций.
- `InstructionContent` — рендер контента секций.
- `UiCard`, `UiButton`, `UiBadge`, `UiAlert`, `UiInput`, `UiCopyableUrl` — UI-компоненты дизайн-системы.
- `EMPTY_DOC` из `~~/shared/types/instruction` — пустой TipTap-документ.
- `streamInstructionFromFile` из `~/composables/useInstructionStreaming` — streaming-генерация инструкции из файла.
- `AiBlock` из `~~/server/utils/aiInstructionGenerator` — тип блока AI-генератора.
- Dashboard layout.
- Auth middleware.

### API-модули backend

Страницы зависят от серверных API областей:

- instructions;
- analytics;
- feedback;
- sections;
- modules;
- warranty registrations;
- billing;
- auth state / tenant state.

### Внешние библиотеки и платформенные API

- Nuxt 3 / Vue 3 Composition API.
- VueUse `onClickOutside`.
- Browser APIs:
  - `confirm`;
  - `alert`;
  - `Blob`;
  - `URL.createObjectURL`;
  - `URL.revokeObjectURL`;
  - `document.createElement`;
  - `window.history.replaceState`;
  - native file input.
- TipTap JSON schema через `InstructionEditor`.

## Примеры использования

### Сценарий 1: создать и опубликовать инструкцию

1. Пользователь открывает `/dashboard/instructions`.
2. Нажимает «Новая».
3. Клиент создаёт инструкцию:

   ```ts
   await api('/api/instructions', {
     method: 'POST',
     body: {
       title: 'Без названия',
       slug,
       language: 'ru'
     }
   })
   ```

4. Пользователь попадает на `/dashboard/instructions/{id}/edit`.
5. Редактирует заголовок и контент.
6. Автосохранение отправляет `PATCH /api/instructions/{id}`.
7. Пользователь открывает «Поделиться».
8. Нажимает «Опубликовать».
9. Клиент вызывает:

   ```ts
   await api(`/api/instructions/${id}/publish`, { method: 'POST' })
   ```

10. Публичная ссылка строится как:

   ```ts
   /{tenant.slug}/{instruction.slug}
   ```

### Сценарий 2: создать переиспользуемую секцию

1. Пользователь открывает `/dashboard/sections`.
2. Если тариф не `free`, нажимает «Новая секция».
3. Переходит на `/dashboard/sections/new`.
4. Редактирует название, описание и контент.
5. Через 800 мс autosave создаёт секцию:

   ```ts
   await api('/api/sections', {
     method: 'POST',
     body: {
       name: name.value,
       description: description.value,
       content: content.value
     }
   })
   ```

6. После ответа URL заменяется на:

   ```text
   /dashboard/sections/{section.id}
   ```

7. Последующие изменения сохраняются через `PATCH /api/sections/{id}`.

### Сценарий 3: выгрузить заявки feedback в CSV

1. Пользователь открывает `/dashboard/modules/feedback`.
2. Страница загружает:

   ```ts
   /api/modules/feedback/submissions
   ```

3. Пользователь нажимает «Скачать CSV».
4. Клиент формирует файл вида:

   ```text
   feedback-submissions-YYYY-MM-DD.csv
   ```

5. Файл скачивается без отдельного серверного endpoint для экспорта.

## Замечания

- Реальный биллинг не подключён. В UI явно указано, что Stripe / ЮKassa находятся в TODO, сейчас доступен только trial.
- Страница `/dashboard/scan-qr` является заглушкой. Сканирование QR ещё не реализовано.
- Страница `/dashboard/team` является информационной. Multi-user схема с ролями `OWNER / EDITOR / VIEWER` через `Membership` упомянута, но UI приглашений ещё не реализован.
- В ряде мест используются типы `any`, например для инструкций, аналитики, модулей и заявок. Это снижает статическую проверку контрактов frontend/backend.
- Ограничение платного тарифа для секций в `sections/index.vue` видно только на уровне UI. Наличие серверной проверки по предоставленному коду подтвердить нельзя.
- В `instructions/index.vue` импортирован `onClickOutside` из `@vueuse/core`, но фактически для kebab menu используется собственный document-level listener. Импорт выглядит неиспользуемым.
- В `instructions/[id]/edit.vue` переменная `currentRole` извлекается из `useAuthState()`, но в коде страницы не используется.
- В `billing.vue` извлекается `currentTenant`, но в шаблоне и логике этой страницы он не используется.
- AI streaming-логика содержит большое количество `console.log`, что полезно для отладки, но может быть шумным в production.
- Для закрытия kebab menu в списке инструкций вручную добавляется `mousedown` listener. При частых открытиях меню важно следить, чтобы обработчики корректно удалялись.
- CSV экспорт выполняется на клиенте и загружает все записи, которые вернул API. Для больших объёмов данных может понадобиться серверный экспорт или пагинация.
- В редакторе инструкции `initial` объявлен как `const`, но затем изменяется поле `initial.slug = cleanSlug`. Это работает для объекта, но может быть неочевидно при сопровождении.
- Код страниц не показывает серверные схемы, Prisma-модели и Nitro route-файлы, поэтому детали валидации, авторизации на backend и форматы ответов описаны только на основании клиентских вызовов.

---
module: page-dashboard
section: client
generated: 2026-05-08
files: 13
---