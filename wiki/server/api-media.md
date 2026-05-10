# api-media

## Назначение

Модуль `api-media` реализует Nitro API routes для загрузки медиафайлов в quar.io. Он поддерживает два сценария загрузки: прямую загрузку из браузера в S3/MinIO через presigned URL и fallback-загрузку через Nuxt-сервер в локальное/абстрактное хранилище. После успешной загрузки модуль создаёт запись `MediaAsset` в базе данных для учёта, очистки и контроля квот.

## Ключевые возможности

- Выдача presigned PUT URL для прямой загрузки файла из браузера в S3-совместимое хранилище.
- Поддержка fallback-сценария загрузки через `POST /api/media/upload`, если presigned upload недоступен.
- Создание записи `MediaAsset` после подтверждения успешной прямой загрузки.
- Создание записи `MediaAsset` сразу после серверной загрузки через multipart form-data.
- Проверка tenant-контекста и минимальной роли пользователя `EDITOR`.
- Ограничение размера файла до `50 MB`.
- Валидация входных данных через `zod`.
- Изоляция файлов по tenant-префиксу в storage key.

## Архитектура

Модуль состоит из трёх Nitro API route-файлов в каталоге:

```text
server/api/media/
├── sign.post.ts
├── confirm.post.ts
└── upload.post.ts
```

### `server/api/media/sign.post.ts`

Отвечает за подготовку загрузки файла.

Основной сценарий:

1. Проверяет tenant и права пользователя через `requireTenant(event, { minRole: 'EDITOR' })`.
2. Валидирует JSON-body с помощью `zod`.
3. Генерирует storage key в формате:

```text
{tenant.id}/{shortId}.{ext}
```

4. Вызывает `presignUpload(key, contentType)`.
5. Если presigned URL доступен — возвращает данные для прямого PUT-запроса в S3/MinIO.
6. Если presigned URL недоступен — возвращает `{ fallback: true }`, чтобы клиент использовал серверную загрузку через `/api/media/upload`.

Запись в базе данных на этом этапе не создаётся. Это сделано намеренно, чтобы не появлялись orphan-зап��си `MediaAsset` при неудачной прямой загрузке в S3.

### `server/api/media/confirm.post.ts`

Используется после успешного direct PUT upload в S3/MinIO.

Основной сценарий:

1. Проверяет tenant и права пользователя с минимальной ролью `EDITOR`.
2. Валидирует тело запроса.
3. Проверяет, что `key` начинается с `${tenant.id}/`.
4. Создаёт запись `MediaAsset` в PostgreSQL через Prisma.
5. Возвращает минимальные данные созданного asset: `id`, `url`, `mimeType`.

Этот endpoint является финальным шагом direct-upload flow.

### `server/api/media/upload.post.ts`

Fallback endpoint для загрузки файла через Nuxt/Nitro сервер.

Основной сценарий:

1. Проверяет tenant и роль пользователя.
2. Читает multipart form-data через `readMultipartFormData(event)`.
3. Ищет часть формы с именем `file`.
4. Проверяет наличие файла и его размер.
5. Генерирует storage key.
6. Загружает файл через `uploadObject(...)`.
7. Создаёт запись `MediaAsset` в базе данных.
8. Возвращает данные созданного asset.

Этот сценарий используется, когда прямой presigned upload невозможен, например при локальном storage driver.

## API / Интерфейс

### `POST /api/media/sign`

Создаёт параметры для загрузки файла.

#### Request body

```ts
{
  filename: string
  contentType: string
  sizeBytes: number
}
```

#### Валидация

```ts
filename: string().min(1).max(200)
contentType: string().min(1).max(200)
sizeBytes: number().int().min(1).max(50 * 1024 * 1024)
```

Максимальный размер файла: `50 MB`.

#### Возможный ответ при S3-compatible storage

```ts
{
  fallback: false,
  // поля из presignUpload(...)
  // например URL/headers/key — точный контракт зависит от server/utils/storage
  sizeBytes: number,
  contentType: string
}
```

Точный набор полей, возвращаемых `presignUpload`, в предоставленном коде не раскрыт.

#### Возможный ответ при fallback-сценарии

```ts
{
  fallback: true
}
```

#### Ошибки

- Ошибка авторизации/доступа — если пользователь не принадлежит tenant или имеет роль ниже `EDITOR`.
- Ошибка валидации тела запроса — при некорректных `filename`, `contentType` или `sizeBytes`.

---

### `POST /api/media/confirm`

Подтверждает успешную прямую загрузку в S3/MinIO и создаёт запись `MediaAsset`.

#### Request body

```ts
{
  key: string
  url: string
  mimeType: string
  sizeBytes: number
}
```

#### Валидация

```ts
key: string().min(1).max(500)
url: string().url()
mimeType: string().min(1).max(200)
sizeBytes: number().int().min(1).max(50 * 1024 * 1024)
```

#### Дополнительная проверка

```ts
body.key.startsWith(`${tenant.id}/`)
```

Если `key` не принадлежит текущему tenant, возвращается ошибка:

```ts
{
  statusCode: 400,
  statusMessage: "Key prefix mismatch"
}
```

#### Response

```ts
{
  asset: {
    id: string
    url: string
    mimeType: string
  }
}
```

---

### `POST /api/media/upload`

Загружает файл через сервер в fallback-режиме.

#### Request

Тип запроса: `multipart/form-data`.

Ожидаемое поле:

```text
file
```

#### Проверки

- Файл должен существовать.
- У файла должно быть имя файла.
- Размер файла не должен превышать `50 MB`.

#### Ошибка при отсутствии файла

```ts
{
  statusCode: 400,
  statusMessage: "No file"
}
```

#### Ошибка при превышении размера

```ts
{
  statusCode: 413,
  statusMessage: "File too large"
}
```

#### Response

```ts
{
  asset: {
    id: string
    url: string
    mimeType: string
  }
}
```

## Бизнес-логика

### Доступ только для редакторов

Все endpoints требуют tenant-контекст и минимальную роль:

```ts
minRole: 'EDITOR'
```

Это означает, что загружать медиафайлы могут только пользователи, которым разрешено редактировать контент в рамках tenant.

### Изоляция данных по tenant

Storage key всегда формируется с tenant-префиксом:

```ts
const key = `${tenant.id}/${generateShortId()}.${ext}`
```

Для direct upload дополнительно проверяется, что клиент не пытается подтвердить чужой ключ:

```ts
if (!body.key.startsWith(`${tenant.id}/`)) {
  throw createError({ statusCode: 400, statusMessage: 'Key prefix mismatch' })
}
```

Это защищает от ситуации, когда пользователь одного tenant пытается создать `MediaAsset` для объекта, принадлежащего другому tenant.

### Двухшаговая direct upload-схема

Для S3/MinIO используется двухшаговый процесс:

1. `POST /api/media/sign` — получить presigned PUT URL.
2. Браузер напрямую отправляет файл в S3/MinIO.
3. `POST /api/media/confirm` — подтвердить успешную загрузку и создать запись в БД.

Запись `MediaAsset` не создаётся на этапе `sign`, чтобы избежать записей для файлов, которые фактически не были загружены.

### Fallback upload-схема

Если `presignUpload(...)` возвращает пустой результат, клиент должен использовать:

```text
POST /api/media/upload
```

В этом режиме файл проходит через Nitro-сервер, а запись `MediaAsset` создаётся сразу после успешного вызова `uploadObject(...)`.

### Ограничение размера файла

Во всех сценариях установлен лимит:

```ts
50 * 1024 * 1024
```

То есть максимальный размер файла — `50 MB`.

В `sign.post.ts` и `confirm.post.ts` лимит проверяется через `zod`, а в `upload.post.ts` — по фактическому размеру `file.data.length`.

### MIME type

В direct upload-сценарии MIME type передаётся клиентом:

```ts
contentType
mimeType
```

В fallback-сценарии используется MIME type из multipart-части:

```ts
file.type ?? 'application/octet-stream'
```

Если тип файла не определён, применяется значение по умолчанию:

```text
application/octet-stream
```

### Расширение файла

Расширение извлекается из исходного имени файла.

В `sign.post.ts` расширение дополнительно очищается:

```ts
replace(/[^a-z0-9]/g, '')
```

Если расширение не найдено, используется:

```text
bin
```

В `upload.post.ts` расширение приводится к lower-case, но не проходит дополнительную очистку регулярным выражением.

## Зависимости

### Внутренние зависимости quar.io

- `~~/server/utils/tenant`
  - `requireTenant(...)`
  - Проверяет tenant-контекст, пользователя и минимальную роль.

- `~~/server/utils/prisma`
  - `prisma`
  - Используется для создания записей `MediaAsset`.

- `~~/server/utils/storage`
  - `presignUpload(...)`
  - Генерирует параметры для direct upload в S3/MinIO или возвращает fallback-сценарий.
  - `uploadObject(...)`
  - Загружает файл через серверный storage driver.

- `~~/server/utils/slug`
  - `generateShortId()`
  - Используется для генерации уникальной части имени объекта в хранилище.

### Внешние библиотеки и сервисы

- `zod`
  - Валидация JSON-body для endpoints `sign` и `confirm`.

- Prisma
  - Работа с таблицей/моделью `MediaAsset`.

- PostgreSQL
  - Хранение записей о медиафайлах через Prisma.

- S3/MinIO или другой storage backend
  - Хранение бинарных объектов.
  - Direct upload через presigned URL при поддержке storage driver.

- Nitro / H3
  - `defineEventHandler`
  - `readValidatedBody`
  - `readMultipartFormData`
  - `createError`

## Примеры использования

### Direct upload через presigned URL

Пример клиентского сценария:

```ts
const signResult = await $fetch('/api/media/sign', {
  method: 'POST',
  body: {
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size
  }
})

if (!signResult.fallback) {
  // Конкретные поля presigned-ответа зависят от реализации presignUpload.
  // Ниже показан общий сценарий: браузер делает PUT напрямую в storage.
  await fetch(signResult.url, {
    method: 'PUT',
    headers: {
      'Content-Type': signResult.contentType
    },
    body: file
  })

  const confirmed = await $fetch('/api/media/confirm', {
    method: 'POST',
    body: {
      key: signResult.key,
      url: signResult.publicUrl,
      mimeType: signResult.contentType,
      sizeBytes: signResult.sizeBytes
    }
  })

  console.log(confirmed.asset)
}
```

> Примечание: точные поля `url`, `key`, `publicUrl` зависят от контракта `presignUpload(...)`, который не раскрыт в предоставленном коде.

### Fallback upload через сервер

```ts
const form = new FormData()
form.append('file', file)

const result = await $fetch('/api/media/upload', {
  method: 'POST',
  body: form
})

console.log(result.asset.id)
console.log(result.asset.url)
```

### Комбинированный сценарий

```ts
const signResult = await $fetch('/api/media/sign', {
  method: 'POST',
  body: {
    filename: file.name,
    contentType: file.type || 'application/octet-stream',
    sizeBytes: file.size
  }
})

if (signResult.fallback) {
  const form = new FormData()
  form.append('file', file)

  const uploaded = await $fetch('/api/media/upload', {
    method: 'POST',
    body: form
  })

  return uploaded.asset
}

// Иначе клиент должен выполнить direct PUT в storage,
// а затем вызвать POST /api/media/confirm.
```

## Замечания

- Контракт ответа `presignUpload(...)` в предоставленном коде не раскрыт. Известно только, что результат расширяется в response `POST /api/media/sign`.
- В `sign.post.ts` расширение файла очищается регулярным выражением, а в `upload.post.ts` — нет. Это может привести к разному поведению при fallback-загрузке и direct upload.
- MIME type и размер файла при direct upload передаются клиентом. На уровне показанного кода не видно серверной проверки фактического объекта в S3/MinIO перед созданием `MediaAsset`.
- В `confirm.post.ts` проверяется только tenant-префикс `key`, но не проверяется, существует ли объект в storage.
- Нет явной дедупликации `MediaAsset` по `key`; если модель Prisma не содержит уникального ограничения, повторный `confirm` может создать несколько записей для одного storage object.
- В `upload.post.ts` файл полностью находится в памяти как `file.data`; для файлов до `50 MB` это допустимо, но при высокой конкуренции может увеличивать потребление памяти Nitro-сервером.
- Логика квот упомянута в комментарии как причина создания `MediaAsset`, но в представленном коде проверки тарифов или доступного лимита storage не реализованы.

---
module: api-media
section: server
generated: 2026-05-08
files: 3
---