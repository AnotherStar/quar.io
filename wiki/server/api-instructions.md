# api-instructions

## Назначение

Модуль `api-instructions` реализует Nitro API routes для управления инструкциями в ManualOnline: создание, редактирование, публикация, архивирование, версии, аналитика, feedback, подключение reusable sections и pluggable modules. Также модуль содержит серверные сценарии генерации инструкций из PDF/изображений через OpenAI, включая потоковую генерацию с SSE.

## Ключевые возможности

- CRUD-операции для инструкций в рамках tenant-пространства.
- Проверка прав доступа через tenant-контекст и роли `EDITOR` / `OWNER`.
- Ограничение количества активных инструкций по тарифному плану.
- Публикация инструкции с созданием immutable-версии `InstructionVersion`.
- Workflow согласования публикации через `ReviewRequest`.
- Архивирование и восстановление инструкций.
- Получение агрегированной аналитики за ��оследние 30 дней.
- Получение feedback по блокам инструкции.
- Управление reusable sections, прикреплёнными к инструкции.
- Управление pluggable instruction modules, прикреплёнными к инструкции.
- Генерация новой инструкции из файла через OpenAI.
- Потоковая генерация draft-контента существующей инструкции через SSE.
- Извлечение изображений из PDF, загрузка их в S3/MinIO и использование в AI-generated content.

## Архитектура

Модуль расположен в `server/api/instructions` и состоит из 18 Nitro route-файлов.

```text
server/api/instructions/
├── index.get.ts
├── index.post.ts
├── generate-from-file.post.ts
└── [id]/
    ├── index.get.ts
    ├── index.patch.ts
    ├── index.delete.ts
    ├── analytics.get.ts
    ├── archive.post.ts
    ├── unarchive.post.ts
    ├── publish.post.ts
    ├── review.post.ts
    ├── versions.get.ts
    ├── feedback.get.ts
    ├── generate-stream.post.ts
    ├── sections.post.ts
    ├── sections/
    │   └── [sectionId].delete.ts
    ├── modules.post.ts
    └── modules/
        └── [configId].delete.ts
```

### Основные группы роутов

#### Базовое управление инструкциями

- `index.get.ts` — список инструкций tenant’а с количеством просмотров за 30 дней.
- `index.post.ts` — создание новой пустой инструкции.
- `[id]/index.get.ts` — получение полной карточки инструкции.
- `[id]/index.patch.ts` — обновление метаданных и draft-контента.
- `[id]/index.delete.ts` — удаление инструкции владельцем tenant’а.

#### Жизненный цикл инструкции

- `[id]/publish.post.ts` — публикация текущего draft-контента в новую версию.
- `[id]/archive.post.ts` — перевод инструкции в архив.
- `[id]/unarchive.post.ts` — восстановление инструкции из архива.
- `[id]/review.post.ts` — запрос и обработка согласования публикации.
- `[id]/versions.get.ts` — список опубликованных версий.

#### Аналитика и обра��ная связь

- `[id]/analytics.get.ts` — агрегированная аналитика по просмотрам, устройствам, странам, scroll depth и feedback.
- `[id]/feedback.get.ts` — последние отзывы по блокам и агрегаты по `blockId` / `kind`.

#### Reusable sections

- `[id]/sections.post.ts` — прикрепление reusable section к инструкции.
- `[id]/sections/[sectionId].delete.ts` — удаление связи section-инструкция.

#### Pluggable modules

- `[id]/modules.post.ts` — прикрепление tenant module config к инструкции.
- `[id]/modules/[configId].delete.ts` — удаление связи module-инструкция.

#### AI-генерация

- `generate-from-file.post.ts` — создание новой инструкции из PDF или изображения.
- `[id]/generate-stream.post.ts` — потоковая генерация draft-контента существующей инструкции с отправкой блоков через Server-Sent Events.

### Взаимодействие с внутренними сервисами

Модуль использует несколько серверных утилит ManualOnline:

- `requireTenant` — авториза��ия, получение tenant, user и роли.
- `prisma` — доступ к PostgreSQL через Prisma.
- `effectiveFeatures` — вычисление доступных возможностей тарифного плана.
- `generateShortId` — генерация короткого публичного идентификатора.
- `aiInstructionGenerator` — генерация AI-инструкций и конвертация AI-блоков в TipTap-документ.
- `streamingBlockExtractor` — инкрементальный парсинг JSON-ответа OpenAI при streaming generation.
- `pdfImageExtractor` — извлечение embedded images из PDF.
- `storage` — загрузка объектов в S3/MinIO.
- shared zod-схемы из `shared/schemas/instruction`.

## API / Интерфейс

### `GET /api/instructions`

Возвращает список инструкций текущего tenant’а.

#### Авторизация

- Требуется tenant-контекст.
- Минимальная роль явно не задана.

#### Ответ

```ts
{
  instructions: Array<{
    id: string
    slug: string
    shortId: string
    title: string
    language: string
    status: string
    updatedAt: Date
    publishedAt: Date | null
    productGroupId: string | null
    views30d: number
  }>
}
```

`views30d` рассчитывается по событиям `ViewEvent` типа `PAGE_VIEW` за последние 30 дней.

---

### `POST /api/instructions`

Создаёт новую пустую инструкцию.

#### Авторизация

- `requireTenant(event, { minRole: 'EDITOR' })`

#### Body

Валидируется через `instructionCreateSchema`.

Из кода видно использование полей:

```ts
{
  slug: string
  title: string
  language: string
  productGroupId?: string | null
}
```

#### Ответ

```ts
{
  instruction: Instruction
}
```

#### Особенности

- Проверяется лимит активных инструкций по тарифу.
- Проверяется уникальность `slug` в пределах tenant’а.
- `draftContent` инициализируется значением `EMPTY_DOC`.
- Генерируется `shortId`.

---

### `POST /api/instructions/generate-from-file`

Создаёт новую инструкцию из загруженного PDF или изображения через OpenAI.

#### Авторизация

- `requireTenant(event, { minRole: 'EDITOR' })`

#### Request

`multipart/form-data` с полем:

```text
file
```

#### Ограничения

- Максимальный размер файла: `25 МБ`.
- В данном route-файле явно проверяется только наличие файла и размер.
- Поддерживаемые MIME-типы фактически определяются внутри `generateInstructionFromFile`.

#### Ответ

```ts
{
  instruction: {
    id: string
    slug: string
    title: string
  },
  aiBlocks: AiBlock[]
}
```

`aiBlocks` возвращаются клиенту для анимации появления блоков в редакторе. При этом полный draft уже сохранён в базе.

---

### `GET /api/instructions/:id`

Возвращает полную информацию об инструкции.

#### Авторизация

- Требуется tenant-контекст.

#### Ответ

```ts
{
  instruction: Instruction & {
    sectionAttachments: Array<InstructionSectionAttachment & {
      section: Section
    }>
    moduleAttachments: Array<InstructionModuleAttachment & {
      tenantModuleConfig: TenantModuleConfig & {
        module: Module
      }
    }>
    versions: Array<{
      id: string
      versionNumber: number
      changelog: string | null
      createdAt: Date
    }>
    reviewRequests: ReviewRequest[]
  }
}
```

#### Include-логика

- `sectionAttachments` сортируются по `position asc`.
- `moduleAttachments` сортируются по `position asc`.
- `versions` возвращаются последние 10, по `versionNumber desc`.
- `reviewRequests` возвращаются последние 5, по `createdAt desc`.

---

### `PATCH /api/instructions/:id`

Обновляет инструкцию.

#### Авторизация

- `requireTenant(event, { minRole: 'EDITOR' })`

#### Body

Валидируется через `instructionUpdateSchema`.

Из кода видно использование полей:

```ts
{
  title?: string
  slug?: string
  description?: string | null
  language?: string
  productGroupId?: string | null
  draftContent?: object
}
```

#### Ответ

```ts
{
  instruction: Instruction
}
```

#### Особенности

- Инструкция должна принадлежать текущему tenant’у.
- При изменении `slug` проверяется уникальность в рамках tenant’а.
- `draftContent` обновляется только если передан не `null` / `undefined`:

```ts
draftContent: body.draftContent ?? undefined
```

---

### `DELETE /api/instructions/:id`

Удаляет инструкцию.

#### Авторизация

- `requireTenant(event, { minRole: 'OWNER' })`

#### Ответ

```ts
{
  ok: true
}
```

#### Особенности

- Удаление доступно только владельцу tenant’а.
- Перед удалением проверяется принадлежность инструкции tenant’у.

---

### `GET /api/instructions/:id/analytics`

Возвращает агрегированную аналитику по инструкции за последние 30 дней.

#### Авторизация

- Требуется tenant-контекст.

#### Ответ

```ts
{
  range: {
    from: Date
    to: Date
  },
  totals: {
    pageViews: number
    uniqueSessions: number
    avgScrollDepth: number
    avgDurationMs: number
  },
  byCountry: Array<{
    country: string
    count: number
  }>,
  byDevice: Array<{
    deviceType: string
    count: number
  }>,
  feedbackByKind: Array<{
    kind: string
    count: number
  }>,
  byDay: Array<{
    day: Date
    views: number
  }>
}
```

#### Источники данных

- `ViewEvent`:
  - `PAGE_VIEW` — просмотры, страны, устройства, динамика по дням.
  - `PAGE_LEAVE` — средний `scrollDepth` и `durationMs`.
- `BlockFeedback`:
  - агрегаты feedback по `kind`.

---

### `POST /api/instructions/:id/archive`

Архивирует инструкцию.

#### Авторизация

- `requireTenant(event, { minRole: 'EDITOR' })`

#### Ответ

```ts
{
  instruction: Instruction
}
```

#### Изменения

```ts
{
  status: 'ARCHIVED',
  archivedAt: new Date()
}
```

---

### `POST /api/instructions/:id/unarchive`

Восстанавливает инструкцию из архива.

#### Авторизация

- `requireTenant(event, { minRole: 'EDITOR' })`

#### Ответ

```ts
{
  instruction: Instruction
}
```

#### Изменения

```ts
{
  status: 'DRAFT',
  archivedAt: null
}
```

#### Особенности

- Если инструкция не в статусе `ARCHIVED`, возвращается `400`.
- При восстановлении снова применяется лимит активных инструкций по тарифу.

---

### `POST /api/instructions/:id/publish`

Публикует текущий draft инструкции.

#### Авторизация

- `requireTenant(event, { minRole: 'EDITOR' })`

#### Body

Body опциональный, валидируется через `publishSchema`.

Из кода видно поле:

```ts
{
  changelog?: string
}
```

#### Ответ

```ts
{
  instruction: Instruction & {
    publishedVersion: {
      id: string
      versionNumber: number
      createdAt: Date
    }
  }
}
```

#### Что происходит при публикации

1. Проверяется существование инструкции в текущем tenant’е.
2. Проверяется необходимость approval workflow.
3. Вычисляется следующий `versionNumber`.
4. В транзакции:
   - создаётся запись `InstructionVersion`;
   - инструкция переводится в статус `PUBLISHED`;
   - обновляется `publishedVersionId`;
   - устанавливается `publishedAt`.

---

### `POST /api/instructions/:id/review`

Создаёт запрос на ревью или принимает решение по ревью.

#### Авторизация

- `requireTenant(event, { minRole: 'EDITOR' })`

#### Body

Валидируется через discriminated union по полю `action`.

##### Запрос ревью

```ts
{
  action: 'request',
  message?: string
}
```

##### Решение по ревью

```ts
{
  action: 'decide',
  requestId: string,
  decision: 'APPROVED' | 'REJECTED',
  note?: string
}
```

#### Ответ для `request`

```ts
{
  reviewRequest: ReviewRequest
}
```

#### Ответ для `decide`

```ts
{
  reviewRequest: ReviewRequest
}
```

#### Правила

- Создать запрос на ревью может пользователь с ролью не ниже `EDITOR`.
- При запросе ревью инструкция переводится в статус `IN_REVIEW`.
- Принимать решение может только `OWNER`.
- При `REJECTED` инструкция возвращается в статус `DRAFT`.
- При `APPROVED` статус инструкции в этом route-файле явно не меняется.

---

### `GET /api/instructions/:id/versions`

Возвращает список версий инструкции.

#### Авторизация

- Требуется tenant-контекст.

#### Ответ

```ts
{
  versions: Array<{
    id: string
    versionNumber: number
    changelog: string | null
    createdAt: Date
    createdById: string
  }>
}
```

Версии сортируются по `versionNumber desc`.

---

### `GET /api/instructions/:id/feedback`

Возвращает последние отзывы по блокам инструкции и агрегаты.

#### Авторизация

- Требуется tenant-контекст.

#### Ответ

```ts
{
  items: Array<{
    id: string
    blockId: string
    kind: string
    comment: string | null
    createdAt: Date
  }>,
  byBlock: Array<{
    blockId: string
    kind: string
    count: number
  }>
}
```

#### Особенности

- Возвращаются последние 100 feedback-записей.
- Агрегация выполняется по паре `blockId` + `kind`.

---

### `POST /api/instructions/:id/sections`

Прикрепляет reusable section к инструкции или обновляет существующую связь.

#### Авторизация

- `requireTenant(event, { minRole: 'EDITOR' })`

#### Body

```ts
{
  sectionId: string
  position?: number
  slot?: 'before' | 'after' | 'sidebar'
}
```

Значения по умолчанию:

```ts
{
  position: 0,
  slot: 'after'
}
```

#### Ответ

```ts
{
  attachment: InstructionSectionAttachment
}
```

#### Особенности

- Проверяется, что и инструкция, и section принадлежат текущему tenant’у.
- Используется `upsert` по уникальной паре `instructionId_sectionId`.

---

### `DELETE /api/instructions/:id/sections/:sectionId`

Удаляет связь reusable section с инструкцией.

#### Авторизация

- `requireTenant(event, { minRole: 'EDITOR' })`

#### Ответ

```ts
{
  ok: true
}
```

#### Особенности

- Использ��ется `deleteMany`.
- Операция идемпотентна: если связи нет, всё равно возвращается `{ ok: true }`.
- Удаление ограничено инструкцией текущего tenant’а через relation filter:

```ts
instruction: { tenantId: tenant.id }
```

---

### `POST /api/instructions/:id/modules`

Прикрепляет pluggable module configuration к инструкции или обновляет существующую связь.

#### Авторизация

- `requireTenant(event, { minRole: 'EDITOR' })`

#### Body

```ts
{
  tenantModuleConfigId: string
  position?: number
  slot?: 'before' | 'after' | 'sidebar'
  configOverride?: Record<string, any>
}
```

Значения по умолчанию:

```ts
{
  position: 0,
  slot: 'after'
}
```

#### Ответ

```ts
{
  attachment: InstructionModuleAttachment
}
```

#### Особенности

- Проверяется существование инструкции в текущем tenant’е.
- Проверяется существование `tenantModuleConfig` в текущем tenant’е.
- Используется `upsert` по уникальной паре:

```ts
instructionId_tenantModuleConfigId
```

---

### `DELETE /api/instructions/:id/modules/:configId`

Удаляет связь module configuration с инструкцией.

#### Авторизация

- `requireTenant(event, { minRole: 'EDITOR' })`

#### Ответ

```ts
{
  ok: true
}
```

#### Особенности

- Используется `deleteMany`.
- Операция идемпотентна.
- Удаление ограничено инструкцией текущего tenant’а через relation filter.

---

### `POST /api/instructions/:id/generate-stream`

Потоково генерирует draft-контент существующей инструкции из PDF или изображения.

#### Авторизация

- `requireTenant(event, { minRole: 'EDITOR' })`

#### Request

`multipart/form-data` с полем:

```text
file
```

#### Поддерживаемые файлы

- изображения с MIME `image/*`;
- PDF:
  - MIME `application/pdf`;
  - или filename с расширением `.pdf`.

#### Ограничения

- Максимальный размер файла: `25 МБ`.
- Если `OPENAI_API_KEY` не настроен, возвращается `500`.
- Если файл не PDF и не изображение, возвращается `400`.

#### Response

Route отвечает как Server-Sent Events:

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

#### SSE-события

##### `progress`

Используется для этапов обработки PDF-изображений.

Примеры:

```json
{ "stage": "extracting-images" }
```

```json
{ "stage": "images-ready", "count": 3 }
```

```json
{ "stage": "images-failed" }
```

##### `meta`

Отправляет найденные метаданные инструкции:

```json
{
  "title": "Название инструкции"
}
```

Возможные поля:

- `title`
- `slug`
- `description`
- `language`

##### `block`

Отправляет очередной нормализованный AI-блок:

```json
{
  "type": "paragraph",
  "text": "..."
}
```

Форма зависит от контракта `AiBlock`.

##### `done`

Финальное событие успешной генерации:

```json
{
  "blocksCount": 12,
  "imagesUsed": 4
}
```

##### `error`

Ошибка генерации:

```json
{
  "message": "Ошибка генерации"
}
```

#### Алгоритм

1. Проверяется tenant, роль и принадлежность инструкции tenant’у.
2. Читается файл из multipart form-data.
3. Проверяется размер файла и тип.
4. Для PDF:
   - извлекаются embedded images;
   - каждое изображение загружается в S3/MinIO;
   - для каждого изображения создаётся `MediaAsset`;
   - список URL передаётся в prompt как доступная image library.
5. В OpenAI Responses API отправляется:
   - `SYSTEM_PROMPT`;
   - файл или изображение;
   - JSON schema `RESPONSE_SCHEMA`.
6. Потоковый JSON-ответ разбирается через `StreamingBlockExtractor`.
7. По мере появления данных клиенту отправляются SSE-события `meta` и `block`.
8. После завершения AI-блоки конвертируются в TipTap-документ через `aiBlocksToTipTap`.
9. Инструкция обновляется:
   - `title`;
   - `description`;
   - `language`;
   - `draftContent`.

## Бизнес-логика

### Tenant isolation

Практически все операции сначала получают tenant-контекст через `requireTenant`, а затем проверяют принадлежность инструкции текущему tenant’у:

```ts
prisma.instruction.findFirst({
  where: { id, tenantId: tenant.id }
})
```

Это предотвращает доступ к инструкциям других tenant’ов.

### Роли доступа

В модуле используются следующие уровни доступа:

| Операция | Минимальная роль |
|---|---|
| Просмотр списка инструкций | authenticated tenant user |
| Просмотр инструкции | authenticated tenant user |
| Аналитика | authenticated tenant user |
| Feedback | authenticated tenant user |
| Список версий | authenticated tenant user |
| Создание инструкции | `EDITOR` |
| Обновление инструкции | `EDITOR` |
| Архивирование | `EDITOR` |
| Восстановление из архива | `EDITOR` |
| Публикация | `EDITOR` |
| Запрос ревью | `EDITOR` |
| Прикрепление sections/modules | `EDITOR` |
| Удаление sections/modules | `EDITOR` |
| Решение по ревью | `OWNER` |
| Удаление инструкции | `OWNER` |

### Лимит активных инструкций

При создании инструкции и восстановлении из архива проверяется тарифный лимит:

```ts
features.maxInstructions
```

Если значение не равно `-1`, считается количество инструкций tenant’а со статусом, отличным от `ARCHIVED`.

```ts
status: { not: 'ARCHIVED' }
```

Если лимит достигнут, возвращается ошибка `402`.

Архивные инструкции не учитываются в лимите, что позволяет пользователям освобождать слоты без удаления данных.

### Статусы инструкции

В коде используются следующие статусы:

- `DRAFT`
- `IN_REVIEW`
- `PUBLISHED`
- `ARCHIVED`

#### Переходы статусов

| Действие | Новый статус |
|---|---|
| Создание инструкции | не задаётся явно, вероятно default в Prisma schema |
| Запрос ревью | `IN_REVIEW` |
| Отклонение ревью | `DRAFT` |
| Публикация | `PUBLISHED` |
| Архивирование | `ARCHIVED` |
| Восстановление из архива | `DRAFT` |

### Публикация и версии

Публикация создаёт новую immutable-версию на основе текущего `draftContent`.

```ts
content: instruction.draftContent as object
```

Номер версии вычисляется как номер последней версии + 1:

```ts
const versionNumber = (lastVersion?.versionNumber ?? 0) + 1
```

Создание версии и обновление инструкции выполняются в транзакции.

### Approval workflow

Если тариф включает `approvalWorkflow`, а текущий пользователь не `OWNER`, публикация требует последнего ревью со статусом `APPROVED`.

```ts
if (features.approvalWorkflow && role !== 'OWNER') {
  const last = instruction.reviewRequests[0]
  if (!last || last.status !== 'APPROVED') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Требуется одобрение от владельца перед публикацией'
    })
  }
}
```

### Slug uniqueness

При создании и обновлении инструкции проверяется уникальность `slug` в пределах tenant’а через compound unique key:

```ts
tenantId_slug: {
  tenantId: tenant.id,
  slug
}
```

Для AI-генерации новой инструкции slug автоматически дополняется числовым суффиксом, если уже занят:

```ts
slug
slug-1
slug-2
```

### Архивирование

Архивирование не удаляет данные инструкции. Оно устанавливает:

```ts
status: 'ARCHIVED',
archivedAt: new Date()
```

При восстановлении инструкция возвращается в `DRAFT`, а `archivedAt` очищается.

### Analytics

Аналитика строится за последние 30 дней:

```ts
dayjs().subtract(30, 'day').toDate()
```

Считаются:

- общее количество `PAGE_VIEW`;
- количество уникальных `sessionId`;
- просмотры по странам;
- просмотры по типам устройств;
- средний `scrollDepth`;
- средний `durationMs`;
- feedback по типам;
- просмотры по дням.

Для группировки по дням используется raw SQL с PostgreSQL-функцией `date_trunc`.

### AI-генерация

Модуль поддерживает два сценария:

#### Создание новой инструкции из файла

`POST /api/instructions/generate-from-file`

- создаёт новую запись `Instruction`;
- сохраняет полный draft в БД;
- возвращает `aiBlocks` для UI-анимации.

#### Потоковая генерация для существующей инструкции

`POST /api/instructions/:id/generate-stream`

- работает через SSE;
- отправляет блоки по мере их получения от OpenAI;
- после завершения сохраняет итоговый TipTap-документ в `draftContent`.

### Работа с изображениями из PDF

В потоковом route для PDF выполняется извлечение изображений:

```ts
extractImagesFromPdf(file.data)
```

Каждое изображение:

1. получает ключ вида:

```ts
{tenantId}/ai/{shortId}.png
```

2. загружается через `uploadObject`;
3. сохраняется как `MediaAsset`;
4. передаётся в prompt как разрешённый URL.

AI может вставлять image-блоки только с URL из подготовленной библиотеки. Если модель возвращает image-блок с URL, которого нет в `imageLibrary`, такой блок отбрасывается.

## Зависимости

### Внутренние зависимости ManualOnline

- `~~/server/utils/tenant`
  - `requireTenant`
- `~~/server/utils/prisma`
  - `prisma`
- `~~/server/utils/plan`
  - `effectiveFeatures`
- `~~/server/utils/slug`
  - `generateShortId`
- `~~/server/utils/aiInstructionGenerator`
  - `generateInstructionFromFile`
  - `aiBlocksToTipTap`
  - `SYSTEM_PROMPT`
  - `RESPONSE_SCHEMA`
  - типы `AiBlock`, `AiInstruction`
- `~~/server/utils/streamingBlockExtractor`
  - `StreamingBlockExtractor`
  - `normalizeBlock`
- `~~/server/utils/pdfImageExtractor`
  - `extractImagesFromPdf`
- `~~/server/utils/storage`
  - `uploadObject`
- `~~/shared/schemas/instruction`
  - `instructionCreateSchema`
  - `instructionUpdateSchema`
  - `publishSchema`
- `~~/shared/types/instruction`
  - `EMPTY_DOC`

### Внешние зависимости

- `@prisma/client` / Prisma runtime — работа с PostgreSQL.
- PostgreSQL — хранение инструкций, версий, событий аналитики, feedback, media assets.
- OpenAI SDK — генерация инструкций через Responses API.
- S3/MinIO — хранение изображений, извлечённых из PDF.
- `dayjs` — расчёт временного диапазона аналитики.
- `zod` — валидация входящих payload’ов.

### Runtime config

Для потоковой OpenAI-генерации используется:

```ts
useRuntimeConfig().openai.apiKey
useRuntimeConfig().openai.model
```

Если `openai.apiKey` отсутствует, route возвращает ошибку `500`.

## Примеры использования

### Создание инструкции

```ts
const { instruction } = await $fetch('/api/instructions', {
  method: 'POST',
  body: {
    slug: 'coffee-machine-x100',
    title: 'Кофемашина X100',
    language: 'ru',
    productGroupId: 'pg_123'
  }
})
```

После создания инструкция получает пустой TipTap-документ в `draftContent`.

---

### Публикация инструкции

```ts
const { instruction } = await $fetch(`/api/instructions/${id}/publish`, {
  method: 'POST',
  body: {
    changelog: 'Добавлены шаги первичной настройки'
  }
})
```

В результате создаётся новая запись `InstructionVersion`, а инструкция получает статус `PUBLISHED`.

---

### Подключение reusable section

```ts
await $fetch(`/api/instructions/${instructionId}/sections`, {
  method: 'POST',
  body: {
    sectionId: 'sec_warranty',
    position: 10,
    slot: 'after'
  }
})
```

Если такая section уже прикреплена к инструкции, позиция и слот будут обновлены.

---

### SSE-подключение к потоковой генерации

У route используется `POST multipart/form-data`, поэтому типичный клиентский код создаёт `FormData` и читает поток вручную.

```ts
const form = new FormData()
form.append('file', file)

const res = await fetch(`/api/instructions/${instructionId}/generate-stream`, {
  method: 'POST',
  body: form
})

const reader = res.body?.getReader()
const decoder = new TextDecoder()

while (reader) {
  const { value, done } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value)
  console.log(chunk)
}
```

В потоке приходят события `progress`, `meta`, `block`, `done` или `error`.

## Замечания

- В `analytics.get.ts` группировка по дням использует PostgreSQL-specific SQL `date_trunc`, поэтому этот route завязан на PostgreSQL.
- Подсчёт `uniqueSessions` выполняется через `groupBy` по `sessionId` и затем `.length`; при большом количестве сессий это может быть менее эффективно, чем `COUNT(DISTINCT ...)`.
- В `feedback.get.ts` возвращаются только последние 100 feedback-записей; пагинации нет.
- В `generate-stream.post.ts` комментарий говорит об ограниченной параллельности загрузки изображений, но фактически используется обычный `Promise.all` без лимита concurrency.
- Ошибки создания `MediaAsset` при загрузке PDF-изображений подавляются через `.catch(() => {})`; файл может быть загружен в storage, но не попасть в медиатеку tenant’а.
- В `review.post.ts` при `decide` обновление `ReviewRequest` выполняется по `requestId` без явного ограничения по `instructionId` или `tenantId` в самом `update`. Перед этим проверяется только существование инструкции. Это место требует внимательной проверки модели доступа.
- При approval workflow публикация проверяет только последний `ReviewRequest` со статусом `APPROVED`; в коде не видно проверки, что draft не менялся после одобрения.
- При `APPROVED` в `review.post.ts` статус инструкции явно не меняется. Статус станет `PUBLISHED` только после отдельного вызова publish route.
- В `generate-from-file.post.ts` проверяются наличие файла и размер, но допустимые типы файлов явно не валидируются в самом route-файле.
- В потоковой генерации ошибки OpenAI отправляются как SSE-событие `error`, после чего соединение закрывается; HTTP-статус при ошибке внутри streaming-блока уже не меняется.

---
module: api-instructions
section: server
generated: 2026-05-08
files: 18
---