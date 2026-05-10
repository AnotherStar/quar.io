# api-modules

## Назначение

Модуль `api-modules` реализует Nitro API routes для управления подключаемыми модулями quar.io и обработки публичных действий этих модулей. Он отвечает за выдачу списка доступных модулей tenant-а, включение/отключение модулей, а также за приём и просмотр заявок по модулям `feedback` и `warranty`.

## Ключевые возможности

- Получение списка активных модулей с учётом конфигурации tenant-а и доступности по тарифу.
- Включение/отключение модулей по коду через общий механизм `toggleModule`.
- Поддержка отдельных PUT-роутов для модулей со статическими директориями (`feedback`, `warranty`).
- Публичная отправка формы обратной связи для опубликованной инструкции.
- Публичная регистрация гарантии для опубликованной инструкции.
- Проверка, что модуль разрешён тарифом tenant-а.
- Проверка, что модуль действительно подключён к опубликованной инструкции.
- Получение последних заявок обратной связи и гарантийных регистраций для текущего tenant-а.

## Архитектура

Модуль расположен в директории:

```text
server/api/modules/
```

Структура файлов:

```text
server/api/modules/
├── index.get.ts
├── [code].put.ts
├── feedback/
│   ├── index.put.ts
│   ├── submit.post.ts
│   └── submissions.get.ts
└── warranty/
    ├── index.put.ts
    ├── register.post.ts
    └── registrations.get.ts
```

### Общая модель взаимодействия

API-роуты работают поверх Nitro event handler-ов Nuxt 3:

```ts
export default defineEventHandler(...)
```

Основные внутренние зависимости:

- `requireTenant(event)` — определяет текущего tenant-а для приватных dashboard-запросов.
- `prisma` — доступ к PostgreSQL через Prisma.
- `effectiveFeatures(tenant)` — вычисляет доступные tenant-у возможности на основе подписки и тарифа.
- `planAllowsModule(features, code)` — проверяет, доступен ли конкретный модуль в рамках тарифа.
- `toggleModule(event, code)` — общий механизм включения/отключения tenant-конфигурации модуля.
- `isModuleAttachedToPublished(instructionId, code)` — проверяет, прикреплён ли модуль к опубликованной инструкции.

### Особенность Nitro file router

В коде явно зафиксировано ограничение маршрутизации Nitro:

```ts
// Modules that DO have a dir (warranty, feedback) provide their own index.put.ts
// because Nitro's file router doesn't fall through static→dynamic for method mismatch.
```

То есть универсальный роут:

```text
PUT /api/modules/:code
```

реализован через файл:

```text
server/api/modules/[code].put.ts
```

Но если внутри `/api/modules` существует статическая директория с именем модуля, например:

```text
server/api/modules/feedback/
server/api/modules/warranty/
```

то она перекрывает динамический маршрут `[code]`. Поэтому для таких модулей добавлены отдельные файлы:

```text
server/api/modules/feedback/index.put.ts
server/api/modules/warranty/index.put.ts
```

Они вручную вызывают `toggleModule` с фиксированным кодом модуля.

## API / Интерфейс

### `GET /api/modules`

Файл:

```text
server/api/modules/index.get.ts
```

Возвращает список активных модулей, их manifest-данные, tenant-конфигурацию и признак доступности по тарифу.

#### Авторизация / контекст

Роут требует текущего tenant-а:

```ts
const { tenant } = await requireTenant(event)
```

#### Логика запроса

Параллельно загружаются:

```ts
prisma.moduleManifest.findMany({ where: { isActive: true } })
prisma.tenantModuleConfig.findMany({ where: { tenantId: tenant.id } })
```

#### Ответ

Формат ответа:

```ts
{
  modules: [
    {
      id: string,
      code: string,
      name: string,
      description: string | null,
      version: string,
      configSchema: unknown,
      requiresPlan: unknown,
      allowedByPlan: boolean,
      tenantConfig: {
        id: string,
        enabled: boolean,
        config: unknown,
        updatedAt: Date
      } | null
    }
  ]
}
```

Пример ответа:

```json
{
  "modules": [
    {
      "id": "mod_1",
      "code": "feedback",
      "name": "Feedback",
      "description": "Форма обратной связи",
      "version": "1.0.0",
      "configSchema": {},
      "requiresPlan": null,
      "allowedByPlan": true,
      "tenantConfig": {
        "id": "cfg_1",
        "enabled": true,
        "config": {
          "recipientEmail": "support@example.com"
        },
        "updatedAt": "2026-05-08T10:00:00.000Z"
      }
    }
  ]
}
```

---

### `PUT /api/modules/:code`

Файл:

```text
server/api/modules/[code].put.ts
```

Универсальный endpoint для включения или отключения модуля по его коду.

#### Параметры маршрута

| Параметр | Тип | Описание |
|---|---:|---|
| `code` | `string` | Код модуля |

#### Реализация

```ts
const code = getRouterParam(event, 'code')!
return toggleModule(event, code)
```

Фактический контракт body и формат ответа определяются в `server/utils/moduleToggle`, который в предоставленном коде не показан.

#### Важное ограничение

Этот роут предназначен для модулей, у которых нет статической директории внутри `/api/modules`.

Например, комментарий в коде указывает:

```ts
// e.g. chat-consultant, faq
```

Для `feedback` и `warranty` используются отдельные PUT-роуты.

---

### `PUT /api/modules/feedback`

Файл:

```text
server/api/modules/feedback/index.put.ts
```

Включает или отключает модуль `feedback` для текущего tenant-а через общий механизм `toggleModule`.

#### Реализация

```ts
export default defineEventHandler((event) => toggleModule(event, 'feedback'))
```

Фактический контракт зависит от `toggleModule`.

---

### `POST /api/modules/feedback/submit`

Файл:

```text
server/api/modules/feedback/submit.post.ts
```

Публичный endpoint для отправки формы обратной связи со страницы опубликованной инструкции.

#### Body

Валидация выполняется через `zod`.

```ts
const schema = z.object({
  instructionId: z.string(),
  fio: z.string().max(160).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(160).optional(),
  telegram: z.string().max(80).optional(),
  message: z.string().max(4000).optional()
}).refine(
  (v) => Boolean(v.fio || v.phone || v.email || v.telegram || v.message),
  { message: 'Заполните хотя бы одно поле' }
)
```

Поля:

| Поле | Тип | Обязательное | Ограничения |
|---|---:|---:|---|
| `instructionId` | `string` | да | ID инструкции |
| `fio` | `string` | нет | максимум 160 символов |
| `phone` | `string` | нет | максимум 40 символов |
| `email` | `string` | нет | валидный email, максимум 160 символов |
| `telegram` | `string` | нет | максимум 80 символов |
| `message` | `string` | нет | максимум 4000 символов |

Дополнительное правило:

- должно быть заполнено хотя бы одно из полей: `fio`, `phone`, `email`, `telegram`, `message`.

#### Ответ

При успешной отправке:

```ts
{
  ok: true,
  id: string
}
```

#### Возможные ошибки

| HTTP-код | Условие |
|---:|---|
| `404` | Инструкция не найдена или не опубликована |
| `402` | Модуль `feedback` недоступен на текущем тарифе |
| `404` | Модуль не подключён к инструкции |
| `400`/ошибка валидации | Некорректное тело запроса |

---

### `GET /api/modules/feedback/submissions`

Файл:

```text
server/api/modules/feedback/submissions.get.ts
```

Возвращает последние заявки обратной связи для текущего tenant-а.

#### Авторизация / контекст

Используется:

```ts
const { tenant } = await requireTenant(event)
```

Данные фильтруются по tenant-у через связь с инструкцией:

```ts
where: { instruction: { tenantId: tenant.id } }
```

#### Ограничения выборки

- сортировка: `createdAt desc`
- лимит: `500` записей

#### Ответ

```ts
{
  items: [
    {
      id: string,
      fio: string | null,
      phone: string | null,
      email: string | null,
      telegram: string | null,
      message: string | null,
      createdAt: Date,
      instruction: {
        id: string,
        title: string,
        slug: string
      }
    }
  ]
}
```

---

### `PUT /api/modules/warranty`

Файл:

```text
server/api/modules/warranty/index.put.ts
```

Включает или отключает модуль `warranty` через общий механизм `toggleModule`.

#### Реализация

```ts
export default defineEventHandler((event) => toggleModule(event, 'warranty'))
```

Важно: этот роут использует код `warranty`, тогда как публичная регистрация гарантии проверяет код модуля `warranty-registration`.

---

### `POST /api/modules/warranty/register`

Файл:

```text
server/api/modules/warranty/register.post.ts
```

Публичный endpoint для отправки формы регистрации гарантии со страницы опубликованной инструкции.

#### Body

Валидация выполняется через `zod`.

```ts
const schema = z.object({
  instructionId: z.string(),
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email(),
  customerPhone: z.string().max(40).optional(),
  serialNumber: z.string().max(80).optional(),
  purchaseDate: z.string().datetime().optional()
})
```

Поля:

| Поле | Тип | Обязательное | Ограничения |
|---|---:|---:|---|
| `instructionId` | `string` | да | ID инструкции |
| `customerName` | `string` | да | минимум 1, максимум 120 символов |
| `customerEmail` | `string` | да | валидный email |
| `customerPhone` | `string` | нет | максимум 40 символов |
| `serialNumber` | `string` | нет | максимум 80 символов |
| `purchaseDate` | `string` | нет | ISO datetime-строка |

Если `purchaseDate` передан, он преобразуется в `Date`:

```ts
purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined
```

#### Ответ

```ts
{
  ok: true,
  id: string
}
```

#### Возможные ошибки

| HTTP-код | Условие |
|---:|---|
| `404` | Инструкция не найдена или не опубликована |
| `402` | Модуль `warranty-registration` недоступен на тарифе tenant-а |
| `404` | Модуль не подключён к инструкции |
| `400`/ошибка валидации | Некорректное тело запроса |

---

### `GET /api/modules/warranty/registrations`

Файл:

```text
server/api/modules/warranty/registrations.get.ts
```

Возвращает последние регистрации гарантии для текущего tenant-а.

#### Авторизация / контекст

Используется:

```ts
const { tenant } = await requireTenant(event)
```

Выборка ограничена инструкциями текущего tenant-а:

```ts
where: { instruction: { tenantId: tenant.id } }
```

#### Ограничения выборки

- сортировка: `createdAt desc`
- лимит: `500` записей

#### Ответ

```ts
{
  items: [
    {
      id: string,
      customerName: string,
      customerEmail: string,
      customerPhone: string | null,
      serialNumber: string | null,
      purchaseDate: Date | null,
      createdAt: Date,
      instruction: {
        id: string,
        title: string,
        slug: string
      }
    }
  ]
}
```

## Бизнес-логика

### Получение списка модулей

При запросе `GET /api/modules` система:

1. Определяет текущего tenant-а через `requireTenant`.
2. Вычисляет доступные возможности tenant-а:

   ```ts
   const features = effectiveFeatures(tenant)
   ```

3. Загружает все активные manifest-ы модулей:

   ```ts
   prisma.moduleManifest.findMany({ where: { isActive: true } })
   ```

4. Загружает tenant-конфигурации модулей:

   ```ts
   prisma.tenantModuleConfig.findMany({ where: { tenantId: tenant.id } })
   ```

5. Для каждого модуля возвращает:
   - описание из manifest-а;
   - доступность по тарифу через `planAllowsModule`;
   - tenant-конфигурацию, если она существует.

### Включение и отключение модулей

Включение/отключение делегировано утилите:

```ts
toggleModule(event, code)
```

Из предоставленного кода видно только то, что:

- для динамических модулей код берётся из route param `code`;
- для `feedback` код фиксирован как `'feedback'`;
- для `warranty` код фиксирован как `'warranty'`.

Подробная логика изменения состояния модуля находится в `server/utils/moduleToggle`, но исходный код этой утилиты не предоставлен.

### Публичная отправка feedback

Endpoint `POST /api/modules/feedback/submit` выполняет последовательные проверки:

1. Вали��ирует тело запроса через `zod`.
2. Загружает инструкцию вместе с tenant-ом, подпиской и тарифом:

   ```ts
   prisma.instruction.findUnique({
     where: { id: body.instructionId },
     include: { tenant: { include: { subscription: { include: { plan: true } } } } }
   })
   ```

3. Проверяет, что инструкция существует и опубликована:

   ```ts
   if (!instr || instr.status !== 'PUBLISHED') throw createError({ statusCode: 404 })
   ```

4. Проверяет доступность модуля `feedback` на тарифе tenant-а:

   ```ts
   if (!planAllowsModule(features, 'feedback')) {
     throw createError({ statusCode: 402, statusMessage: 'Модуль недоступен на текущем тарифе' })
   }
   ```

5. Проверяет, что модуль подключён к опубликованной инструкции:

   ```ts
   const attached = await isModuleAttachedToPublished(body.instructionId, 'feedback')
   ```

6. Создаёт запись `feedbackSubmission`.

### Публичная регистрация гарантии

Endpoint `POST /api/modules/warranty/register` выполняет аналогичный сценарий:

1. Валидирует body.
2. Загружает инструкцию с tenant-ом, подпиской и тарифом.
3. Проверяет статус инструкции `PUBLISHED`.
4. Проверяет тарифную доступность модуля:

   ```ts
   planAllowsModule(features, 'warranty-registration')
   ```

5. Проверяет прикрепление модуля к опубликованной инструкции:

   ```ts
   isModuleAttachedToPublished(body.instructionId, 'warranty-registration')
   ```

6. Создаёт запись `warrantyRegistration`.

В комментарии к файлу указано, что подключение модуля может быть:

- slot-based через `InstructionModuleAttachment`;
- inline через TipTap `moduleRef` node, встроенный в опубликованный документ.

Сама реализация этой проверки находится в `server/utils/moduleAttached`, код которой не входит в предоставленный фрагмент.

### Просмотр заявок в dashboard

Роуты:

```text
GET /api/modules/feedback/submissions
GET /api/modules/warranty/registrations
```

работают только в контексте текущего tenant-а и возвращают данные, связанные с его инструкциями. Оба роута используют одинаковый паттерн:

- `requireTenant(event)`;
- фильтрация по `instruction.tenantId`;
- сортировка по `createdAt` по убыванию;
- лимит `take: 500`;
- включение краткой информации об инструкции: `id`, `title`, `slug`.

## Зависимости

### Внутренние зависимости quar.io

- `~~/server/utils/tenant`
  - `requireTenant(event)` — получение текущего tenant-а.
- `~~/server/utils/prisma`
  - `prisma` — Prisma Client для доступа к базе данных.
- `~~/server/utils/plan`
  - `effectiveFeatures(tenant)` — вычисление возможностей tenant-а.
  - `planAllowsModule(features, code)` — проверка доступности модуля по тарифу.
- `~~/server/utils/moduleToggle`
  - `toggleModule(event, code)` — включение/отключение модуля.
- `~~/server/utils/moduleAttached`
  - `isModuleAttachedToPublished(instructionId, code)` — проверка подключения модуля к опубликованной инструкции.

### Модели Prisma, используемые в коде

Из кода видны обращения к следующим моделям:

- `moduleManifest`
- `tenantModuleConfig`
- `instruction`
- `feedbackSubmission`
- `warrantyRegistration`

Также через include используются связи:

- `instruction.tenant`
- `tenant.subscription`
- `subscription.plan`
- `feedbackSubmission.instruction`
- `warrantyRegistration.instruction`

### Внешние библиотеки и runtime

- Nuxt 3 / Nitro server routes:
  - `defineEventHandler`
  - `getRouterParam`
  - `readValidatedBody`
  - `createError`
- `zod` — валидация входящих данных публичных POST-запросов.
- PostgreSQL через Prisma.
- Косвенно используются тарифы и подписки, но конкретная реализация тарифной системы находится за пределами показанного кода.

## Примеры использования

### Получение списка модулей tenant-а

```ts
const { modules } = await $fetch('/api/modules')
```

Пример использования в dashboard:

```ts
const response = await $fetch('/api/modules')

for (const module of response.modules) {
  console.log(module.code, {
    enabled: module.tenantConfig?.enabled ?? false,
    allowedByPlan: module.allowedByPlan
  })
}
```

### Отправка формы обратной связи с публичной инструкции

```ts
await $fetch('/api/modules/feedback/submit', {
  method: 'POST',
  body: {
    instructionId: 'instr_123',
    fio: 'Иван Иванов',
    email: 'ivan@example.com',
    message: 'Не удалось найти информацию о настройке устройства'
  }
})
```

Успешный ответ:

```json
{
  "ok": true,
  "id": "feedback_submission_id"
}
```

### Регистрация гарантии

```ts
await $fetch('/api/modules/warranty/register', {
  method: 'POST',
  body: {
    instructionId: 'instr_123',
    customerName: 'Мария Петрова',
    customerEmail: 'maria@example.com',
    customerPhone: '+79990000000',
    serialNumber: 'SN-123456',
    purchaseDate: '2026-05-08T12:00:00.000Z'
  }
})
```

Успешный ответ:

```json
{
  "ok": true,
  "id": "warranty_registration_id"
}
```

## Замечания

- В коде явно указано ограничение Nitro file router: статические директории `feedback/` и `warranty/` перекрывают динамический маршрут `[code].put.ts`, поэтому для них добавлены отдельные `index.put.ts`.
- Фактический контракт включения/отключения модулей не виден в предоставленном коде, так как реализация находится в `server/utils/moduleToggle`.
- Для feedback предусмотрен TODO по уведомлениям:

  ```ts
  // TODO(notification): forward to recipientEmail from TenantModuleConfig.config.
  // Wired here so it stays a single integration point when SMTP/queue is added.
  ```

  Сейчас endpoint только сохраняет заявку в базе и возвращает `{ ok: true, id }`; отправка email/уведомлений не реализована в показанном коде.

- В модуле гарантии есть потенциально важное различие кодов:
  - toggle-роут использует `'warranty'`;
  - публичный endpoint регистрации проверяет `'warranty-registration'`.

  Это может быть ожидаемой моделью именования, но связь между этими кодами не раскрыта в предоставленных файлах.

- Оба dashboard-роута для заявок ограничены последними `500` записями. Пагинация в показанном коде не реализована.
- Публичные POST-роуты не используют `requireTenant`, tenant определяется через инструкцию. Это соответствует публичному сценарию, но безопасность зависит от проверок публикации, тарифа и подключения модуля.
- Код не показывает rate limiting, CAPTCHA или антиспам-защиту для публичных форм.

---
module: api-modules
section: server
generated: 2026-05-08
files: 8
---