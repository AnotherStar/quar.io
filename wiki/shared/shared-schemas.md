# shared-schemas

## Назначение

Модуль `shared-schemas` содержит общие Zod-схемы и TypeScript-типы, которые используются на клиенте и сервере ManualOnline для валидации входных данных. Он задаёт единые контракты для авторизации, регистрации и операций с инструкциями, снижая риск расхождения правил валидации между frontend и backend.

## Ключевые возможности

- Валидация данных регистрации пользователя и создания tenant.
- Валидация данных входа в систему.
- Валидация создания инструкции.
- Валидация обновления инструкции, включая черновой TipTap-контент.
- Валидация параметров публикации инструкции.
- Экспорт TypeScript-типов, выведенных из Zod-схем через `z.infer`.

## Архитектура

Модуль расположен в директории `shared/schemas` и состоит из двух файлов:

```text
shared/
└── schemas/
    ├── auth.ts
    └── instruction.ts
```

### `shared/schemas/auth.ts`

Файл содержит схемы, связанные с аутентификацией и регистрацией:

- `registerSchema` — контракт регистрации пользователя и tenant.
- `RegisterInput` — TypeScript-тип входных данных регистрации.
- `loginSchema` — контракт авторизации по email и паролю.
- `LoginInput` — TypeScript-тип входных данных входа.

### `shared/schemas/instruction.ts`

Файл содержит схемы для операций с инструкциями:

- `instructionCreateSchema` — контракт создания инструкции.
- `InstructionCreateInput` — TypeScript-тип данных создания инструкции.
- `instructionUpdateSchema` — контракт обновления инструкции.
- `InstructionUpdateInput` — TypeScript-тип данных обновления инструкции.
- `publishSchema` — контракт публикации инструкции.

### Взаимодействие

Схемы находятся в `shared`, поэтому могут использоваться как:

- на клиенте — например, для предварительной валидации форм;
- на сервере — для проверки тела запросов в API-роутах;
- в SDK или composables — как единый источник истины для контрактов.

Фактические API-роуты, Vue-компоненты или composables в предоставленном коде отсутствуют, поэтому статья описывает только доступные схемы и типы.

## API / Интерфейс

В модуле нет Nitro route-файлов и Vue-компонентов. Основной интерфейс представлен Zod-схемами и TypeScript-типами.

### Auth-схемы

#### `registerSchema`

Схема регистрации пользователя и tenant.

```ts
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(100).optional(),
  tenantName: z.string().min(1).max(100),
  tenantSlug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, 'Только латиница, цифры, дефис')
})
```

Контракт:

| Поле | Тип | Обязательность | Ограничения |
|---|---|---:|---|
| `email` | `string` | Да | Должен быть валидным email |
| `password` | `string` | Да | Минимум 8 символов, максимум 200 |
| `name` | `string` | Нет | От 1 до 100 символов, если передано |
| `tenantName` | `string` | Да | От 1 до 100 символов |
| `tenantSlug` | `string` | Да | От 2 до 64 символов, только `a-z`, `0-9`, `-` |

Экспортируемый тип:

```ts
export type RegisterInput = z.infer<typeof registerSchema>
```

#### `loginSchema`

Схема входа пользователя.

```ts
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})
```

Контракт:

| Поле | Тип | Обязательность | Ограничения |
|---|---|---:|---|
| `email` | `string` | Да | Должен быть валидным email |
| `password` | `string` | Да | Минимум 1 символ |

Экспортируемый тип:

```ts
export type LoginInput = z.infer<typeof loginSchema>
```

### Instruction-схемы

#### `instructionCreateSchema`

Схема создания инструкции.

```ts
export const instructionCreateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  language: z.string().min(2).max(10).default('en'),
  productGroupId: z.string().optional()
})
```

Контракт:

| Поле | Тип | Обязательность | Ограничения |
|---|---|---:|---|
| `title` | `string` | Да | От 1 до 200 символов |
| `slug` | `string` | Да | От 1 до 80 символов, только `a-z`, `0-9`, `-` |
| `language` | `string` | Нет | От 2 до 10 символов, значение по умолчанию — `en` |
| `productGroupId` | `string` | Нет | Дополнительная строка без специальных ограничений |

Экспортируемый тип:

```ts
export type InstructionCreateInput = z.infer<typeof instructionCreateSchema>
```

#### `instructionUpdateSchema`

Схема обновления инструкции.

```ts
export const instructionUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional().nullable(),
  language: z.string().min(2).max(10).optional(),
  draftContent: z.any().optional(),
  productGroupId: z.string().optional().nullable()
})
```

Контракт:

| Поле | Тип | Обязательность | Ограничения |
|---|---|---:|---|
| `title` | `string` | Нет | От 1 до 200 символов, если передано |
| `slug` | `string` | Нет | От 1 до 80 символов, только `a-z`, `0-9`, `-` |
| `description` | `string \| null` | Нет | До 500 символов, допускается `null` |
| `language` | `string` | Нет | От 2 до 10 символов |
| `draftContent` | `any` | Нет | Без строгой схемы; ожидается TipTap-документ |
| `productGroupId` | `string \| null` | Нет | Допускается строка или `null` |

Экспортируемый тип:

```ts
export type InstructionUpdateInput = z.infer<typeof instructionUpdateSchema>
```

#### `publishSchema`

Схема параметров публикации инструкции.

```ts
export const publishSchema = z.object({
  changelog: z.string().max(500).optional()
})
```

Контракт:

| Поле | Тип | Обязательность | Ограничения |
|---|---|---:|---|
| `changelog` | `string` | Нет | До 500 символов |

Тип для `publishSchema` в предоставленном коде отдельно не экспортируется.

## Бизнес-логика

### Регистрация

При регистрации проверяются:

- корректность email;
- длина пароля от 8 до 200 символов;
- необязательное имя пользователя длиной от 1 до 100 символов;
- обязательное имя tenant длиной от 1 до 100 символов;
- slug tenant длиной от 2 до 64 символов.

`tenantSlug` допускает только:

- латинские строчные буквы;
- цифры;
- дефис.

Регулярное выражение:

```ts
/^[a-z0-9-]+$/
```

Для нарушения этого правила задано русскоязычное сообщение:

```ts
'Только латиница, цифры, дефис'
```

### Вход

Для входа требуется:

- валидный email;
- непустой пароль.

В отличие от регистрации, при логине пароль проверяется только на наличие хотя бы одного символа. Это корректно для сценария входа: дополнительные требования к сложности или длине пароля применяются на этапе регистрации.

### Создание инструкции

При создании инструкции обязательны:

- `title`;
- `slug`.

Для `language` задано значение по умолчанию:

```ts
'en'
```

Если поле `language` не передано, Zod подставит `en` при парсинге через `parse`, `safeParse` или аналогичный вызов.

`slug` инструкции ограничен латинскими строчными буквами, цифрами и дефисом:

```ts
/^[a-z0-9-]+$/
```

### Обновление инструкции

Схема обновления построена как partial-like контракт: все поля являются необязательными.

Особенности:

- `description` может быть отсутствующим, строкой или `null`;
- `productGroupId` может быть отсутствующим, строкой или `null`;
- `draftContent` допускает любое значение через `z.any()`.

Комментарий в коде уточняет назначение `draftContent`:

```ts
// TipTap doc — loose
```

Это означает, что структура TipTap-документа сейчас не валидируется строго на уровне общей схемы.

### Публикация

Для публикации предусмотрено только необязательное поле `changelog` длиной до 500 символов. Других правил публикации, статусов, проверок прав доступа или ограничений тарифов в предоставленном коде нет.

## Зависимости

### Внешние зависимости

- [`zod`](https://github.com/colinhacks/zod) — библиотека описания и runtime-валидации схем.

Использование:

```ts
import { z } from 'zod'
```

### Внутренние зависимости ManualOnline

В предоставленных файлах нет импортов из других внутренних модулей ManualOnline. Модуль предназначен для использования другими частями приложения, но сам зависит только от `zod`.

Потенциальные потребители:

- серверные API-роуты Nuxt/Nitro;
- клиентские формы регистрации, входа и редактирования инструкций;
- SDK-контракты;
- composables, выполняющие запросы к backend.

Эти потребители не представлены в исходном коде модуля, поэтому перечислены как ожидаемые точки интеграции, вытекающие из расположения `shared`.

## Примеры использования

### Валидация регистрации на сервере или клиенте

```ts
import { registerSchema } from '~/shared/schemas/auth'

const result = registerSchema.safeParse({
  email: 'seller@example.com',
  password: 'strong-password',
  name: 'Seller',
  tenantName: 'Demo Store',
  tenantSlug: 'demo-store'
})

if (!result.success) {
  console.error(result.error.format())
} else {
  const input = result.data
  // input имеет тип RegisterInput
}
```

### Создание инструкции с языком по умолчанию

```ts
import { instructionCreateSchema } from '~/shared/schemas/instruction'

const input = instructionCreateSchema.parse({
  title: 'User Manual',
  slug: 'user-manual'
})

console.log(input.language)
// en
```

### Обновление черновика инструкции

```ts
import { instructionUpdateSchema } from '~/shared/schemas/instruction'

const input = instructionUpdateSchema.parse({
  title: 'Updated Manual',
  description: null,
  draftContent: {
    type: 'doc',
    content: []
  },
  productGroupId: null
})
```

## Замечания

- `draftContent` валидируется через `z.any()`, поэтому структура TipTap-документа никак не проверяется. Это упрощает интеграцию с редактором, но снижает гарантию корректности данных.
- Для `publishSchema` не экспортируется TypeScript-тип через `z.infer`, в отличие от остальных схем.
- Для `productGroupId` используется обычная строка без проверки формата идентификатора. Если в системе ожидается UUID, CUID или другой формат, это не отражено в текущей схеме.
- В `instructionCreateSchema` поле `productGroupId` может быть только строкой или отсутствовать, но не `null`. В `instructionUpdateSchema` оно уже допускает `null`.
- Регулярные выражения для `tenantSlug` и `slug` не запрещают начальный или конечный дефис, а также несколько дефисов подряд.
- Код модуля ограничен двумя файлами со схемами. API-роуты, сервисные функции и фактические места применения схем в предоставленном фрагменте отсутствуют.

---
module: shared-schemas
section: shared
generated: 2026-05-08
files: 2
---