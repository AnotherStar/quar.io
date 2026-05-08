# Регистрация расширенной гарантии

## Назначение

Модуль `warranty-registration` добавляет на публичную страницу инструкции форму регистрации расширенной гарантии. Он используется как подключаемый модуль ManualOnline и позволяет покупателю отправить данные о себе, покупке и товаре прямо из опубликованной инструкции.

## Ключевые возможности

- Отображение формы регистрации гарантии на публичной странице инструкции.
- Настраиваемый срок расширенной гарантии в месяцах.
- Опциональный запрос телефона покупателя.
- Опциональный запрос серийного номера товара.
- Настраиваемое сообщение после успешной регистрации.
- Интеграция с dashboard-навигацией продавца через отдельный пункт «Регистрации».
- Ограничение доступности модуля тарифом `plus`.

## Архитектура

Модуль расположен в директории:

```text
instruction-modules/warranty-registration/
├── index.ts
└── Public.vue
```

### `index.ts`

Файл экспортирует объект `ModuleDefinition`, который описывает модуль для SDK подключаемых instruction-модулей ManualOnline.

Основные части определения:

```ts
const definition: ModuleDefinition = {
  manifest: { ... },
  PublicComponent: () => import('./Public.vue'),
  dashboardNavItem: { ... }
}
```

#### Manifest

В `manifest` описаны:

- уникальный код модуля: `warranty-registration`;
- отображаемое название: `Регистрация расширенной гарантии`;
- описание назначения;
- версия: `1.0.0`;
- минимальный тариф: `plus`;
- JSON-подобная схема конфигурации `configSchema`;
- поля для UI-конфигурации `configFields`.

#### PublicComponent

```ts
PublicComponent: () => import('./Public.vue')
```

Публичный компонент загружается лениво и отвечает за отображение формы регистрации на странице инструкции.

#### Dashboard navigation

```ts
dashboardNavItem: {
  to: '/dashboard/modules/warranty',
  label: 'Регистрации',
  icon: 'lucide:shield-check'
}
```

Модуль добавляет пункт навигации в дашборд продавца. Код самого dashboard-раздела в предоставленных файлах отсутствует.

### `Public.vue`

`Public.vue` — клиентский Vue-компонент публичной формы регистрации гарантии.

Он получает параметры инструкции и конфигурацию модуля через props, отображает форму и отправляет данные на API-эндпоинт:

```ts
await $fetch('/api/modules/warranty/register', {
  method: 'POST',
  body: { ... }
})
```

Компонент содержит:

- вычисляемые значения на основе конфигурации модуля;
- реактивное состояние формы;
- статус отправки;
- обработку успешного и ошибочного ответа.

## API / Интерфейс

## SDK-контракт модуля

Модуль экспортирует `ModuleDefinition` из `~~/modules-sdk/types`.

```ts
import type { ModuleDefinition } from '~~/modules-sdk/types'
```

### Manifest

```ts
manifest: {
  code: 'warranty-registration',
  name: 'Регистрация расширенной гарантии',
  description: 'Форма регистрации расширенной гарантии прямо на странице инструкции.',
  version: '1.0.0',
  requiresPlan: 'plus',
  configSchema: { ... },
  configFields: [ ... ]
}
```

### Конфигурация модуля

Поддерживаемые параметры:

| Ключ | Тип | Значение по умолчанию | Назначение |
|---|---:|---:|---|
| `warrantyMonths` | `integer` | `12` | Количество месяцев расширенной гарантии, отображаемое пользователю |
| `requirePhone` | `boolean` | `false` | Делает поле телефона видимым и обязательным на форме |
| `requireSerial` | `boolean` | `true` | Делает поле серийного номера видимым и обязательным на форме |
| `successMessage` | `string` | `Спасибо! Гарантия зарегистрирована.` | Текст сообщения после успешной отправки |

Конфигурация описана дважды:

1. В `configSchema` — как схема данных.
2. В `configFields` — как набор полей для интерфейса настройки.

```ts
configFields: [
  { key: 'warrantyMonths', label: 'Срок гарантии (мес.)', type: 'number', default: 12 },
  { key: 'requirePhone', label: 'Запрашивать телефон', type: 'boolean', default: false },
  { key: 'requireSerial', label: 'Запрашивать серийный номер', type: 'boolean', default: true },
  { key: 'successMessage', label: 'Сообщение об успехе', type: 'string', default: 'Спасибо! Гарантия зарегистрирована.' }
]
```

## Vue-компонент `Public.vue`

### Props

Компонент принимает три prop:

```ts
const props = defineProps<{
  instructionId: string
  config: Record<string, any>
  viewerSessionId: string
}>()
```

| Prop | Тип | Использование |
|---|---|---|
| `instructionId` | `string` | Передается в API при регистрации гарантии |
| `config` | `Record<string, any>` | Используется для настройки формы и текста |
| `viewerSessionId` | `string` | Передается в компонент, но в текущем коде не используется |

### Events

Компонент не объявляет пользовательские события через `defineEmits`.

### Slots

Компонент не предоставляет slots.

### Локальное состояние формы

```ts
const form = reactive({
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  serialNumber: '',
  purchaseDate: ''
})
```

Поля формы:

| Поле | Назначение |
|---|---|
| `customerName` | Имя покупателя |
| `customerEmail` | Email покупателя |
| `customerPhone` | Телефон покупателя, если включен `requirePhone` |
| `serialNumber` | Серийный номер товара, если включен `requireSerial` |
| `purchaseDate` | Дата покупки |

### Статусы отправки

```ts
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
```

Поддерживаемые статусы:

| Статус | Значение |
|---|---|
| `idle` | Начальное состояние формы |
| `loading` | Идет отправка данных |
| `success` | Регистрация успешно отправлена |
| `error` | При отправке произошла ошибка |

### API-запрос

Компонент отправляет POST-запрос:

```http
POST /api/modules/warranty/register
```

Тело запроса:

```ts
{
  instructionId: props.instructionId,
  customerName: form.customerName,
  customerEmail: form.customerEmail,
  customerPhone: form.customerPhone || undefined,
  serialNumber: form.serialNumber || undefined,
  purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined
}
```

Пример JSON-тела:

```json
{
  "instructionId": "instruction_123",
  "customerName": "Иван Иванов",
  "customerEmail": "ivan@example.com",
  "customerPhone": "+79990000000",
  "serialNumber": "SN-123456",
  "purchaseDate": "2026-05-08T00:00:00.000Z"
}
```

Реализация Nitro route-файла для `/api/modules/warranty/register` в предоставленном коде отсутствует. Из кода компонента видно только, что эндпоинт должен принимать `POST`-запрос.

## Бизнес-логика

### Доступность по тарифу

Модуль требует тариф:

```ts
requiresPlan: 'plus'
```

Это означает, что подключение или использование модуля должно быть ограничено пользователями/проектами с тарифом `plus` или выше, если такая проверка реализована на стороне платформы ManualOnline.

### Расчет параметров отображения

В компоненте используются computed-значения с fallback на значения по умолчанию.

```ts
const months = computed(() => Number(props.config?.warrantyMonths ?? 12))
const requirePhone = computed(() => Boolean(props.config?.requirePhone))
const requireSerial = computed(() => Boolean(props.config?.requireSerial ?? true))
const successMsg = computed(() => String(props.config?.successMessage ?? 'Спасибо! Гарантия зарегистрирована.'))
```

Правила:

- если `warrantyMonths` не задан, отображается `12`;
- если `requirePhone` не задан, телефон не запрашивается;
- если `requireSerial` не задан, серийный номер запрашивается;
- если `successMessage` не задан, используется стандартное сообщение.

### Обязательные поля формы

В шаблоне всегда обязательны:

```vue
<UiInput v-model="form.customerName" label="Ваше имя" required />
<UiInput v-model="form.customerEmail" type="email" label="Email" required />
```

Условно обязательные поля:

```vue
<UiInput v-if="requirePhone" v-model="form.customerPhone" label="Телефон" required />
<UiInput v-if="requireSerial" v-model="form.serialNumber" label="Серийный номер" required />
```

Дата покупки отображается всегда, но не помечена как обязательная:

```vue
<UiInput v-model="form.purchaseDate" type="date" label="Дата покупки" />
```

### Отправка формы

Алгоритм отправки:

1. При submit устанавливается статус `loading`.
2. Текст ошибки сбрасывается.
3. Выполняется `POST /api/modules/warranty/register`.
4. При успешном ответе статус меняется на `success`.
5. При ошибке статус меняется на `error`.
6. Сообщение ошибки берется из `e.data.statusMessage`; если его нет, используется `Ошибка отправки`.

```ts
catch (e: any) {
  status.value = 'error'
  errorMsg.value = e?.data?.statusMessage ?? 'Ошибка отправки'
}
```

После успешной отправки форма скрывается и отображается сообщение:

```vue
<div v-if="status === 'success'" class="mt-md text-body text-charcoal">
  ✓ {{ successMsg }}
</div>
```

### Преобразование даты покупки

Если пользователь указал дату покупки, она преобразуется в ISO-строку:

```ts
purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined
```

Если дата не указана, поле `purchaseDate` отправляется как `undefined`.

## Зависимости

### Внутренние зависимости ManualOnline

- `~~/modules-sdk/types` — тип `ModuleDefinition` для описания подключаемого модуля.
- Система подключаемых instruction-модулей, которая использует:
  - `manifest`;
  - `PublicComponent`;
  - `dashboardNavItem`.
- UI-компоненты, используемые в шаблоне:
  - `UiInput`;
  - `UiAlert`;
  - `UiButton`.
- Публичный runtime Nuxt/Vue для:
  - `computed`;
  - `reactive`;
  - `ref`;
  - `$fetch`.

### API ManualOnline

- `POST /api/modules/warranty/register` — эндпоинт регистрации гарантии, вызываемый публичным компонентом.

Реализация этого эндпоинта в предоставленном фрагменте отсутствует.

### Внешние сервисы

В предоставленных файлах нет прямых зависимостей от внешних сервисов, Prisma, PostgreSQL, S3 или MinIO. Возможное хранение заявок на гарантию должно быть реализовано в API-роуте, но его код не предоставлен.

## Примеры использования

### 1. Конфигурация модуля с обязательным серийным номером

Пример конфигурации, соответствующий значениям по умолчанию:

```json
{
  "warrantyMonths": 12,
  "requirePhone": false,
  "requireSerial": true,
  "successMessage": "Спасибо! Гарантия зарегистрирована."
}
```

На публичной странице пользователь увидит:

- имя;
- email;
- серийный номер;
- дату покупки.

Поле телефона отображаться не будет.

### 2. Конфигурация с обязательным телефоном и гарантией на 24 месяца

```json
{
  "warrantyMonths": 24,
  "requirePhone": true,
  "requireSerial": true,
  "successMessage": "Готово! Ваша расширенная гарантия активирована."
}
```

В этом сценарии форма будет сообщать:

```text
Получите 24 месяцев расширенной гарантии бесплатно.
```

И потребует заполнить:

- имя;
- email;
- телефон;
- серийный номер.

После успешной отправки будет показано:

```text
✓ Готово! Ваша расширенная гарантия активирована.
```

## Замечания

- В предоставленном коде отсутствует реализация API-роута `POST /api/modules/warranty/register`, поэтому неизвестно:
  - где сохраняются регистрации;
  - какие серверные проверки выполняются;
  - есть ли защита от повторной отправки;
  - используется ли `viewerSessionId`;
  - как проверяются права и тариф `plus` на сервере.
- Prop `viewerSessionId` объявлен в `Public.vue`, но не используется при отправке формы.
- Обязательность полей на клиенте задается через атрибут `required`, но серверная валидация в предоставленном коде не показана.
- `customerPhone` и `serialNumber` отправляются как `undefined`, если поля пустые. Если соответствующие поля включены в конфигурации, их фактическая обязательность должна дополнительно проверяться на сервере.
- Формулировка `Получите {{ months }} месяцев` не учитывает склонение слова «месяц» для разных чисел.
- После успешной отправки форма не очищается, но скрывается за счет состояния `success`.
- Повторная отправка из текущего UI после успеха не предусмотрена.

---
module: warranty-registration
section: modules
generated: 2026-05-08
files: 2
---