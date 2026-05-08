# composables

## Назначение

Модуль `composables` содержит переиспользуемые Vue/Nuxt composables и клиентские утилиты для фронтенда ManualOnline. Они закрывают сквозные сценарии: работу с авторизацией и tenant-контекстом, загрузку медиа, потоковую генерацию инструкций, якоря заголовков в публичных инструкциях, анимацию вставки AI-блоков в TipTap и идентификацию viewer-сессии для аналитики.

## Ключевые возможности

- Единый API-клиент `useApi()` поверх `$fetch` с пробросом cookies при SSR и заголовком текущего tenant.
- Глобальное состояние авторизации `useAuthState()` через `useState`: пользователь, membership’ы, текущий tenant и роль.
- Автоматическая генерация anchor-id для заголовков публичной инструкции и синхронизация `location.hash`.
- Клиентское чтение SSE-потока генерации инструкции из файла.
- Унифицированная загрузка файлов:
  - direct upload в S3/MinIO через presigned URL;
  - fallback на server-proxy upload.
- Преобразование AI-блоков в TipTap JSON и «печатная» вставка блоков в редактор.
- Долгоживущий cookie-based viewer session id для клиентской аналитики.

## Архитектура

Модуль состоит из 7 composable/utility-файлов:

```text
composables/
├── useApi.ts
├── useAuthState.ts
├── useHeadingAnchors.ts
├── useInstructionStreaming.ts
├── useMediaUpload.ts
├── useTypewriter.ts
└── useViewerSession.ts
```

### `useAuthState.ts`

Центральное клиентско-серверное состояние авторизации.

Использует Nuxt `useState`:

- `mo:me` — данные текущего пользователя и список membership’ов;
- `mo:currentTenantId` — id выбранного tenant.

Вычисляемые значения:

- `user` — текущий пользователь;
- `memberships` — список доступных tenant’ов с ролями;
- `currentTenant` — tenant по `currentTenantId`, либо первый доступный tenant;
- `currentRole` — роль пользователя в текущем tenant.

Метод `refresh()` загружает `/api/auth/me`. На сервере используется `useRequestFetch()`, чтобы SSR-запрос получил cookies входящего HTTP-запроса. Это важно для корректного определения сессии во время SSR и предотвращения hydration mismatch.

На клиенте выбранный tenant сохраняется в `localStorage` под ключом:

```ts
mo:currentTenantId
```

### `useApi.ts`

Обёртка над `$fetch`, которая добавляет tenant-контекст ко всем API-запросам.

Поведение различается для server/client runtime:

- на сервере используется `useRequestFetch()`, чтобы пробросить cookies входящего запроса;
- на клиенте используется `$fetch.create()` с `onRequest`.

В оба варианта добавляется HTTP-заголовок:

```http
x-tenant-id: <currentTenant.id>
```

Этот заголовок нужен серверным endpoint’ам, которые разрешают tenant через `requireTenant()`.

### `useHeadingAnchors.ts`

Клиентский composable для публичной страницы инструкции.

Он:

1. Ищет `h1`, `h2`, `h3` внутри переданного root selector.
2. Генерирует для них `id` на основе текста.
3. Учитывает кириллицу при slugify.
4. Разрешает коллизии через суффиксы `-2`, `-3` и т.д.
5. При скролле определяет активный заголовок.
6. Обновляет `location.hash` через `history.replaceState()`.
7. При открытии страницы с готовым hash повторно скроллит к заголовку после hydration.

Механизм активного заголовка основан не на `IntersectionObserver`, а на scroll-based алгоритме: текущим считается последний заголовок, верхняя граница которого пересекла линию `REFERENCE_OFFSET_PX = 96`.

### `useInstructionStreaming.ts`

Клиентский потребитель SSE-потока для генерации инструкции из файла.

Функция `streamInstructionFromFile()`:

1. Формирует `FormData` с файлом.
2. Отправляет `POST` на:

```http
/api/instructions/:id/generate-stream
```

3. Пробрасывает `x-tenant-id`, аналогично `useApi`.
4. Читает `ReadableStream` из `response.body`.
5. Парсит SSE-сообщения, разделённые пустой строкой.
6. Вызывает callback’и для событий:
   - `meta`;
   - `block`;
   - `done`;
   - `error`.

### `useMediaUpload.ts`

Унифицированная загрузка файлов.

Основной сценарий:

1. Запросить подпись загрузки:

```http
POST /api/media/sign
```

2. Если backend вернул `fallback: true`, использовать legacy endpoint:

```http
POST /api/media/upload
```

3. Если fallback не нужен:
   - загрузить файл напрямую в S3/MinIO через `XMLHttpRequest PUT`;
   - передать прогресс через `xhr.upload.onprogress`;
   - подтвердить загрузку:

```http
POST /api/media/confirm
```

Функция возвращает публичный URL, MIME-тип и, если есть, id media asset.

### `useTypewriter.ts`

Утилита для анимированной вставки AI-сгенерированных блоков в TipTap.

Функция `typewriteBlocks()`:

1. Очищает документ редактора.
2. Преобразует каждый `AiBlock` в TipTap node JSON.
3. Вставляет блоки по одному.
4. Делает задержку между вставками.
5. Фокусирует редактор в конец документа.

Поддерживаемые типы AI-блоков:

- `heading`;
- `paragraph`;
- `bullet_list`;
- `numbered_list`;
- `safety`;
- `image_placeholder`.

### `useViewerSession.ts`

Создаёт и возвращает стабильный viewer session id для публичного посетителя.

Особенности:

- работает только на клиенте;
- хранит id в cookie `mo_vid`;
- срок жизни cookie — 1 год;
- id генерируется через `nanoid/customAlphabet`;
- используется для корреляции аналитических событий на стороне клиента.

На сервере возвращает пустой `ref('')`.

## API / Интерфейс

### `useApi()`

```ts
export function useApi(): typeof $fetch
```

Возвращает fetch-клиент для запросов к backend API ManualOnline.

#### Поведение

- SSR:
  - использует `useRequestFetch()`;
  - пробрасывает cookies входящего запроса;
  - добавляет `x-tenant-id`, если выбран tenant.
- Client:
  - использует `$fetch.create()`;
  - добавляет `x-tenant-id` в `onRequest`.

#### Пример заголовка

```http
x-tenant-id: tenant_id
```

---

### `useAuthState()`

```ts
export function useAuthState()
```

Возвращает объект:

```ts
{
  me,
  user,
  memberships,
  currentTenant,
  currentRole,
  refresh,
  setTenant
}
```

#### Типы

```ts
interface AuthMembership {
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  tenant: {
    id: string
    slug: string
    name: string
    plan: string
  }
}

interface AuthMe {
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
  } | null
  memberships: AuthMembership[]
}
```

#### Методы

##### `refresh()`

```ts
async function refresh(): Promise<void>
```

Загружает текущего пользователя:

```http
GET /api/auth/me
```

После загрузки обновляет `me` и выбирает текущий tenant.

##### `setTenant(id)`

```ts
function setTenant(id: string): void
```

Устанавливает текущий tenant. На клиенте дополнительно сохраняет id в `localStorage`.

---

### `useHeadingAnchors(rootSelector)`

```ts
export function useHeadingAnchors(rootSelector: string): void
```

Подключает обработку якорей для заголовков внутри DOM-узла, найденного по `rootSelector`.

#### Входные параметры

| Параметр | Тип | Описание |
|---|---|---|
| `rootSelector` | `string` | CSS-селектор корневого элемента с HTML-контентом инструкции |

#### Побочные эффекты

- добавляет `id` к заголовкам `h1`, `h2`, `h3`;
- добавляет обработчик `window.scroll`;
- обновляет URL fragment через `history.replaceState`;
- при размонтировании удаляет обработчик scroll.

---

### `streamInstructionFromFile()`

```ts
export async function streamInstructionFromFile(
  instructionId: string,
  file: File,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void>
```

Отправляет файл на генерацию инструкции и читает SSE-ответ.

#### Endpoint

```http
POST /api/instructions/:instructionId/generate-stream
```

#### `StreamHandlers`

```ts
export interface StreamHandlers {
  onMeta?: (
    meta: Partial<{
      title: string
      slug: string
      description: string
      language: string
    }>
  ) => void

  onBlock?: (block: AiBlock) => void
  onDone?: () => void
  onError?: (msg: string) => void
}
```

#### SSE-события

| Event | Payload | Обработчик |
|---|---|---|
| `meta` | JSON с частичными метаданными инструкции | `onMeta` |
| `block` | `AiBlock` | `onBlock` |
| `done` | JSON payload, содержимое не используется | `onDone` |
| `error` | `{ message?: string }` | `onError` |

---

### `uploadFile()`

```ts
export async function uploadFile(
  file: File,
  onProgress?: (p: UploadProgress) => void
): Promise<{ url: string; mimeType: string; assetId?: string }>
```

Загружает файл и возвращает данные созданного media asset.

#### `UploadProgress`

```ts
export interface UploadProgress {
  loaded: number
  total: number
}
```

#### Используемые endpoint’ы

```http
POST /api/media/sign
POST /api/media/upload
POST /api/media/confirm
```

#### Возвращаемое значение

```ts
{
  url: string
  mimeType: string
  assetId?: string
}
```

---

### `typewriteBlocks()`

```ts
export async function typewriteBlocks(
  editor: Editor,
  blocks: AiBlock[],
  opts?: {
    delayMs?: number
    signal?: AbortSignal
  }
): Promise<void>
```

Анимированно вставляет AI-блоки в TipTap editor.

#### Параметры

| Параметр | Тип | Описание |
|---|---|---|
| `editor` | `Editor` из `@tiptap/vue-3` | Экземпляр TipTap editor |
| `blocks` | `AiBlock[]` | AI-блоки инструкции |
| `opts.delayMs` | `number` | Задержка между вставками блоков |
| `opts.signal` | `AbortSignal` | Возможность остановить вставку |

#### Значение по умолчанию

```ts
const DELAY_MS = 180
```

---

### `useViewerSession()`

```ts
export function useViewerSession()
```

Возвращает `ref`/`useState` со stable viewer session id.

#### Cookie

```http
mo_vid=<sid>; Max-Age=31536000; Path=/; SameSite=Lax
```

#### Формат id

- алфавит: `0123456789abcdefghijklmnopqrstuvwxyz`;
- длина: `24`;
- генератор: `nanoid/customAlphabet`.

## Бизнес-логика

### Tenant-aware API-запросы

Большая часть backend API ManualOnline работает в контексте tenant. Поэтому `useApi()` автоматически добавляет `x-tenant-id`, если текущий tenant известен.

Это правило также вручную продублировано в `streamInstructionFromFile()`, потому что там используется native `fetch()` для чтения streaming response, а не `$fetch`.

### SSR-авторизация

В Nuxt SSR обычный `$fetch` не пробрасывает cookies входящего пользовательского запроса. Поэтому:

- `useAuthState.refresh()` на сервере использует `useRequestFetch()`;
- `useApi()` на сервере также использует `useRequestFetch()`.

Без этого `/api/auth/me` во время SSR возвращал бы неавторизованное состояние, а после hydration клиент мог бы получить пользователя, что привело бы к расхождению server/client render.

### Выбор текущего tenant

Алгоритм выбора tenant:

1. После `refresh()` загружается список `memberships`.
2. На клиенте проверяется tenant id из `localStorage`.
3. Если сохранённый tenant существует среди membership’ов — используется он.
4. Иначе выбирается первый tenant из списка.
5. На сервере всегда выбирается первый tenant из списка.

Если membership’ов нет, `currentTenant` будет `null`.

### Роли пользователя

Поддерживаются роли:

```ts
'OWNER' | 'EDITOR' | 'VIEWER'
```

`currentRole` вычисляется по membership текущего tenant. В данном модуле роли только читаются, проверок прав доступа здесь нет.

### Генерация якорей заголовков

Slug для заголовка:

- переводится в нижний регистр;
- обрезается по краям;
- все символы, кроме латиницы, цифр и кириллицы, заменяются на `-`;
- начальные и конечные `-` удаляются;
- длина ограничена 80 символами;
- пустой slug заменяется на `h`.

Коллизии разрешаются добавлением числового суффикса:

```text
ustanovka
ustanovka-2
ustanovka-3
```

### Обновление hash при скролле

Активный заголовок определяется как последний heading, у которого:

```ts
h.getBoundingClientRect().top <= 96
```

Если пользователь находится выше первого заголовка, hash очищается.

URL обновляется через `history.replaceState()`, поэтому:

- не создаются новые записи в истории браузера;
- не происходит автоматический scroll jump;
- не вызывается `hashchange`.

### Загрузка медиа

Алгоритм `uploadFile()`:

1. Отправить на сервер имя файла, content type и размер.
2. Получить стратегию загрузки.
3. Если сервер требует fallback:
   - отправить файл через multipart на `/api/media/upload`.
4. Если доступна direct upload стратегия:
   - загрузить файл напрямую в object storage по `uploadUrl`;
   - передать headers, полученные от сервера;
   - подтвердить загрузку через `/api/media/confirm`.

Progress доступен только в direct upload сценарии через `XMLHttpRequest`.

### Потоковая генерация инструкции

`streamInstructionFromFile()` ожидает SSE-формат:

```text
event: block
data: {...}

event: done
data: {...}
```

Сообщения разделяются пустой строкой `\n\n`.

Если HTTP-ответ не `ok` или отсутствует body, вызывается:

```ts
handlers.onError?.(`HTTP ${res.status}`)
```

Ошибки JSON-парсинга отдельных SSE-сообщений игнорируются.

### Typewriter-вставка в TipTap

Перед началом вставки редактор очищается:

```ts
editor.commands.setContent({ type: 'doc', content: [] }, false)
```

Каждый AI-блок вставляется атомарно через:

```ts
editor.commands.insertContent(node)
```

Если `AbortSignal` уже отменён перед очередным блоком, вставка прекращается.

## Зависимости

### Внутренние зависимости ManualOnline

- `/api/auth/me` — получение текущего пользователя и membership’ов.
- `/api/instructions/:id/generate-stream` — потоковая AI-генерация инструкции.
- `/api/media/sign` — получение presigned upload URL или fallback-режима.
- `/api/media/upload` — legacy server-proxy upload.
- `/api/media/confirm` — подтверждение direct upload и создание media asset.
- `~~/server/utils/aiInstructionGenerator` — тип `AiBlock`.
- Серверная tenant-логика, ожидающая заголовок `x-tenant-id`.

### Nuxt / Vue

- `useState`
- `computed`
- `ref`
- `onMounted`
- `onBeforeUnmount`
- `nextTick`
- `$fetch`
- `useRequestFetch`
- `import.meta.server`
- `import.meta.client`

### Внешние библиотеки и браузерные API

- `@tiptap/vue-3` — тип `Editor` и работа с TipTap editor.
- `nanoid/customAlphabet` — генерация viewer session id.
- `fetch` — streaming POST для SSE.
- `ReadableStreamDefaultReader` — чтение тела SSE-ответа.
- `TextDecoder` — декодирование бинарных чанков.
- `FormData` — отправка файлов.
- `XMLHttpRequest` — direct upload с progress events.
- `localStorage` — хранение текущего tenant на клиенте.
- `document.cookie` — хранение viewer session id.
- `history.replaceState` — обновление hash без навигационного jump.
- S3/MinIO-compatible storage — direct upload по presigned URL.

## Примеры использования

### Запрос к API с tenant-контекстом

```ts
const api = useApi()

const instruction = await api(`/api/instructions/${id}`)
```

Если у пользователя выбран tenant, запрос автоматически получит заголовок:

```http
x-tenant-id: <tenant-id>
```

---

### Инициализация состояния авторизации

```ts
const { user, memberships, currentTenant, currentRole, refresh, setTenant } = useAuthState()

await refresh()

if (memberships.value.length > 1) {
  setTenant(memberships.value[0].tenant.id)
}
```

---

### Загрузка изображения с progress

```ts
const progress = ref(0)

const result = await uploadFile(file, ({ loaded, total }) => {
  progress.value = Math.round((loaded / total) * 100)
})

console.log(result.url, result.mimeType, result.assetId)
```

---

### Чтение SSE-генерации инструкции

```ts
const blocks = ref<AiBlock[]>([])

await streamInstructionFromFile(
  instructionId,
  file,
  {
    onMeta(meta) {
      console.log('metadata', meta)
    },
    onBlock(block) {
      blocks.value.push(block)
    },
    onDone() {
      console.log('generation completed')
    },
    onError(message) {
      console.error(message)
    }
  }
)
```

---

### Анимированная вставка AI-блоков в TipTap

```ts
await typewriteBlocks(editor, blocks.value, {
  delayMs: 120
})
```

---

### Подключение heading anchors на публичной странице

```ts
useHeadingAnchors('.instruction-content')
```

Composable нужно вызывать в компоненте страницы/контента, где DOM с заголовками появляется после hydration.

## Замечания

- `useHeadingAnchors()` работает только на клиенте. На сервере функция сразу завершает выполнение.
- Логика slugify для заголовков продублирована на клиенте и, согласно комментарию в коде, существует также на сервере в `server/utils/slug.ts`. Это сделано намеренно, чтобы не тянуть server utils в client bundle.
- `useHeadingAnchors()` ждёт появления заголовков максимум около 3 секунд: 30 попыток по 100 мс. Если контент появится позже, якоря не будут инициализированы.
- В `useHeadingAnchors()` id не перегенерируется для заголовков, у которых уже есть `id`. Такие id считаются занятыми.
- `streamInstructionFromFile()` содержит собственную реализацию SSE-парсинга. Она поддерживает только базовый формат `event:` и `data:` и не обрабатывает многострочные `data:` как полноценный SSE-клиент со всеми edge cases.
- В `streamInstructionFromFile()` ошибки JSON-парсинга silently ignored — обработчик ошибки не вызывается.
- `uploadFile()` использует `XMLHttpRequest` для direct upload, потому что native `fetch` не предоставляет upload progress в большинстве браузеров.
- Progress callback в `uploadFile()` доступен только для direct S3/MinIO upload. В fallback server-proxy upload прогресс не передаётся.
- `useViewerSession()` создаёт cookie без флагов `Secure` и `HttpOnly`. Это ожидаемо для клиентского analytics id, но cookie доступна JavaScript-коду.
- `typewriteBlocks()` перед вставкой полностью очищает содержимое редактора. Это важно учитывать при использовании в существующем документе.
- Для `image_placeholder` в `useTypewriter.ts` используется `safetyBlock` с severity `info`, а не отдельный image node. Это текущее представление placeholder’а в редакторе.

---
module: composables
section: client
generated: 2026-05-08
files: 7
---