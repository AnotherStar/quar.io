# server-utils

## Назначение

`server-utils` — набор серверных утилит quar.io для Nuxt 3/Nitro, которые инкапсулируют общую backend-логику: аутентификацию, работу с tenant-доступом, Prisma, тарифные ограничения, S3/local storage, публичный рендеринг инструкций и генерацию инструкций через AI. Модуль используется API-роутами и серверными обработчиками как инфраструктурный слой между HTTP-запросами, базой данных, внешними сервисами и бизнес-правилами SaaS.

## Ключевые возможности

- Управление сессиями пользователей через httpOnly cookie `mo_session`.
- Хеширование и проверка паролей через Argon2id.
- Проверка авторизации пользователя и доступа к tenant с учётом ролей.
- In-memory TTL-кэш для сессий и membership-записей.
- Единый Prisma Client с измерением времени запросов через `AsyncLocalStorage`.
- Расчёт эффективных возможностей тарифа tenant’а.
- Проверка доступности модулей по тарифу.
- Сбор публичного payload для опубликованных инструкций.
- Фильтрация секций, модулей и branding по активному тарифу.
- Поддержка inline-ссылок TipTap на reusable sections и pluggable modules.
- Включение/отключение tenant-модулей через общий helper.
- Генерация структурированной инструкции из PDF/изображения через OpenAI.
- Конвертация AI-блоков в TipTap-документ.
- Инкрементальный парсинг streaming JSON-ответов AI.
- Извлечение растровых изображений из PDF.
- Загрузка файлов в S3/MinIO или локальное хранилище.
- Генерация pre-signed PUT URL для прямой загрузки в S3.
- Генерация slug и коротких идентификаторов инструкций.

## Архитектура

Модуль расположен в `server/utils` и состоит из 13 файлов. Каждый файл отвечает за отдельный серверный concern и экспортирует функции, используемые Nitro route handlers и другими серверными утилитами.

### Структура файлов

| Файл | Назначение |
|---|---|
| `aiInstructionGenerator.ts` | Генерация инструкции из PDF/изображения через OpenAI и преобразование результата в TipTap |
| `auth.ts` | Пароли, сессии, cookie-аутентификация, обязательная авторизация |
| `cache.ts` | Простой in-memory TTL-кэш для сессий и membership |
| `moduleAttached.ts` | Проверка, прикреплён ли модуль к опубликованной инструкции |
| `moduleToggle.ts` | Общий handler для включения/отключения tenant-модуля |
| `pdfImageExtractor.ts` | Извлечение изображений из PDF через `pdfjs-dist` и `@napi-rs/canvas` |
| `plan.ts` | Расчёт возможностей тарифа и trial-состояния |
| `prisma.ts` | Singleton Prisma Client и сбор timing-метрик запросов |
| `publicResolve.ts` | Сбор данных для публичного рендера инструкции |
| `slug.ts` | Генерация slug, short id и проверка зарезервированных slug |
| `storage.ts` | Абстракция загрузки файлов в S3 или локальное хранилище |
| `streamingBlockExtractor.ts` | Инкрементальный парсер AI JSON-ответа |
| `tenant.ts` | Проверка tenant-доступа и ролей пользователя |

### Взаимодействие компонентов

Типичный backend flow в quar.io выглядит так:

1. Nitro route получает HTTP-запрос.
2. Для защищённых dashboard-операций route вызывает `requireUser()` или `requireTenant()`.
3. `requireUser()` читает cookie `mo_session`, проверяет сессию в кэше или базе.
4. `requireTenant()` дополнительно проверяет membership пользователя в tenant и минимальную роль.
5. Бизнес-операция выполняется через общий `prisma`.
6. Если операция зависит от тарифа, используется `effectiveFeatures()` и `planAllowsModule()`.
7. Для публичного рендера инструкция собирается через `loadPublicByPath()` или `loadPublicByShortId()`.
8. Для медиа используется `uploadObject()` или `presignUpload()`.
9. Для AI-генерации инструкция создаётся через `generateInstructionFromFile()`, затем может быть преобразована в TipTap через `aiBlocksToTipTap()`.

### Prisma и кэширование

`prisma.ts` создаёт singleton `PrismaClient`. В dev-режиме клиент сохраняется в `globalThis.__prisma`, чтобы избежать создания множества соединений при HMR.

`cache.ts` создаёт singleton-кэши:

- `sessionCache` — кэш сессий по session id.
- `membershipCache` — кэш membership по ключу `userId:tenantId`.

Оба кэша имеют TTL 60 секунд и переживают HMR через `globalThis.__mo_caches`.

### Public renderer

`publicResolve.ts` собирает полный payload для публичной страницы инструкции:

- опубликованная версия инструкции;
- tenant и branding;
- slot-attached sections;
- slot-attached modules;
- inline refs из TipTap-документа;
- признак `planActive`.

При сборке учитываются тарифные ограничения: paid sections/modules могут быть исключены из публичного payload, если тариф неактивен или не разрешает соответствующую возможность.

## API / Интерфейс

В этом модуле нет Nitro route-файлов напрямую. Он предоставляет серверные функции и контракты, которые используются API-роутами проекта.

### `aiInstructionGenerator.ts`

#### Типы

```ts
export type AiBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet_list'; items: string[] }
  | { type: 'numbered_list'; items: string[] }
  | { type: 'safety'; severity: 'info' | 'warning' | 'danger'; text: string }
  | { type: 'image'; url: string; description: string }
  | { type: 'image_placeholder'; description: string }
```

```ts
export interface AiInstruction {
  title: string
  slug: string
  description: string
  language: string
  blocks: AiBlock[]
}
```

#### Экспортируемые элемент��

```ts
export const SYSTEM_PROMPT: string
export const RESPONSE_SCHEMA: object
```

`SYSTEM_PROMPT` задаёт правила преобразования исходного PDF/изображения в инструкцию. `RESPONSE_SCHEMA` используется для OpenAI Structured Outputs в strict JSON Schema-режиме.

```ts
export async function generateInstructionFromFile(file: {
  buffer: Buffer
  filename: string
  mimeType: string
}): Promise<AiInstruction>
```

Принимает PDF или изображение, отправляет файл в OpenAI Responses API и возвращает нормализованную AI-инструкцию.

```ts
export function aiBlocksToTipTap(ai: AiInstruction): TiptapDoc
```

Преобразует AI-блоки в TipTap-документ.

Особенности преобразования:

| AI block | TipTap node |
|---|---|
| `heading` | `heading` |
| `paragraph` | `paragraph` |
| `bullet_list` | `bulletList` |
| `numbered_list` | `orderedList` |
| `safety` | `safetyBlock` |
| `image` | `image` |
| `image_placeholder` | `safetyBlock` с `severity: 'info'` и префиксом `📷` |

### `auth.ts`

```ts
export async function hashPassword(password: string): Promise<string>
```

Хеширует пароль через Argon2id.

```ts
export async function verifyPassword(hash: string, password: string): Promise<boolean>
```

Проверяет пароль. При ошибке возвращает `false`.

```ts
export async function createSession(event: H3Event, userId: string)
```

Создаёт запись `session` в базе и устанавливает cookie `mo_session`.

Параметры cookie:

- `httpOnly: true`
- `sameSite: 'lax'`
- `secure: true` только в production
- `path: '/'`
- срок жизни: 30 дней

```ts
export async function destroySession(event: H3Event): Promise<void>
```

Удаляет сессию из базы, очищает `sessionCache` и удаляет cookie.

```ts
export async function getSessionUser(event: H3Event)
```

Возвращает пользователя текущей сессии или `null`.

```ts
export function invalidateUserCache(userId: string): void
```

Инвалидирует cached session и membership-записи, относящиеся к пользователю.

```ts
export async function requireUser(event: H3Event)
```

Возвращает авторизованного пользователя или выбрасывает `401 Unauthorized`.

### `cache.ts`

```ts
export class TtlCache<K, V>
```

Простой TTL-кэш с ограничением размера.

Основные методы:

```ts
get(key: K): V | undefined
set(key: K, value: V): void
delete(key: K): void
clear(): void
```

Экспортируемые singleton-кэши:

```ts
export const sessionCache: TtlCache<string, any>
export const membershipCache: TtlCache<string, any>
```

TTL по умолчанию — 60 секунд.

### `moduleAttached.ts`

```ts
export async function isModuleAttachedToPublished(
  instructionId: string,
  moduleCode: string
): Promise<boolean>
```

Проверяет, подключён ли модуль с указанным `moduleCode` к опубликованной инструкции.

Проверяются два варианта подключения:

1. Slot-based attachment через `InstructionModuleAttachment`.
2. Inline node `moduleRef` внутри опубликованного TipTap-документа.

### `moduleToggle.ts`

```ts
export async function toggleModule(event: H3Event, code: string)
```

Общий helper для `PUT /api/modules/<code>`.

Валидирует body через zod-схему:

```ts
const schema = z.object({
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.any()).default({})
})
```

Требует tenant-доступ с минимальной ролью `EDITOR`.

Возвращает:

```ts
{
  tenantConfig: TenantModuleConfig
}
```

### `pdfImageExtractor.ts`

```ts
export interface ExtractedImage {
  page: number
  buffer: Buffer
  width: number
  height: number
  hash: string
}
```

```ts
export async function extractImagesFromPdf(buf: Buffer): Promise<ExtractedImage[]>
```

Извлекает встроенные растровые изображения из PDF.

Используемые ограничения:

- минимальный размер изображения: `120x120`;
- максимум изображений: `30`;
- дедупликация по SHA-1 хэшу PNG-буфера;
- повторяющиеся изображения на странице пропускаются по object reference.

### `plan.ts`

#### Контракт features

```ts
export interface PlanFeatures {
  maxInstructions: number
  customSections: boolean
  modules: string[]
  customDomain: boolean
  analyticsRetentionDays: number
  teamMembers: number
  approvalWorkflow: boolean
}
```

`maxInstructions: -1` означает отсутствие лимита.

#### FREE features

```ts
export const FREE_FEATURES: PlanFeatures = {
  maxInstructions: 5,
  customSections: false,
  modules: [],
  customDomain: false,
  analyticsRetentionDays: 30,
  teamMembers: 1,
  approvalWorkflow: false
}
```

#### Функции

```ts
export function effectiveFeatures(
  tenant: Tenant & { subscription: (Subscription & { plan: Plan }) | null }
): PlanFeatures
```

Возвращает эффективные возможности tenant’а с учётом статуса подписки.

```ts
export function trialState(
  sub: (Subscription & { plan: Plan }) | null
): {
  isTrialing: boolean
  daysLeft: number | null
  trialUsedAt: Date | null
}
```

Возвращает состояние trial-периода.

```ts
export function planAllowsModule(features: PlanFeatures, moduleCode: string): boolean
```

Проверяет, доступен ли модуль на текущем наборе features.

### `prisma.ts`

```ts
export const prisma: PrismaClient
```

Единый Prisma Client для серверного кода.

```ts
export function resetPrismaTimings(): void
```

Создаёт новый bucket для сбора timing-метрик в текущем async context.

```ts
export function getPrismaTimings(): {
  queries: Array<{ ms: number; target: string }>
}
```

Возвращает список Prisma-запросов, выполненных в текущем async context.

### `publicResolve.ts`

#### Public payload

```ts
export interface PublicRenderPayload {
  instruction: {
    id: string
    slug: string
    title: string
    description: string | null
    language: string
    publishedAt: Date | null
    versionId: string | null
    versionNumber: number | null
    content: unknown
  }
  tenant: {
    name: string
    slug: string
    branding: {
      primaryColor: string | null
      logoUrl: string | null
      fontFamily: string | null
    } | null
  }
  sections: Array<{
    id: string
    name: string
    slot: string
    position: number
    content: unknown
  }>
  modules: Array<{
    attachmentId: string
    code: string
    name: string
    slot: string
    position: number
    config: Record<string, unknown>
  }>
  refs: {
    sections: Record<string, ResolvedSectionRef>
    modules: Record<string, ResolvedModuleRef>
  }
  planActive: boolean
}
```

#### Функции

```ts
export async function loadPublicByPath(
  tenantSlug: string,
  instructionSlug: string
): Promise<PublicRenderPayload | null>
```

Загружает публичную инструкцию по `tenantSlug` и `instructionSlug`.

```ts
export async function loadPublicByShortId(
  shortId: string
): Promise<PublicRenderPayload | null>
```

Загружает публичную инструкцию по короткому идентификатору.

### `slug.ts`

```ts
export const generateShortId: () => string
```

Генерирует короткий идентификатор длиной 10 си��волов из алфавита:

```txt
0123456789abcdefghijklmnopqrstuvwxyz
```

```ts
export function slugify(input: string): string
```

Создаёт slug:

- переводит строку в lowercase;
- обрезает пробелы;
- разрешает латиницу, цифры и кириллицу;
- заменяет прочие группы символов на `-`;
- обрезает по краям `-`;
- ограничивает длину до 64 символов.

```ts
export function reservedSlugs(): Set<string>
export function isReservedSlug(slug: string): boolean
```

Читает список зарезервированных slug из `runtimeConfig.reservedSlugs`.

### `storage.ts`

```ts
export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string>
```

Загружает объект в configured storage и возвращает публичный URL.

Поддерживаются драйверы:

- `s3`;
- `local`.

Для `s3` используется `PutObjectCommand`, bucket и public URL из runtime config.

Для `local` файл записывается в `cfg.storage.localDir`, а URL возвращается в формате:

```txt
/uploads/<key>
```

```ts
export interface PresignedUpload {
  uploadUrl: string
  publicUrl: string
  key: string
  headers: Record<string, string>
}
```

```ts
export async function presignUpload(
  key: string,
  contentType: string,
  expiresInSec = 60 * 5
): Promise<PresignedUpload | null>
```

Создаёт pre-signed PUT URL для S3. Для local-драйвера возвращает `null`.

### `streamingBlockExtractor.ts`

```ts
export interface ExtractorOutput {
  newBlocks: any[]
  newMeta: Partial<{
    title: string
    slug: string
    description: string
    language: string
  }>
}
```

```ts
export class StreamingBlockExtractor {
  feed(delta: string): ExtractorOutput
  finalize(): { full: any | null }
}
```

Инкрементально принимает текстовые delta-фрагменты JSON-ответа AI и отдаёт:

- новые top-level объекты из массива `blocks`;
- завершённые meta-поля `title`, `slug`, `description`, `language`.

```ts
export function normalizeBlock(raw: any): AiBlock | null
```

Нормализует один сырой AI-блок в `AiBlock`.

### `tenant.ts`

```ts
export async function requireTenant(
  event: H3Event,
  opts: { minRole?: Role } = {}
)
```

Проверяет пользователя и tenant-доступ. Tenant id ищется в следующем порядке:

1. header `x-tenant-id`;
2. route param `tenantId`;
3. query param `tenantId`.

Возвращает:

```ts
{
  user,
  tenant,
  role,
  membership
}
```

Ошибки:

- `401 Unauthorized`, если пользователь не авторизован;
- `400 Tenant id required`, если tenant id не передан;
- `403 No access to tenant`, если membership не найден;
- `403 Insufficient role`, если роль ниже требуемой.

```ts
export function roleAtLeast(role: Role, min: Role): boolean
```

Проверяет роль по порядку:

```ts
VIEWER < EDITOR < OWNER
```

```ts
export function invalidateTenantMembershipCache(tenantId: string): void
```

Очищает membership-кэш для указанного tenant.

## Бизнес-логика

### Аутентификация и сессии

Сессии хранятся в базе данных через Prisma-модель `session`. На клиент передаётся только id сессии в httpOnly cookie `mo_session`.

Срок жизни сессии — 30 дней.

При каждом запросе `getSessionUser()`:

1. читает cookie;
2. ищет сессию в `sessionCache`;
3. если кэша нет — делает запрос в БД;
4. проверяет `expiresAt`;
5. кэширует пользователя до 60 секунд.

Если сессия истекла, пользователь считается неавторизованным.

### Membership и роли

Tenant-доступ определяется по membership пользователя. Для оптимизации membership-записи кэшируются на 60 секунд.

Роли имеют фиксированный порядок:

```ts
VIEWER = 0
EDITOR = 1
OWNER = 2
```

Если handler требует `minRole`, роль пользователя должна быть не ниже указанной.

Например, `toggleModule()` требует минимум `EDITOR`.

### Инвалидация кэша

Явная инвалидация предусмотрена для критичных сценариев:

- `destroySession()` удаляет session-кэш для текущей сессии;
- `invalidateUserCache(userId)` очищает session и membership-кэш пользователя;
- `invalidateTenantMembershipCache(tenantId)` очищает membership-кэш tenant’а.

В комментариях к коду явно указано, что изменения роли, плана или logout могут быть видны с задержкой до TTL, если не была вызвана явная инвалидация.

### Тарифы и features

`effectiveFeatures()` реализует ключевое правило SaaS:

> Если подписка не активна, tenant откатывается на `FREE_FEATURES`, данные при этом остаются в базе.

Это важно для сценария, когда публичные ссылки продолжают существовать после неоплаты, но paid-функции не рендерятся.

Подписка считается live, если статус:

- `active`;
- `trialing`.

Если `currentPeriodEnd` прошёл, используются бесплатные возможности.

### Trial-логика

Для `trialing` применяется paid plan, но `maxInstructions` ограничивается free-лимитом.

Причина указана в коде: после окончания trial tenant вернётся на free-тариф, и создание большего количества инструкций во время trial привело бы к необходимости скрывать часть инструкций. Ограничение предотвращает этот сценарий.

### Public rendering

`publicResolve.ts` возвращает payload только если инструкция:

- найдена;
- имеет статус `PUBLISHED`;
- имеет `publishedVersion`.

Если инструкция не опубликована или нет опубликованной версии, возвращается `null`.

#### Секции

Slot-attached reusable sections включаются только если:

```ts
features.customSections === true
```

Inline `sectionRef` также резолвятся только при `customSections: true`.

#### Модули

Slot-attached modules включаются, если:

- tenant module config включён (`enabled`);
- модуль разрешён тарифом (`planAllowsModule()`).

Inline `moduleRef` резолвятся по тем же правилам:

- config существует;
- config принадлежит тому же tenant;
- config включён;
- module code доступен по тарифу.

#### Branding

Branding возвращается только если:

- подписка tenant существует;
- статус подписки строго `active`;
- есть хотя бы одно branding-поле.

При trialing branding не считается активным, потому что `planActive` вычисляется только как `subscription.status === 'active'`.

### Проверка подключения модуля

`isModuleAttachedToPublished()` проверяет только опубликованные инструкции.

Алгоритм:

1. Загружает инструкцию с `publishedVersion` и module attachments.
2. Если инструкция не опубликована — возвращает `false`.
3. Проверяет slot attachments.
4. Если slot attachment не найден, проходит по опубликованному TipTap-документу.
5. Собирает inline `moduleRef.attrs.tenantModuleConfigId`.
6. Проверяет, есть ли среди них enabled config с нужным `moduleCode`.

### AI-генерация инструкции

`generateInstructionFromFile()` поддерживает только:

- изображения (`mimeType.startsWith('image/')`);
- PDF (`application/pdf` или filename с `.pdf`).

Если передан другой тип файла, выбрасывается ошибка `400`.

Если `OPENAI_API_KEY` не настроен, выбрасывается ошибка `500`.

OpenAI вызывается через Responses API с:

- system prompt на русском языке;
- входом `input_image` или `input_file`;
- strict JSON Schema output.

Ответ парсится как JSON. Если ответ пустой или невалидный, выбрасывается `502`.

После парсинга выполняется нормализация:

- `title` trim;
- `slug` приводится к lowercase, разрешает только `a-z`, `0-9`, `-`, максимум 60 символов;
- пустой slug заменяется на `instruction`;
- пустой `language` заменяется на `ru`;
- списки очищаются от пустых элементов;
- для safety без severity используется `warning`;
- для image placeholder без описания используется текст блока или `Иллюстрация`.

### AI streaming parsing

`StreamingBlockExtractor` рассчитан на JSON-ответ формы:

```json
{
  "title": "...",
  "slug": "...",
  "description": "...",
  "language": "...",
  "blocks": [
    { "...": "..." }
  ]
}
```

Он не является универсальным JSON parser. Его задача — как можно раньше извлекать завершённые объекты из массива `blocks`, чтобы сервер мог стримить блоки клиенту до окончания полного ответа AI.

Meta-поля извлекаются регулярными выражениями по мере появления завершённых строк.

### PDF image extraction

`extractImagesFromPdf()` использует низкоуровневый operator-list API `pdfjs-dist`.

Извлекаются операции:

- `paintImageXObject`;
- `paintImageXObjectRepeat`;
- `paintInlineImageXObject`.

Каждое изображение перекодируется в PNG через `@napi-rs/canvas`.

Поддерживаемые форматы image object:

- `kind === 3` — RGBA;
- `kind === 2` — RGB;
- `kind === 1` — grayscale.

Мелкие изображения пропускаются, чтобы не сохранять декоративные элементы, логотипы и маски.

### Storage

Storage работает в двух режимах.

#### S3

При `cfg.storage.driver === 's3'`:

- объект загружается в bucket через AWS SDK;
- публична�� ссылка собирается как `${cfg.s3.publicUrl}/${key}`;
- доступен pre-signed PUT URL для прямой загрузки из браузера.

S3 client настроен с:

```ts
forcePathStyle: true
requestChecksumCalculation: 'WHEN_REQUIRED'
responseChecksumValidation: 'WHEN_REQUIRED'
```

Это сделано для совместимости с S3-compatible провайдерами, включая MinIO и R2.

#### Local

При local-драйвере:

- файл пишется в `cfg.storage.localDir`;
- директории создаются рекурсивно;
- URL возвращается как `/uploads/<key>`;
- pre-signed upload недоступен и возвращает `null`.

## Зависимости

### Внутренние зависимости quar.io

- `~~/shared/types/instruction` — типы `TiptapDoc`, `TiptapNode`.
- Prisma schema/models:
  - `User`;
  - `Session`;
  - `Tenant`;
  - `Membership`;
  - `Plan`;
  - `Subscription`;
  - `Instruction`;
  - `InstructionVersion`;
  - `Section`;
  - `InstructionSectionAttachment`;
  - `ModuleManifest`;
  - `TenantModuleConfig`;
  - `InstructionModuleAttachment`.
- Runtime config:
  - `openai.apiKey`;
  - `openai.model`;
  - `reservedSlugs`;
  - `storage.driver`;
  - `storage.localDir`;
  - `s3.region`;
  - `s3.endpoint`;
  - `s3.accessKey`;
  - `s3.secretKey`;
  - `s3.bucket`;
  - `s3.publicUrl`.

### Внешние библиотеки и сервисы

- `@prisma/client` — доступ к PostgreSQL.
- `h3` — server event, cookie, error helpers.
- `argon2` — хеширование и проверка паролей.
- `openai` — OpenAI Responses API.
- `zod` — валидация body для module toggle.
- `nanoid` — генерация short id.
- `@aws-sdk/client-s3` — загрузка файлов в S3.
- `@aws-sdk/s3-request-presigner` — генерация pre-signed URL.
- `pdfjs-dist` — чтение PDF и operator-list API.
- `@napi-rs/canvas` — перекодирование изображений в PNG.
- Node.js modules:
  - `node:async_hooks`;
  - `node:crypto`;
  - `node:fs/promises`;
  - `node:path`.

### Внешние сервисы

- PostgreSQL через Prisma.
- OpenAI API.
- S3-compatible storage:
  - AWS S3;
  - MinIO;
  - потенциально другие совместимые провайдеры.

## Примеры использования

### Защищённый tenant API handler

```ts
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const { tenant, user, role } = await requireTenant(event, {
    minRole: 'EDITOR'
  })

  const instructions = await prisma.instruction.findMany({
    where: { tenantId: tenant.id },
    orderBy: { updatedAt: 'desc' }
  })

  return {
    tenantId: tenant.id,
    userId: user.id,
    role,
    instructions
  }
})
```

### Генерация инструкции из файла и преобразование в TipTap

```ts
import {
  generateInstructionFromFile,
  aiBlocksToTipTap
} from '~~/server/utils/aiInstructionGenerator'

const ai = await generateInstructionFromFile({
  buffer,
  filename: 'manual.pdf',
  mimeType: 'application/pdf'
})

const content = aiBlocksToTipTap(ai)

const instructionDraft = {
  title: ai.title,
  slug: ai.slug,
  description: ai.description,
  language: ai.language,
  content
}
```

### Загрузка файла в storage

```ts
import { uploadObject } from '~~/server/utils/storage'

const publicUrl = await uploadObject(
  `tenants/${tenantId}/instructions/${instructionId}/cover.png`,
  imageBuffer,
  'image/png'
)
```

### Проверка features тарифа

```ts
import { effectiveFeatures, planAllowsModule } from '~~/server/utils/plan'

const features = effectiveFeatures(tenant)

if (!planAllowsModule(features, 'feedback')) {
  throw createError({
    statusCode: 403,
    statusMessage: 'Module is not available on current plan'
  })
}
```

## Замечания

### In-memory cache не распределённый

`sessionCache` и `membershipCache` живут в памяти одного Nuxt server process. В multi-instance окружении кэш не синхронизируется между инстансами.

Последствия:

- logout или role change на одном инстансе не очищает кэш другого инстанса;
- изменения могут быть видны с задержкой до TTL;
- для production с несколькими инстансами может потребоваться Redis или другой shared cache.

### Доступ к private map кэша

`invalidateUserCache()` и `invalidateTenantMembershipCache()` обращаются к `(cache as any).map.entries()`, хотя `map` объявлен как private field TypeScript-класса.

Это работает на уровне runtime, потому что используется обычное private-свойство TypeScript, а не JavaScript `#private`, но является хрупкой реализационной деталью.

### AI JSON Schema использует flat block shape

OpenAI strict schema описывает блоки как объект со всеми возможными полями:

```ts
required: ['type', 'level', 'text', 'items', 'severity', 'description', 'url']
```

Это сделано из-за ограниченной поддержки discriminated union/`oneOf` в strict output. После получения ответа выполняется нормализация по `type`.

### Извлечение изображений из PDF не интегрировано в AI v1

В комментарии `aiInstructionGenerator.ts` явно указано, что извлечение изображений из PDF не реализовано в v1 AI-generation flow. Модель должна вставлять `image_placeholder`, которые затем отображаются как информационные `safetyBlock`.

При этом отдельная утилита `pdfImageExtractor.ts` уже существует и умеет извлекать изображения из PDF, но в показанном коде она не используется внутри `generateInstructionFromFile()`.

### Streaming parser специализированный

`StreamingBlockExtractor` не является полноценным streaming JSON parser. Он заточен под конкретную структуру AI-ответа с top-level массивом `blocks`. Изменение формата ответа OpenAI может потребовать доработки extractor’а.

### Local storage требует отдельного route для выдачи файлов

`storage.ts` возвращает local URL вида `/uploads/<key>`. В комментарии указано, что файлы обслуживаются через route:

```txt
server/routes/uploads/[...path].get.ts
```

Этот route не входит в данный модуль, но необходим для работы local-драйвера.

### Public branding активен только при `active`

В `publicResolve.ts` paid features для `trialing` могут быть доступны через `effectiveFeatures()`, но branding рассчитывается через отдельный флаг:

```ts
const planActive =
  !!instruction.tenant.subscription &&
  instruction.tenant.subscription.status === 'active'
```

Поэтому branding не будет возвращён для trial-подписки.

### `toggleModule()` учитывает только tenant-доступ, но не тариф

`toggleModule()` проверяет наличие module manifest и роль `EDITOR`, затем upsert’ит tenant config. Проверка, разрешён ли модуль текущим тарифом, в этой функции не выполняется. Фильтрация по тарифу происходит при публичном рендере через `planAllowsModule()`.

### Потенциальные ограничения PDF extraction

`pdfImageExtractor.ts` пропускает ошибки получения operator list и отдельных image object. Это повышает устойчивость, но может приводить к неполному набору изображений без явного сообщения пользователю.

Также установлен timeout 5 секунд на получение page object.

---
module: server-utils
section: server
generated: 2026-05-08
files: 13
---