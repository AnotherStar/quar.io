# Обратная связь (`feedback`)

## Назначение

Модуль `feedback` добавляет в публичную инструкцию форму обратной связи с полями ФИО, телефон, email, Telegram и сообщение. В ManualOnline он используется как подключаемый блок инструкции, позволяющий посетителю отправить обращение продавцу или владельцу инструкции.

## Ключевые возможности

- Публичная форма обратной связи внутри инструкции.
- Поддержка полей:
  - ФИО;
  - телефон;
  - email;
  - Telegram;
  - сообщение.
- Настройка заголовка, описания, email получателя и обязательности полей.
- Единая tenant-wide конфигурация для всех экземпляров модуля.
- Отсутствие per-instance настроек в редакторе инструкции.
- Отображение состояния загрузки, ошибки и успешной отправки.
- Доступен на тарифе `free`.
- Добавляет пункт навигации в dashboard: `/dashboard/modules/feedback`.

## Архитектура

Модуль состоит из двух файлов:

```text
instruction-modules/feedback/
├── index.ts
└── Public.vue
```

### `index.ts`

Файл экспортирует `ModuleDefinition` для SDK подключаемых модулей ManualOnline.

Основные части определения:

- `manifest` — метаданные и схема конфигурации модуля.
- `PublicComponent` — публичный Vue-компонент, отображаемый на странице инструкции.
- `dashboardNavItem` — пункт навигации в dashboard для настройки модуля.
- `EditorConfigComponent` отсутствует намеренно.

```ts
const definition: ModuleDefinition = {
  manifest: {
    code: 'feedback',
    name: 'Обратная связь',
    description: '...',
    version: '1.0.0',
    requiresPlan: 'free',
    configSchema: { ... },
    configFields: [ ... ]
  },
  PublicComponent: () => import('./Public.vue'),
  dashboardNavItem: {
    to: '/dashboard/modules/feedback',
    label: 'Обратная связь',
    icon: 'lucide:mail'
  }
}
```

Ключевая архитектурная особенность: модуль не поддерживает индивидуальную настройку каждого блока в редакторе. Все параметры задаются централизованно в разделе dashboard-модулей и применяются ко всем блокам `feedback`.

### `Public.vue`

Публичный компонент отвечает за:

- чтение конфигурации модуля из `props.config`;
- отображение формы;
- применение флагов обязательности полей;
- отправку данных на API;
- отображение статусов `idle`, `loading`, `success`, `error`.

Компонент использует Composition API:

```ts
const title = computed(() => String(props.config?.title ?? 'Свяжитесь с нами'))
const requireFio = computed(() => Boolean(props.config?.requireFio ?? true))
```

Форма хранится в `reactive`-объекте:

```ts
const form = reactive({
  fio: '',
  phone: '',
  email: '',
  telegram: '',
  message: ''
})
```

Отправка выполняется через `$fetch`:

```ts
await $fetch('/api/modules/feedback/submit', {
  method: 'POST',
  body: {
    instructionId: props.instructionId,
    fio: form.fio || undefined,
    phone: form.phone || undefined,
    email: form.email || undefined,
    telegram: form.telegram || undefined,
    message: form.message || undefined
  }
})
```

После успешной отправки содержимое формы заменяется сообщением об успехе.

## API / Интерфейс

### SDK-контракт модуля

Модуль реализует контракт `ModuleDefinition` из:

```ts
import type { ModuleDefinition } from '~~/modules-sdk/types'
```

#### Manifest

| Поле | Значение |
|---|---|
| `code` | `feedback` |
| `name` | `Обратная связь` |
| `version` | `1.0.0` |
| `requiresPlan` | `free` |
| `PublicComponent` | `./Public.vue` |
| `EditorConfigComponent` | отсутствует |
| `dashboardNavItem.to` | `/dashboard/modules/feedback` |

### Конфигурация модуля

Конфигурация описана через `configSchema` и `configFields`.

#### `configSchema`

```ts
{
  type: 'object',
  properties: {
    title: { type: 'string', default: 'Свяжитесь с нами' },
    description: {
      type: 'string',
      default: 'Оставьте сообщение — мы ответим в течение рабочего дня.'
    },
    recipientEmail: { type: 'string', format: 'email' },
    requireFio: { type: 'boolean', default: true },
    requirePhone: { type: 'boolean', default: false },
    requireEmail: { type: 'boolean', default: true },
    requireTelegram: { type: 'boolean', default: false },
    requireMessage: { type: 'boolean', default: true },
    successMessage: {
      type: 'string',
      default: 'Спасибо! Ваше сообщение получено.'
    }
  }
}
```

#### Поля настройки в dashboard

| Ключ | Название | Тип | Обязательное | Значение по умолчанию |
|---|---|---|---|---|
| `title` | Заголовок формы | `string` | нет | `Свяжитесь с нами` |
| `description` | Подзаголовок | `string` | нет | `Оставьте сообщение — мы ответим в течение рабочего дня.` |
| `recipientEmail` | Email получателя | `string` | да | — |
| `requireFio` | ФИО — обязательное поле | `boolean` | нет | `true` |
| `requirePhone` | Телефон — обязательное поле | `boolean` | нет | `false` |
| `requireEmail` | Email — обязательное поле | `boolean` | нет | `true` |
| `requireTelegram` | Telegram — обязательное поле | `boolean` | нет | `false` |
| `requireMessage` | Сообщение — обязательное поле | `boolean` | нет | `true` |
| `successMessage` | Сообщение об успехе | `string` | нет | `Спасибо! Ваше сообщение получено.` |

### Vue-компонент `Public.vue`

#### Props

```ts
const props = defineProps<{
  instructionId: string
  config: Record<string, any>
  viewerSessionId: string
}>()
```

| Prop | Тип | Назначение |
|---|---|---|
| `instructionId` | `string` | Идентификатор инструкции, передаётся в API при отправке формы |
| `config` | `Record<string, any>` | Конфигурация модуля |
| `viewerSessionId` | `string` | Идентификатор сессии просмотра; в текущем компоненте не используется |

#### Events

Компонент не объявляет пользовательских событий через `defineEmits`.

#### Slots

Компонент не использует slots.

#### Внутренние состояния

```ts
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
```

| Статус | Значение |
|---|---|
| `idle` | Начальное состояние формы |
| `loading` | Выполняется отправка |
| `success` | Сообщение успешно отправлено |
| `error` | Ошибка при отправке |

### API endpoint

В исходных файлах Nitro route для обработки отправки не предоставлен. Однако из `Public.vue` видно, что компонент обращается к следующему endpoint:

| Метод | Endpoint | Источник |
|---|---|---|
| `POST` | `/api/modules/feedback/submit` | вызов `$fetch` в `Public.vue` |

Тело запроса:

```ts
{
  instructionId: string,
  fio?: string,
  phone?: string,
  email?: string,
  telegram?: string,
  message?: string
}
```

Поля формы передаются как `undefined`, если пользователь оставил их пустыми:

```ts
fio: form.fio || undefined
```

Формат ответа API в предоставленном коде не описан. При ошибке компонент ожидает, что сервер может вернуть `statusMessage` в `e.data.statusMessage`.

## Бизнес-логика

### Единая конфигурация для всех блоков

Модуль намеренно не имеет `EditorConfigComponent`. Это означает, что в редакторе инструкции у блока нет кнопки или формы индивидуальной настройки.

Комментарий в `index.ts` явно фиксирует это правило:

```ts
// Per-instance config is intentionally absent
```

Все настройки задаются на уровне tenant-wide admin form в разделе:

```text
/dashboard/modules
```

или через dashboard-пункт конкретного модуля:

```text
/dashboard/modules/feedback
```

Эти настройки наследуются каждым блоком модуля `feedback`.

### Обязательные поля

Обязательность полей определяется конфигурацией:

- `requireFio`
- `requirePhone`
- `requireEmail`
- `requireTelegram`
- `requireMessage`

В публичной форме эти значения используются для установки HTML-атрибута `required`:

```vue
<UiInput v-model="form.email" type="email" label="Email" :required="requireEmail" />
```

Для поля сообщения обязательность отображается вручную через звёздочку:

```vue
Сообщение<span v-if="requireMessage" class="text-error">&nbsp;*</span>
```

и также применяется к `textarea`:

```vue
<textarea :required="requireMessage" />
```

Серверная валидация в предоставленном коде не показана.

### Значения по умолчанию

Если часть конфигурации отсутствует, компонент использует fallback-значения:

| Параметр | Значение по умолчанию |
|---|---|
| `title` | `Свяжитесь с нами` |
| `description` | пустая строка в компоненте |
| `successMessage` | `Спасибо! Ваше сообщение получено.` |
| `requireFio` | `true` |
| `requirePhone` | `false` |
| `requireEmail` | `true` |
| `requireTelegram` | `false` |
| `requireMessage` | `true` |

Важно: в `configSchema` для `description` задано значение по умолчанию `Оставьте сообщение — мы ответим в течение рабочего дня.`, но в `Public.vue` fallback — пустая строка:

```ts
const description = computed(() => String(props.config?.description ?? ''))
```

То есть при отсутствии нормализованной конфигурации на стороне вызывающего кода описание может не отображаться.

### Отправка формы

Алгоритм отправки:

1. Пользователь заполняет форму.
2. Срабатывает `submit` на форме.
3. Компонент переводит статус в `loading`.
4. Ошибка сбрасывается:

   ```ts
   errorMsg.value = null
   ```

5. Выполняется POST-запрос на `/api/modules/feedback/submit`.
6. При успехе статус становится `success`.
7. При ошибке:
   - статус становится `error`;
   - текст ошибки берётся из `e.data.statusMessage`;
   - если его нет, используется fallback `Ошибка отправки`.

```ts
catch (e: any) {
  status.value = 'error'
  errorMsg.value = e?.data?.statusMessage ?? 'Ошибка отправки'
}
```

### Поведение после успешной отправки

После успешной отправки форма полностью скрывается. Вместо неё отображается блок с сообщением об успехе:

```vue
<div v-if="status === 'success'">
  <span>✓</span>
  <span>{{ successMsg }}</span>
</div>
```

Комментарий в шаблоне объясняет причину: если оставить заголовок и описание после отправки, интерфейс может выглядеть так, будто форма всё ещё ожидает ввода.

### Тарифные ограничения

Модуль доступен на бесплатном тарифе:

```ts
requiresPlan: 'free'
```

Дополнительные ограничения тарифов в предоставленном коде отсутствуют.

## Зависимости

### Внутренние зависимости ManualOnline

- `~~/modules-sdk/types` — тип `ModuleDefinition`.
- Система подключаемых instruction modules.
- Dashboard-раздел модулей:
  - `/dashboard/modules`;
  - `/dashboard/modules/feedback`.
- Публичный runtime страницы инструкции, который передаёт в компонент:
  - `instructionId`;
  - `config`;
  - `viewerSessionId`.
- UI-компоненты дизайн-системы:
  - `UiInput`;
  - `UiAlert`;
  - `UiButton`.

### API

- `/api/modules/feedback/submit` — endpoint отправки формы. Реализация route-файла в предоставленном коде отсутствует.

### Внешние сервисы

В предоставленных файлах прямые обращения к внешним сервисам не показаны.

Из конфигурации видно наличие поля `recipientEmail`, но механизм отправки письма, почтовый провайдер или очередь сообщений в исходном коде модуля не представлены.

## Примеры использования

### Сценарий 1. Включение формы обратной связи для всех инструкций

1. Администратор или продавец открывает раздел:

   ```text
   /dashboard/modules/feedback
   ```

2. Указывает email получателя:

   ```text
   support@example.com
   ```

3. Настраивает обязательные поля, например:
   - ФИО — обязательно;
   - Email — обязательно;
   - Сообщение — обязательно;
   - Телефон и Telegram — необязательно.

4. Добавляет блок `feedback` в инструкции.

Все блоки этого модуля будут использовать одну и ту же конфигурацию.

### Сценарий 2. Отправка обращения пользователем

Пользователь на публичной странице инструкции видит форму:

```text
Свяжитесь с нами
Оставьте сообщение — мы ответим в течение рабочего дня.

ФИО *
Телефон
Email *
Telegram
Сообщение *
[Отправить]
```

При нажатии на кнопку выполняется запрос:

```http
POST /api/modules/feedback/submit
Content-Type: application/json
```

Пример тела запроса:

```json
{
  "instructionId": "instr_123",
  "fio": "Иван Иванов",
  "phone": "+79990000000",
  "email": "ivan@example.com",
  "telegram": "@ivan",
  "message": "Не получается выполнить шаг 3 инструкции."
}
```

После успешной обработки форма заменяется сообщением:

```text
✓ Спасибо! Ваше сообщение получено.
```

## Замечания

- В модуле намеренно отсутствует `EditorConfigComponent`; индивидуальные настройки конкретного блока не поддерживаются.
- `viewerSessionId` передаётся в `Public.vue`, но в текущей реализации не используется.
- В `Public.vue` fallback для `description` отличается от default-значения в `configSchema`: компонент использует пустую строку, а схема — текст `Оставьте сообщение — мы ответим в течение рабочего дня.`.
- Серверный обработчик `/api/modules/feedback/submit` не включён в предоставленный код, поэтому невозможно подтвердить:
  - серверную валидацию обязательных полей;
  - проверку `recipientEmail`;
  - механизм отправки уведомления;
  - защиту от спама;
  - логирование или аналитику обращений.
- Клиентская обязательность полей основана на HTML-атрибуте `required`; её нельзя считать достаточной без серверной проверки.
- После успешной отправки форма не очищается явно, но она скрывается состоянием `success`.

---
module: feedback
section: modules
generated: 2026-05-08
files: 2
---