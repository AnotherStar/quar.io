# api-auth

## Назначение

Модуль `api-auth` реализует Nitro API routes для аутентификации пользователей в quar.io. Он отвечает за регистрацию, вход, выход и получение текущего пользователя с привязками к tenant-организациям и тарифным планам.

## Ключевые возможности

- Регистрация нового пользователя и tenant-аккаунта продавца.
- Автоматическое создание membership с ролью `OWNER` при регистрации.
- Назначение бесплатного тарифа `free` новому tenant.
- Вход по email и паролю.
- Создание и уничтожение серверной пользовательской сессии.
- Получение текущего пользователя по сессии.
- Возврат списка tenant-memberships пользователя с ролью и кодом тарифно��о плана.
- Валидация входных данных через shared-схемы `loginSchema` и `registerSchema`.

## Архитектура

Модуль представлен четырьмя Nitro route-файлами в директории `server/api/auth`:

```text
server/api/auth/
├── login.post.ts
├── logout.post.ts
├── me.get.ts
└── register.post.ts
```

### Основные элементы

#### `server/api/auth/login.post.ts`

Обрабатывает вход пользователя:

1. Валидирует тело запроса через `loginSchema`.
2. Ищет пользователя по email в базе данных.
3. Проверяет наличие `passwordHash`.
4. Сравнивает пароль через `verifyPassword`.
5. Создаёт сессию через `createSession`.
6. Возвращает базовые данные пользователя.

#### `server/api/auth/logout.post.ts`

Обрабатывает выход пользователя:

1. Вызывает `destroySession`.
2. Возвращает `{ ok: true }`.

#### `server/api/auth/me.get.ts`

Возвращает текущего пользователя по сессии:

1. Получает пользователя через `getSessionUser`.
2. Если сессии нет, возвращает `user: null` и пустой список memberships.
3. Если пользователь есть, загружает его membership-записи из Prisma.
4. Для каждого membership подтягивает tenant, subscription и plan.
5. Возвращает пользователя и список tenant-доступов.

#### `server/api/auth/register.post.ts`

Обрабатывает регистрацию:

1. Валидирует тело запроса через `registerSchema`.
2. Проверяет, что `tenantSlug` не зарезервирован.
3. Проверяет уникальность email.
4. Проверяет уникальность tenant slug.
5. Находит тарифный план с кодом `free`.
6. Хеширует пароль.
7. В транзакции создаёт пользователя, tenant, membership и subscription.
8. Создаёт сессию для нового пользователя.
9. Возвращает пользователя и созданный tenant.

### Взаимодействие с утилитами

Модуль не содержит собственной низкоуровневой логики работы с паролями и сессиями. Вместо этого ��н использует функции из `server/utils/auth`:

- `hashPassword`
- `verifyPassword`
- `createSession`
- `destroySession`
- `getSessionUser`

Доступ к базе данных выполняется через общий Prisma-клиент:

```ts
import { prisma } from '~~/server/utils/prisma'
```

Проверка зарезервированных slug выполняется через:

```ts
import { isReservedSlug } from '~~/server/utils/slug'
```

Валидация входных payload выполняется через shared-схемы:

```ts
import { loginSchema } from '~~/shared/schemas/auth'
import { registerSchema } from '~~/shared/schemas/auth'
```

## API / Интерфейс

### `POST /api/auth/login`

Файл:

```text
server/api/auth/login.post.ts
```

Назначение: вход пользователя по email и паролю.

#### Входные данные

Тело запроса валидируется через `loginSchema`.

Точный контракт схемы в данном фрагменте не показан, но из кода используются поля:

```ts
{
  email: string
  password: string
}
```

#### Успешный ответ

```ts
{
  user: {
    id: string
    email: string
    name: string | null
  }
}
```

После успешной проверки пароля создаётся серверная сессия.

#### Ошибки

Если пользователь не найден, у него отсутствует `passwordHash` или пароль неверный:

```ts
throw createError({
  statusCode: 401,
  statusMessage: 'Неверный email или пароль'
})
```

---

### `POST /api/auth/logout`

Файл:

```text
server/api/auth/logout.post.ts
```

Назначение: завершение текущей пользовательской сессии.

#### Входные данные

Тело запроса не используется.

#### Успешный ответ

```ts
{
  ok: true
}
```

---

### `GET /api/auth/me`

Файл:

```text
server/api/auth/me.get.ts
```

Назначение: получение текущего пользователя и его tenant-memberships.

#### Входные данные

Данные берутся из текущей сессии. Тело запроса не используется.

#### Ответ без активной сессии

```ts
{
  user: null,
  memberships: []
}
```

#### Ответ с активной сессией

```ts
{
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
  },
  memberships: [
    {
      role: string,
      tenant: {
        id: string,
        slug: string,
        name: string,
        plan: string
      }
    }
  ]
}
```

Поле `tenant.plan` берётся из `tenant.subscription.plan.code`. Если subscription или plan отсутствует, возвращается значение по умолчанию:

```ts
'free'
```

Membership-записи сортируются по `createdAt` в порядке возрастания:

```ts
orderBy: { createdAt: 'asc' }
```

---

### `POST /api/auth/register`

Файл:

```text
server/api/auth/register.post.ts
```

Назначение: регистрация нового пользователя и tenant-пространства.

#### Входные данные

Тело запроса валидируется через `registerSchema`.

Точный контракт схемы в данном фрагменте не показан, но из кода используются поля:

```ts
{
  email: string
  password: string
  name: string
  tenantSlug: string
  tenantName: string
}
```

#### Успешный ответ

```ts
{
  user: {
    id: string
    email: string
    name: string | null
  },
  tenant: {
    // объект tenant, возвращённый Prisma после создания
  }
}
```

После успешной регистрации создаётся серверная сессия для нового пользователя.

#### Ошибки

Если `tenantSlug` зарезервирован:

```ts
throw createError({
  statusCode: 400,
  statusMessage: 'Этот slug зарезервирован'
})
```

Если email уже используется:

```ts
throw createError({
  statusCode: 400,
  statusMessage: 'Email уже занят'
})
```

Если tenant slug уже используется:

```ts
throw createError({
  statusCode: 400,
  statusMessage: 'Этот slug уже занят'
})
```

Если в базе отсутствует тарифный план `free`:

```ts
throw createError({
  statusCode: 500,
  statusMessage: 'Free plan missing — run prisma db seed'
})
```

## Бизнес-логика

### Регистрация пользователя

Регистрация создаёт не только пользователя, но и минимальную организационную структуру для работы в quar.io:

1. Пользователь создаётся с email, хешем пар��ля и именем.
2. Создаётся tenant с указанными `slug` и `name`.
3. Пользователь получает membership в этом tenant.
4. Роль пользователя в созданном tenant — `OWNER`.
5. Для tenant создаётся subscription со статусом `active`.
6. Subscription привязывается к тарифному плану `free`.

Создание пользователя и tenant выполняется внутри Prisma-транзакции:

```ts
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create(...)
  const tenant = await tx.tenant.create(...)
  return { user, tenant }
})
```

Это защищает систему от частично созданных данных: например, пользователь не будет создан без tenant, если одна из операций завершится ошибкой.

### Проверка tenant slug

Перед созданием tenant выполняются две проверки:

1. Slug не должен быть зарезервирован:

```ts
isReservedSlug(body.tenantSlug)
```

2. Slug не должен быть уже занят другим tenant:

```ts
await prisma.tenant.findUnique({ where: { slug: body.tenantSlug } })
```

### Проверка email

Перед созданием пользователя проверяется уникальность email:

```ts
await prisma.user.findUnique({ where: { email: body.email } })
```

Если пользователь с таким email уже существует, регистрация завершается ошибкой `400`.

### Тариф по умолчанию

Новый tenant всегда получает тарифный план с кодом:

```ts
free
```

Если такой план отсутствует, регистрация невозможна. Сообщение ошибки явно указывает на необходимость выполнить seed базы данных:

```text
Free plan missing — run prisma db seed
```

### Аутентификация

Вход выполняется по email и паролю.

Алгоритм:

1. Найти пользователя по email.
2. Проверить, что у пользователя есть `passwordHash`.
3. Сравнить переданный пароль с сохранённым хешем.
4. При успехе создать сессию.

Для всех неуспешных вариантов входа используется одинаковый ответ:

```text
Неверный email или пароль
```

Это снижает риск enumeration-атак, так как API не раскрывает, существует ли email в системе.

### Получение текущего пользователя

`GET /api/auth/me` не выбрасывает ошибку при отсутствии сессии. Вместо этого возвращается безопасный ответ:

```ts
{
  user: null,
  memberships: []
}
```

Это удобно для клиентской инициализации состояния авторизации: frontend может вызвать endpoint при старте приложения и определить, авторизован пользователь или нет.

## Зависимости

### Внутренние зависимости quar.io

- `~~/shared/schemas/auth`
  - `loginSchema`
  - `registerSchema`

- `~~/server/utils/auth`
  - `hashPassword`
  - `verifyPassword`
  - `createSession`
  - `destroySession`
  - `getSessionUser`

- `~~/server/utils/prisma`
  - `prisma`

- `~~/server/utils/slug`
  - `isReservedSlug`

### База данных

Модуль работает через Prisma и использует следующие сущности, видимые из кода:

- `user`
- `tenant`
- `membership`
- `subscription`
- `plan`

### Внешние сервисы

Прямых вызовов внешних сервисов в данном модуле нет. Работа с хранением сессий, cookies или криптографией скрыта за утилитами `server/utils/auth`, исходный код которых в предоставленном фрагменте не показан.

## Примеры использования

### Вход пользователя

```ts
const response = await $fetch('/api/auth/login', {
  method: 'POST',
  body: {
    email: 'seller@example.com',
    password: 'password123'
  }
})

console.log(response.user)
```

Пример успешного ответа:

```json
{
  "user": {
    "id": "user_id",
    "email": "seller@example.com",
    "name": "Seller"
  }
}
```

### Получение текущего пользователя

```ts
const session = await $fetch('/api/auth/me')

if (session.user) {
  console.log('Пользователь авторизован:', session.user.email)
  console.log('Доступные tenant:', session.memberships)
} else {
  console.log('Пользователь не авторизован')
}
```

### Регистр��ция нового tenant

```ts
const result = await $fetch('/api/auth/register', {
  method: 'POST',
  body: {
    email: 'owner@example.com',
    password: 'password123',
    name: 'Owner',
    tenantSlug: 'my-shop',
    tenantName: 'My Shop'
  }
})

console.log(result.user)
console.log(result.tenant)
```

## Замечания

- Контракты `loginSchema` и `registerSchema` в исходном фрагменте не раскрыты полностью. Поля описаны на основании того, как они используются в route-файлах.
- Реализация сессий, хеширования паролей и проверки пароля находится в `server/utils/auth`, но код этих утилит не предоставлен. Поэтому детали хранения сессии, параметры cookies и алгоритм хеширования в этой статье не описаны.
- В `register.post.ts` проверка уникальности email и tenant slug выполняется до транзакции. При конкурентных запросах возможна гонка, если на уровне базы данных нет уникальных ограничений. По коду видно, что использ��ется `findUnique`, что предполагает наличие unique-индексов, но схема Prisma в фрагменте не показана.
- Endpoint `GET /api/auth/me` возвращает тариф `free` по умолчанию, если у tenant отсутствует subscription или plan. Это поведение может скрывать проблемы целостности данных, но явно задано в коде.
- При регистрации возвращается полный объект `tenant`, созданный Prisma. В отличие от `me.get.ts`, он не нормализуется до публичного DTO. Если в модели tenant есть служебные поля, они могут попасть в ответ API.

---
module: api-auth
section: server
generated: 2026-05-08
files: 4
---