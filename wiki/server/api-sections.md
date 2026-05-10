# api-sections

## Назначение

Модуль `api-sections` реализует Nitro API routes для управления reusable/custom sections в quar.io. Он предоставляет CRUD-операции над секциями в рамках текущего tenant’а и используется дашбордом/редактором для создания, просмотра, обновления и удаления переиспользуемых блоков контента.

## Ключевые возможности

- Получение списка секций текущего tenant’а.
- Получение одной секции по `id`.
- Создание новой секции с валидацией входных данных.
- Обновление имени, описания и контента секции.
- Удаление секции.
- Проверка принадлежности секции текущему tenant’у.
- Ограничение операций записи ролью не ниже `EDITOR`.
- Проверка тарифной возможности `customSections` при создании секции.
- Использование TipTap/JSON-подобного контента без строгой схемы через `z.any()`.

## Архитектура

Модуль представлен набором серверных Nitro route-файлов в директории:

```text
server/api/sections/
├── index.get.ts
├── index.post.ts
└── [id]/
    ├── [id].get.ts
    ├── [id].patch.ts
    └── [id].delete.ts
```

> В исходном коде файлы находятся как `server/api/sections/[id].get.ts`, `server/api/sections/[id].patch.ts`, `server/api/sections/[id].delete.ts`. В Nitro это соответствует динамическим маршрутам `/api/sections/:id`.

Основные элементы архитектуры:

- **Nitro handlers**  
  Каждый файл экспортирует `defineEventHandler`, который обрабатывает конкретный HTTP-метод и маршрут.

- **Tenant context**  
  Все маршруты вызывают `requireTenant(event)`, чтобы определить текущего tenant’а и проверить доступ пользователя.

- **Role-based access control**  
  Операции чтения доступны авторизованному пользователю текущего tenant’а. Операции создания, изменения и удаления требуют роль не ниже `EDITOR`.

- **Prisma ORM**  
  Доступ к данным выполняется через `prisma.section`.

- **Zod validation**  
  Для `POST` и `PATCH` используются схемы `zod`, подключённые через `readValidatedBody`.

- **Plan features**  
  При создании секции вызывается `effectiveFeatures(tenant)` для проверки возможности `customSections`.

- **Default empty content**  
  При создании секции без `content` используется `EMPTY_DOC` из `shared/types/instruction`.

## API / Интерфейс

### `GET /api/sections`

Файл:

```text
server/api/sections/index.get.ts
```

Возвращает список секций текущего tenant’а.

#### Авторизация

Требуется tenant-контекст:

```ts
requireTenant(event)
```

Минимальная роль явно не задана.

#### Ответ

```ts
{
  sections: Array<{
    id: string
    name: string
    description: string | null
    content: unknown
    updatedAt: Date
  }>
}
```

#### Особенности

Секции сортируются по да��е обновления:

```ts
orderBy: { updatedAt: 'desc' }
```

Выбираются только поля:

```ts
select: {
  id: true,
  name: true,
  description: true,
  content: true,
  updatedAt: true
}
```

---

### `POST /api/sections`

Файл:

```text
server/api/sections/index.post.ts
```

Создаёт новую секцию для текущего tenant’а.

#### Авторизация

Требуется роль не ниже `EDITOR`:

```ts
requireTenant(event, { minRole: 'EDITOR' })
```

#### Ограничение тарифа

Перед созданием проверяется наличие фичи:

```ts
features.customSections
```

Если фича недоступна, возвращается ошибка:

```ts
402 Payment Required
```

Сообщение:

```text
Кастомные секции доступны на Plus и выше
```

#### Тело запроса

Валидируется схемой `zod`:

```ts
{
  name: string        // required, min 1, max 100
  description?: string // optional, max 300
  content?: any      // optional
}
```

Схема:

```ts
const schema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  content: z.any().optional()
})
```

#### Поведение по умолчанию

Если `content` не передан, используется пустой документ:

```ts
content: body.content ?? (EMPTY_DOC as object)
```

#### Ответ

```ts
{
  section: Section
}
```

---

### `GET /api/sections/:id`

Файл:

```text
server/api/sections/[id].get.ts
```

Возвращает одну секцию по `id`.

#### Авторизация

Требуется tenant-контекст:

```ts
requireTenant(event)
```

#### Параметры маршрута

```ts
id: string
```

Получается через:

```ts
getRouterParam(event, 'id')!
```

#### Логика доступа

Секция ищется только в рамках текущего tenant’а:

```ts
prisma.section.findFirst({
  where: {
    id,
    tenantId: tenant.id
  }
})
```

#### Ошибки

Если секция не найдена:

```ts
404 Not Found
```

#### Ответ

```ts
{
  section: Section
}
```

---

### `PATCH /api/sections/:id`

Файл:

```text
server/api/sections/[id].patch.ts
```

Обновляет существующую секцию.

#### Авторизация

Требуется роль не ниже `EDITOR`:

```ts
requireTenant(event, { minRole: 'EDITOR' })
```

#### Параметры маршрута

```ts
id: string
```

#### Тело запроса

```ts
{
  name?: string        // min 1, max 100
  description?: string // max 300
  content?: any
}
```

Схема:

```ts
const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(300).optional(),
  content: z.any().optional()
})
```

#### Проверка принадлежности tenant’у

Перед обновлением выполняется поиск:

```ts
const exists = await prisma.section.findFirst({
  where: {
    id,
    tenantId: tenant.id
  }
})
```

Если секция не найдена, возвращается:

```ts
404 Not Found
```

#### Обновляемые поля

```ts
data: {
  name: body.name,
  description: body.description,
  content: body.content ?? undefined
}
```

Если `content` отсутствует, в Prisma передаётся `undefined`, то есть поле не обновляется.

#### Ответ

```ts
{
  section: Section
}
```

---

### `DELETE /api/sections/:id`

Файл:

```text
server/api/sections/[id].delete.ts
```

Удаляет секцию.

#### Авторизация

Требуется роль не ниже `EDITOR`:

```ts
requireTenant(event, { minRole: 'EDITOR' })
```

#### Параметры маршрута

```ts
id: string
```

#### Проверк�� принадлежности tenant’у

Перед удалением выполняется проверка, что секция принадлежит текущему tenant’у:

```ts
const exists = await prisma.section.findFirst({
  where: {
    id,
    tenantId: tenant.id
  }
})
```

Если секция не найдена:

```ts
404 Not Found
```

#### Удаление

```ts
await prisma.section.delete({
  where: { id }
})
```

#### Ответ

```ts
{
  ok: true
}
```

## Бизнес-логика

### Tenant isolation

Все операции ограничены текущим tenant’ом. Даже если пользователь знает `id` секции из другого tenant’а, API вернёт `404`, потому что поиск выполняется с условием:

```ts
where: {
  id,
  tenantId: tenant.id
}
```

Это применяется в маршрутах:

- `GET /api/sections/:id`
- `PATCH /api/sections/:id`
- `DELETE /api/sections/:id`

Для списка секций также используется фильтр:

```ts
where: { tenantId: tenant.id }
```

### Права доступа

Операции чтения:

- `GET /api/sections`
- `GET /api/sections/:id`

требуют только валидного tenant-контекста.

Операции записи:

- `POST /api/sections`
- `PATCH /api/sections/:id`
- `DELETE /api/sections/:id`

требуют роль не ниже:

```ts
EDITOR
```

### Ограничение тарифа

Создание кастомных секций доступно только при активной фиче:

```ts
customSections
```

Она вычисляется через:

```ts
effectiveFeatures(tenant)
```

Если фича недоступна, создание блокируется ошибкой `402`.

```ts
throw createError({
  statusCode: 402,
  statusMessage: 'Кастомные секции доступны на Plus и выше'
})
```

### Валидация данных

Для создания секции:

- `name` обязателен;
- `name` должен быть от 1 до 100 символов;
- `description` опционален, максимум 300 символов;
- `content` опционален и не имеет строгой схемы.

Для обновления:

- все поля опциональны;
- если поле не передано, оно не должно изменяться;
- `content` обновляется только если передан не `null`/`undefined`, из-за выражения `body.content ?? undefined`.

### Контент секции

Поле `content` принимается как `z.any()`, то есть API не проверяет структуру документа. Это соответствует гибкому хранению TipTap/JSON-контента, но ответственность за корректность формата фактически находится на клиенте или других слоях приложения.

При создании без контента используется:

```ts
EMPTY_DOC
```

## Зависимости

### Внутренние зависимости quar.io

- `~~/server/utils/tenant`
  - `requireTenant`
  - определяет текущий tenant и проверяет роль пользователя.

- `~~/server/utils/prisma`
  - `prisma`
  - Prisma Client для работы с таблицей/моделью `section`.

- `~~/server/utils/plan`
  - `effectiveFeatures`
  - вычисляет доступные возможности тарифа tenant’а.

- `~~/shared/types/instruction`
  - `EMPTY_DOC`
  - базовый пустой документ для инициализации `content`.

### Внешние зависимости

- `zod`
  - используется для валидации тела запросов в `POST` и `PATCH`.

### Nuxt/Nitro utilities

Используются ст��ндартные серверные утилиты Nuxt/Nitro:

- `defineEventHandler`
- `getRouterParam`
- `readValidatedBody`
- `createError`

## Примеры использования

### Получение списка секций

```ts
const { sections } = await $fetch('/api/sections')
```

Пример ответа:

```json
{
  "sections": [
    {
      "id": "sec_123",
      "name": "Блок безопасности",
      "description": "Общие предупреждения перед использованием товара",
      "content": {
        "type": "doc",
        "content": []
      },
      "updatedAt": "2026-05-08T10:00:00.000Z"
    }
  ]
}
```

### Создание секции

```ts
const { section } = await $fetch('/api/sections', {
  method: 'POST',
  body: {
    name: 'Уход и обслуживание',
    description: 'Рекомендации по регулярному обслуживанию',
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Очищайте устройство сухой мягкой тканью.'
            }
          ]
        }
      ]
    }
  }
})
```

Если tenant не имеет доступа к кастомным секциям, API вернёт:

```json
{
  "statusCode": 402,
  "statusMessage": "Кастомные секции доступны на Plus и выше"
}
```

### Обновление секции

```ts
const { section } = await $fetch('/api/sections/sec_123', {
  method: 'PATCH',
  body: {
    name: 'Обслуживание устройства'
  }
})
```

### Удаление секции

```ts
const result = await $fetch('/api/sections/sec_123', {
  method: 'DELETE'
})

// { ok: true }
```

## Замечания

- В `index.post.ts` комментарий говорит, что создание секций на неподходящем тарифе должно быть разрешено с флагом, а публичный рендерер затем должен скрывать их при неактивном плане. Однако фактический код блокирует создание через ошибку `402`. Это расхождение между комментарием и реализацией требует уточнения.
- Поле `content` валидируется как `z.any()`, поэтому сервер не проверяет структуру TipTap-документа.
- В `PATCH` невозможно явно установить `content` в `null`, потому что используется `body.content ?? undefined`.
- В `PATCH` поля `name` и `description` передаются в `data` напрямую. Если они отсутствуют, Prisma обычно игнорирует `undefined`, но это поведение зависит от корректной обработки `undefined` в Prisma Client.
- Перед `update` и `delete` выполняется отдельный `findFirst` для проверки tenant’а, а затем операция идёт по `where: { id }`. Это безопасно при уникальном `id`, но не является атомарной проверкой доступа и изменения.
- В коде не видно пагинации для `GET /api/sections`; при большом количестве секций список возвращается целиком.
- Код не показывает Prisma-схему модели `section`, поэтому точные типы полей и ограничения базы данных определяются вне данного модуля.

---
module: api-sections
section: server
generated: 2026-05-08
files: 5
---