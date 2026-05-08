# api-billing

## Назначение

Модуль `api-billing` реализует Nitro API-роуты для получения состояния биллинга текущей компании (`tenant`) и активации пробного периода тарифа. В ManualOnline он используется серверной частью Nuxt 3 для управления тарифным состоянием, доступными возможностями плана и trial-сценарием для продавцов.

## Ключевые возможности

- Получение текущего тарифного состояния компании.
- Расчёт эффективных возможностей тарифа через `effectiveFeatures`.
- Получение состояния пробного периода через `trialState`.
- Активация 30-дневного trial-периода.
- Защита trial-активации от повторного использования.
- Проверка роли пользователя при активации trial: минимум `OWNER`.
- Обновление или создание записи подписки через Prisma `upsert`.
- Инвалидация tenant membership cache после изменения пла��а.

## Архитектура

Модуль представлен двумя Nitro route-файлами в директории `server/api/billing`:

```text
server/api/billing/
├── state.get.ts
└── trial.post.ts
```

### `state.get.ts`

Роут отвечает за чтение текущего состояния биллинга.

Основной поток:

1. Проверяет текущий tenant через `requireTenant(event)`.
2. Загружает подписку из Prisma:
   - поиск по `tenantId`;
   - подключение связанного тарифа через `include: { plan: true }`.
3. Рассчитывает набор доступных возможностей:
   - `effectiveFeatures({ ...tenant, subscription: sub })`.
4. Рассчитывает состояние trial:
   - `trialState(sub)`.
5. Возвращает агрегированное состояние биллинга.

### `trial.post.ts`

Роут отвечает за активацию пробного периода.

Основной поток:

1. Проверяет tenant и роль пользователя:
   - `requireTenant(event, { minRole: 'OWNER' })`.
2. Валидирует тело запроса через `zod`.
3. Определяет тариф для trial:
   - по умолчанию `plus`;
   - можно переопределить через `planCode`.
4. Проверяет существующую подписку:
   - запрещает повторный trial, если `trialUsedAt` уже установлен;
   - запрещает trial, если уже есть активный платный тариф.
5. Находит тариф в таблице `plan` по `code`.
6. Создаёт дату окончания trial через 30 дней.
7. Выполняет `upsert` подписки:
   - создаёт новую запись или обновляет существующую;
   - выставляет `status: 'trialing'`;
   - записывает `currentPeriodEnd`;
   - устанавливает `trialUsedAt`.
8. Инвалидирует кэш membership для tenant через `invalidateTenantMembershipCache(tenant.id)`.
9. Возвращает обновлённую информацию о подписке.

## API / Интерфейс

### `GET /api/billing/state`

Получает текущее состояние биллинга для активного tenant.

#### Авторизация и tenant-контекст

Роут требует валидный tenant-контекст:

```ts
const { tenant } = await requireTenant(event)
```

Минимальная роль в коде явно не задана.

#### Ответ

```ts
{
  plan: string
  status: string
  currentPeriodEnd: Date | null
  features: unknown
  trial: unknown
}
```

Фактическая структура `features` и `trial` определяется утилитами:

- `effectiveFeatures`
- `trialState`

#### Пример ответа

```json
{
  "plan": "plus",
  "status": "trialing",
  "currentPeriodEnd": "2026-06-07T12:00:00.000Z",
  "features": {
    "...": "..."
  },
  "trial": {
    "...": "..."
  }
}
```

Если подписка не найдена, используются значения по умолчанию:

```json
{
  "plan": "free",
  "status": "inactive",
  "currentPeriodEnd": null,
  "features": {},
  "trial": {}
}
```

Точные значения `features` и `trial` зависят от реализации `server/utils/plan`.

---

### `POST /api/billing/trial`

Активирует trial-период для текущего tenant.

#### Авторизация и tenant-контекст

Требуется tenant-контекст и роль не ниже `OWNER`:

```ts
const { tenant } = await requireTenant(event, { minRole: 'OWNER' })
```

#### Тело запроса

Тело запроса валидируется через `zod`.

```ts
const schema = z.object({
  planCode: z.string().optional()
})
```

Поле `planCode` необязательное.

| Поле | Тип | Обязательное | Описание |
|---|---:|---:|---|
| `planCode` | `string` | нет | Код тарифа для trial. Если не передан, используется `plus`. |

#### Значения по умолчанию

```ts
const TRIAL_DAYS = 30
const TRIAL_PLAN_CODE = 'plus'
```

Если тело запроса невалидно или отсутствует, код использует пустой объект:

```ts
const body = await readValidatedBody(event, schema.parse).catch(() => ({}))
```

То есть при ошибке валидации запрос не падает, а trial активируется для тарифа по умолчанию `plus`.

#### Успешный ответ

```ts
{
  subscription: {
    planCode: string
    status: string
    currentPeriodEnd: Date
    trialUsedAt: Date
  }
}
```

#### Пример ответа

```json
{
  "subscription": {
    "planCode": "plus",
    "status": "trialing",
    "currentPeriodEnd": "2026-06-07T12:00:00.000Z",
    "trialUsedAt": "2026-05-08T12:00:00.000Z"
  }
}
```

#### Ошибки

##### Trial уже был использован

```ts
throw createError({
  statusCode: 400,
  statusMessage: 'Триал уже использован для этой компании'
})
```

Условие:

```ts
if (existing?.trialUsedAt)
```

##### Уже активен платный тариф

```ts
throw createError({
  statusCode: 400,
  statusMessage: 'У вас уже активный платный тариф'
})
```

Условие:

```ts
if (existing && existing.status === 'active' && existing.plan.code !== 'free')
```

##### План не найден

```ts
throw createError({
  statusCode: 404,
  statusMessage: 'План не найден'
})
```

Условие:

```ts
if (!plan)
```

## Бизнес-логика

### Получение состояния биллинга

`GET /api/billing/state` возвращает состояние тарифа для текущей компании.

Если подписка существует:

- `plan` берётся из `sub.plan.code`;
- `status` берётся из `sub.status`;
- `currentPeriodEnd` берётся из `sub.currentPeriodEnd`.

Если подписки нет:

- `plan` возвращается как `free`;
- `status` возвращается как `inactive`;
- `currentPeriodEnd` возвращается как `null`.

Доступные возможности тарифа не вычисляются напрямую в роуте. Для этого используется внутренняя функция:

```ts
effectiveFeatures({ ...tenant, subscription: sub })
```

Состояние trial также делегировано отдельной функции:

```ts
trialState(sub)
```

### Активация trial

Trial активируется на 30 дней:

```ts
const ends = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
```

По умолчанию используется тариф:

```ts
const TRIAL_PLAN_CODE = 'plus'
```

При активации подписка получает:

```ts
status: 'trialing'
currentPeriodEnd: ends
trialUsedAt: new Date()
```

### Одноразовый trial

Trial можно активировать только один раз на tenant.

Повторная активация запрещается, если в существующей подписке заполнено поле:

```ts
trialUsedAt
```

Это означает, что даже после окончания пробного периода повторно активировать trial нельзя.

### Запре�� trial при активном платном тарифе

Если у tenant уже есть активная подписка со статусом `active` и тарифом не `free`, trial не активируется.

```ts
existing.status === 'active' && existing.plan.code !== 'free'
```

### Trial и ограничения тарифа

В комментарии к коду указано важное бизнес-правило:

- во время trial применяются возможности выбранного плана;
- при этом `maxInstructions` ограничивается лимитом free-тарифа;
- это ограничение реализовано не в данном роуте, а в `effectiveFeatures`;
- такой подход позволяет не скрывать уже созданные инструкции после окончания trial.

Из текущих файлов видно только место интеграции с этим правилом — вызов `effectiveFeatures`. Детальная реализация ограничения находится за пределами показанного кода.

### Инвалидация кэша после изменения тарифа

После успешной активации trial в��зывается:

```ts
invalidateTenantMembershipCache(tenant.id)
```

Это нужно, чтобы следующие вызовы `requireTenant()` получили акту��льную информацию о подписке и возможностях тарифа.

## Зависимости

### Внутренние зависимости ManualOnline

#### `~~/server/utils/tenant`

Используется в обоих роутах.

```ts
import { requireTenant } from '~~/server/utils/tenant'
```

В `trial.post.ts` дополнительно используется:

```ts
import { invalidateTenantMembershipCache } from '~~/server/utils/tenant'
```

Назначение:

- определение текущего tenant;
- проверка роли пользователя;
- инвалидация кэша membership после изменения подписки.

#### `~~/server/utils/plan`

Используется в `state.get.ts`.

```ts
import { effectiveFeatures, trialState } from '~~/server/utils/plan'
```

Назначение:

- вычисление эффективных возможностей тарифа;
- вычисление состояния trial.

#### `~~/server/utils/prisma`

Используется в обоих роутах.

```ts
import { prisma } from '~~/server/utils/prisma'
```

Назначение:

- работа с таблицами/моделями `subscription` и `plan`;
- чтение и обновление дан��ых биллинга.

### Внешние зависимости

#### Prisma

Используется для доступа к базе данных:

- `prisma.subscription.findUnique`;
- `prisma.subscription.upsert`;
- `prisma.plan.findUnique`.

#### Zod

Используется в `trial.post.ts` для валидации тела запроса:

```ts
import { z } from 'zod'
```

#### Nitro / H3

Используются стандартные серверные функции Nuxt/Nitro:

- `defineEventHandler`;
- `readValidatedBody`;
- `createError`.

Импорты этих функций в коде не указаны, так как в Nuxt/Nitro они обычно доступны через auto-import.

## Примеры использования

### Получение состояния биллинга в клиентском коде

```ts
const billingState = await $fetch('/api/billing/state', {
  method: 'GET'
})

console.log(billingState.plan)
console.log(billingState.status)
console.log(billingState.features)
```

Пример возможного результата:

```json
{
  "plan": "free",
  "status": "inactive",
  "currentPeriodEnd": null,
  "features": {
    "...": "..."
  },
  "trial": {
    "...": "..."
  }
}
```

### Активация trial для тарифа по умолчанию

```ts
const result = await $fetch('/api/billing/trial', {
  method: 'POST'
})

console.log(result.subscription.planCode)
console.log(result.subscription.currentPeriodEnd)
```

По умолчанию будет активирован trial тарифа `plus`.

### Активация trial для конкретного тарифа

```ts
const result = await $fetch('/api/billing/trial', {
  method: 'POST',
  body: {
    planCode: 'plus'
  }
})
```

Важно: указанный `planCode` должен существовать в таблице `plan`, иначе роут вернёт `404`.

## Замечания

- В `trial.post.ts` невалидное тело запроса не приводит к ошибке валидации: ошибка перехватывается, и используется пустой объект. Это означает, что при некорректном body будет активирован trial для тарифа по умолчанию `plus`.
- Роут `POST /api/billing/trial` позволяет передать произвольный `planCode`. В коде нет дополнительного ограничения списка тарифов, разрешённых для trial, кроме пров��рки существования плана в базе.
- Логика ограничения `maxInstructions` во время trial описана в комментарии, но находится не в данном модуле, а в `effectiveFeatures`.
- Код не содержит интеграции с внешним платёжным провайдером. Модуль управляет только локальным состоянием подписки в базе данных.
- Структуры объектов `features` и `trial` в ответе `GET /api/billing/state` не раскрыты в предоставленном коде и зависят от реализации `server/utils/plan`.

---
module: api-billing
section: server
generated: 2026-05-08
files: 2
---