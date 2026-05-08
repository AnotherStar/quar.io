# api-public

## Назначение

Модуль `api-public` содержит публичные Nitro API routes для просмотра опубликованных инструкций, отправки пользовательской аналитики и сбора обратной связи по блокам инструкции. Он обслуживает публичный viewer ManualOnline и не содержит логики авторизации в показанном коде.

## Ключевые возможности

- Загрузка публичной инструкции по человекочитаемому пути:
  - `tenantSlug`
  - `instructionSlug`
- Загрузка публичной инструкции по короткому идентификатору `shortId`.
- Приём батчей аналитических событий от публичного viewer.
- Обогащение аналитики данными устройства, браузера, ОС и геолокации из HTTP-заголовков.
- Сохранение пользовательской обратной связи по конкретному блоку инструкции.
- Валидация входящих JSON-тел через `zod`.

## Архитектура

Модуль расположен в директории `server/api/public` и реализован как набор Nitro route-файлов Nuxt 3.

```text
server/api/public/
├── [tenantSlug]/
│   └── [instructionSlug].get.ts
├── short/
│   └── [shortId].get.ts
├── analytics.post.ts
└── feedback.post.ts
```

### Основные части

#### `server/api/public/[tenantSlug]/[instructionSlug].get.ts`

Публичный route для получения инструкции по паре slug:

- `tenantSlug` — slug продавца или tenant;
- `instructionSlug` — slug инструкции.

Обработчик извлекает параметры из маршрута через `getRouterParam`, затем вызывает:

```ts
loadPublicByPath(tenantSlug, instructionSlug)
```

Если данные не найдены, возвращается HTTP `404`.

#### `server/api/public/short/[shortId].get.ts`

Публичный route для получения инструкции по короткому идентификатору `shortId`.

Использует функцию:

```ts
loadPublicByShortId(shortId)
```

Если данные не найдены, возвращается HTTP `404`.

#### `server/api/public/analytics.post.ts`

Route для ingestion-аналитики от публичного viewer.

Обработчик:

1. Валидирует тело запроса через `zod`.
2. Читает `User-Agent`.
3. Парсит устройство, ОС и браузер через `ua-parser-js`.
4. Читает географические заголовки Cloudflare:
   - `cf-ipcountry`
   - `cf-region`
   - `cf-ipcity`
5. Сохраняет события пачкой через Prisma:

```ts
prisma.viewEvent.createMany(...)
```

#### `server/api/public/feedback.post.ts`

Route для отправки обратной связи по блоку инструкции.

Обработчик:

1. Валидирует тело запроса через `zod`.
2. Создаёт запись в таблице обратной связи:

```ts
prisma.blockFeedback.create({ data: body })
```

3. Возвращает идентификатор созданной записи.

## API / Интерфейс

### `GET /api/public/:tenantSlug/:instructionSlug`

Получает публичную инструкцию по slug tenant и slug инструкции.

Файл:

```text
server/api/public/[tenantSlug]/[instructionSlug].get.ts
```

#### Path parameters

| Параметр | Тип | Обязательный | Описание |
|---|---:|---:|---|
| `tenantSlug` | `string` | да | Slug tenant / продавца |
| `instructionSlug` | `string` | да | Slug инструкции |

#### Ответ

При успешном поиске возвращает данные, которые отдаёт `loadPublicByPath`.

Точный контракт ответа в представленном коде не раскрыт, так как реализация `server/utils/publicResolve` не входит в исходный фрагмент.

#### Ошибки

| Статус | Условие |
|---:|---|
| `404` | Инструкция по указанному пути не найдена |

---

### `GET /api/public/short/:shortId`

Получает публичную инструкцию по короткому идентификатору.

Файл:

```text
server/api/public/short/[shortId].get.ts
```

#### Path parameters

| Параметр | Тип | Обязательный | Описание |
|---|---:|---:|---|
| `shortId` | `string` | да | Короткий идентификатор публичной инструкции |

#### Ответ

При успешном поиске возвращает данные, которые отдаёт `loadPublicByShortId`.

Точный контракт ответа в представленном коде не раскрыт, так как реализация `loadPublicByShortId` не показана.

#### Ошибки

| Статус | Условие |
|---:|---|
| `404` | Инструкция по указанному короткому идентификатору не найдена |

---

### `POST /api/public/analytics`

Принимает пачку аналитических событий от публичного viewer.

Файл:

```text
server/api/public/analytics.post.ts
```

#### Request body

Тело запроса валидируется схемой:

```ts
const eventSchema = z.object({
  instructionId: z.string(),
  versionId: z.string().optional(),
  sessionId: z.string().min(8).max(64),
  type: z.enum(['PAGE_VIEW', 'PAGE_LEAVE', 'BLOCK_VIEW', 'BLOCK_DWELL']),
  blockId: z.string().optional(),
  durationMs: z.number().int().min(0).max(24 * 60 * 60 * 1000).optional(),
  scrollDepth: z.number().int().min(0).max(100).optional(),
  referrer: z.string().max(500).optional(),
  language: z.string().max(10).optional()
})

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(50)
})
```

#### Поля события

| Поле | Тип | Обязательное | Ограничения | Описание |
|---|---:|---:|---|---|
| `instructionId` | `string` | да | — | Идентификатор инструкции |
| `versionId` | `string` | нет | — | Идентификатор версии инструкции |
| `sessionId` | `string` | да | `8..64` символа | Идентификатор пользовательской сессии |
| `type` | `enum` | да | `PAGE_VIEW`, `PAGE_LEAVE`, `BLOCK_VIEW`, `BLOCK_DWELL` | Тип аналитического события |
| `blockId` | `string` | нет | — | Идентификатор блока инструкции |
| `durationMs` | `number` | нет | integer, `0..86400000` | Длительность в миллисекундах, максимум 24 часа |
| `scrollDepth` | `number` | нет | integer, `0..100` | Глубина скролла в процентах |
| `referrer` | `string` | нет | максимум `500` символов | Referrer страницы |
| `language` | `string` | нет | максимум `10` символов | Язык клиента |

#### Ограничения батча

| Поле | Тип | Ограничение |
|---|---:|---|
| `events` | `Array<Event>` | минимум `1`, максимум `50` событий |

#### Обогащение на сервере

Для каждого события сервер добавляет:

| Поле | Источник |
|---|---|
| `country` | HTTP-заголовок `cf-ipcountry`, либо `null` |
| `region` | HTTP-заголовок `cf-region`, либо `null` |
| `city` | HTTP-заголовок `cf-ipcity`, либо `null` |
| `deviceType` | результат парсинга `User-Agent`, либо `'desktop'` |
| `os` | имя ОС из `User-Agent` |
| `browser` | имя браузера из `User-Agent` |

#### Ответ

```json
{
  "ok": true,
  "accepted": 2
}
```

Где `accepted` — количество принятых событий в батче.

---

### `POST /api/public/feedback`

Создаёт запись обратной связи по блоку инструкции.

Файл:

```text
server/api/public/feedback.post.ts
```

#### Request body

```ts
const schema = z.object({
  instructionId: z.string(),
  versionId: z.string().optional(),
  sessionId: z.string().min(8).max(64),
  blockId: z.string(),
  kind: z.enum(['HELPFUL', 'CONFUSING', 'INCORRECT', 'COMMENT']),
  comment: z.string().max(1000).optional()
})
```

#### Поля

| Поле | Тип | Обязательное | Ограничения | Описание |
|---|---:|---:|---|---|
| `instructionId` | `string` | да | — | Идентификатор инструкции |
| `versionId` | `string` | нет | — | Идентификатор версии инструкции |
| `sessionId` | `string` | да | `8..64` символа | Идентификатор пользовательской сессии |
| `blockId` | `string` | да | — | Идентификатор блока инструкции |
| `kind` | `enum` | да | `HELPFUL`, `CONFUSING`, `INCORRECT`, `COMMENT` | Тип обратной связи |
| `comment` | `string` | нет | максимум `1000` символов | Текстовый комментарий пользователя |

#### Ответ

```json
{
  "ok": true,
  "id": "feedback_id"
}
```

Где `id` — идентификатор созданной записи `blockFeedback`.

## Бизнес-логика

### Публичная загрузка инструкций

Для загрузки инструкции используются две стратегии:

1. По публичному пути:

```ts
loadPublicByPath(tenantSlug, instructionSlug)
```

2. По короткому идентификатору:

```ts
loadPublicByShortId(shortId)
```

Если соответствующая инструкция не найдена, обработчик выбрасывает ошибку:

```ts
throw createError({ statusCode: 404 })
```

Дополнительные правила публикации, проверки доступности, статусы инструкций или версий в показанном коде не раскрыты. Вероятно, они находятся внутри `server/utils/publicResolve`, но этот файл не предоставлен.

### Приём аналитики

Аналитика принимается только в формате батча:

```json
{
  "events": []
}
```

Основные правила:

- Батч должен содержать от `1` до `50` событий.
- `sessionId` должен быть длиной от `8` до `64` символов.
- Тип события строго ограничен списком:
  - `PAGE_VIEW`
  - `PAGE_LEAVE`
  - `BLOCK_VIEW`
  - `BLOCK_DWELL`
- `durationMs` не может быть отрицательным и ограничен 24 часами.
- `scrollDepth` должен быть целым числом от `0` до `100`.
- `referrer` ограничен `500` символами.
- `language` ограничен `10` символами.

События сохраняются пачкой через `createMany`, без дополнительной обработки результата вставки в показанном коде.

### Обогащение аналитики

Перед сохранением сервер добавляет к событиям технический контекст:

```ts
const ua = getRequestHeader(event, 'user-agent') ?? ''
const parsed = UAParser(ua)
```

Если тип устройства не определён, используется значение по умолчанию:

```ts
deviceType: parsed.device?.type ?? 'desktop'
```

Географические данные берутся из Cloudflare-заголовков. В комментарии к коду явно указано, что в dev-окружении они могут быть `null`.

### Обратная связь

Для feedback-событий действуют правила:

- `instructionId`, `sessionId`, `blockId`, `kind` обязательны.
- `versionId` опционален.
- `comment` опционален и ограничен `1000` символами.
- `kind` строго ограничен значениями:
  - `HELPFUL`
  - `CONFUSING`
  - `INCORRECT`
  - `COMMENT`

Запись создаётся напрямую через Prisma:

```ts
const fb = await prisma.blockFeedback.create({ data: body })
```

## Зависимости

### Внутренние зависимости ManualOnline

| Зависимость | Используется в | Назначение |
|---|---|---|
| `~~/server/utils/publicResolve` | GET routes | Загрузка публичных данных инструкции по slug или short id |
| `~~/server/utils/prisma` | analytics, feedback | Доступ к Prisma Client для записи аналитики и feedback |

### Внешние зависимости

| Пакет / сервис | Используется в | Назначение |
|---|---|---|
| `zod` | `analytics.post.ts`, `feedback.post.ts` | Валидация входящих тел запросов |
| `ua-parser-js` | `analytics.post.ts` | Парсинг `User-Agent` для определения устройства, ОС и браузера |
| Prisma | через `prisma` util | Запись в модели `viewEvent` и `blockFeedback` |
| PostgreSQL | косвенно через Prisma | Хранилище аналитики и обратной связи |
| Cloudflare headers | `analytics.post.ts` | Гео-обогащение событий по HTTP-заголовкам |

## Примеры использования

### Получение публичной инструкции по slug

```ts
const instruction = await $fetch('/api/public/acme/washing-machine-quick-start')
```

Если инструкция не найдена, API вернёт `404`.

### Отправка аналитических событий

```ts
await $fetch('/api/public/analytics', {
  method: 'POST',
  body: {
    events: [
      {
        instructionId: 'instr_123',
        versionId: 'ver_456',
        sessionId: 'session_abcdef',
        type: 'PAGE_VIEW',
        referrer: document.referrer,
        language: navigator.language
      },
      {
        instructionId: 'instr_123',
        versionId: 'ver_456',
        sessionId: 'session_abcdef',
        type: 'BLOCK_VIEW',
        blockId: 'block_789',
        scrollDepth: 45
      }
    ]
  }
})
```

### Отправка обратной связи по блоку

```ts
await $fetch('/api/public/feedback', {
  method: 'POST',
  body: {
    instructionId: 'instr_123',
    versionId: 'ver_456',
    sessionId: 'session_abcdef',
    blockId: 'block_789',
    kind: 'CONFUSING',
    comment: 'Шаг не совсем понятен'
  }
})
```

## Замечания

- В показанном коде публичные endpoints не содержат авторизации или rate limiting. Для публичных маршрутов аналитики и feedback это может быть риском спама или избыточной нагрузки.
- `analytics.post.ts` использует `createMany`, но не указывает `skipDuplicates`; поведение при дублях зависит от схемы БД и ограничений Prisma-модели.
- Геолокация зависит от Cloudflare-заголовков. В локальной разработке значения `country`, `region`, `city` будут `null`, что явно отмечено в комментарии к коду.
- Контракт ответа для загрузки публичных инструкций не описан в предоставленных файлах, так как реализация `loadPublicByPath` и `loadPublicByShortId` отсутствует.
- Валидация `instructionId`, `versionId` и `blockId` проверяет только тип `string`, но не формат идентификаторов.
- В `feedback.post.ts` поле `comment` является опциональным для всех типов `kind`, включая `COMMENT`; дополнительного требования наличия комментария для `COMMENT` в коде нет.

---
module: api-public
section: server
generated: 2026-05-08
files: 4
---