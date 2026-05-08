# FAQ / «Вопрос — Ответ»

## Назначение

Модуль `faq` добавляет в инструкцию интерактивный блок часто задаваемых вопросов в формате аккордеона. Он используется как подключаемый модуль инструкции ManualOnline и настраивается отдельно для каждого экземпляра блока прямо в TipTap-редакторе.

## Ключевые возможности

- Отображение списка вопросов и ответов на публичной странице инструкции.
- Настройка заголовка FAQ-блока.
- Добавление, удаление и редактирование вопросов и ответов в редакторе.
- Изменение порядка вопросов с помощью кнопок «Вверх» и «Вниз».
- Опция раскрытия всех вопросов по умолчанию.
- Ограничение количества элементов FAQ: максимум 10 вопросов.
- Конфигурация хранится на уровне конкретного экземпляра модуля в инструкции, а не как tenant-wide настройка.
- Доступен на тарифе `free`.

## Архитектура

Модуль расположен в директории:

```text
instruction-modules/faq/
```

Состав файлов:

```text
instruction-modules/faq/
├── index.ts
├── EditorConfig.vue
└── Public.vue
```

### `index.ts`

Файл экспортирует определение подключаемого модуля через контракт `ModuleDefinition`.

Основные элементы:

- `manifest.code`: `faq`
- `manifest.name`: `Вопрос — Ответ (FAQ)`
- `manifest.description`: описание модуля для интерфейса выбора/управления модулями.
- `manifest.version`: `1.0.0`
- `manifest.requiresPlan`: `free`
- `manifest.configSchema`: JSON-like схема конфигурации экземпляра FAQ.
- `PublicComponent`: ленивый импорт публичного компонента `Public.vue`.
- `EditorConfigComponent`: ленивый импорт компонента настройки `EditorConfig.vue`.

В модуле намеренно отсутствует `configFields`, поэтому tenant-level форма настроек для администратора не формируется. Все настройки FAQ хранятся на конкретном узле инструкции как `configOverride`.

### `EditorConfig.vue`

Компонент настройки FAQ для редактора.

Он открывается в модальном окне из dropdown-меню `module-ref` через кнопку «Настроить». Компонент получает текущий `configOverride` через `v-model` и отправляет обновлённую конфигурацию обратно родительскому компоненту, который сохраняет её в атрибут TipTap-узла.

Отвечает за:

- редактирование заголовка блока;
- включение/выключение раскрытия всех вопросов по умолчанию;
- управление массивом FAQ-элементов;
- добавление новых вопросов;
- удаление вопросов;
- изменение порядка;
- обновление текста вопроса и ответа;
- ограничение количества вопросов до `MAX_ITEMS = 10`.

### `Public.vue`

Публичный компонент отображения FAQ на странице инструкции.

Компонент:

- принимает итоговую конфигурацию модуля;
- нормализует список вопросов и ответов;
- отбрасывает полностью пустые элементы;
- отображает блок только если после фильтрации есть хотя бы один элемент;
- реализует аккордеон через локальное состояние `openIndex`;
- поддерживает начальное раскрытие всех элементов через `expandedByDefault`.

Компонент использует обычные `div`, а не `ul/li`, чтобы стили `.prose-mo` публичной страницы не влияли на отображение списков.

## API / Интерфейс

### Nitro API

В представленном коде модуля Nitro route-файлы отсутствуют. HTTP-эндпоинты для `faq` не определены.

### SDK-контракт модуля

Модуль реализует контракт `ModuleDefinition` из:

```ts
import type { ModuleDefinition } from '~~/modules-sdk/types'
```

Определение:

```ts
const definition: ModuleDefinition = {
  manifest: {
    code: 'faq',
    name: 'Вопрос — Ответ (FAQ)',
    description: 'Аккордеон с вопросами и ответами. Настраивается прямо в редакторе кнопкой «Настроить».',
    version: '1.0.0',
    requiresPlan: 'free',
    configSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', default: 'Часто задаваемые вопросы' },
        expandedByDefault: { type: 'boolean', default: false },
        items: {
          type: 'array',
          maxItems: 10,
          default: [],
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              answer: { type: 'string' }
            },
            required: ['question', 'answer']
          }
        }
      }
    }
  },
  PublicComponent: () => import('./Public.vue'),
  EditorConfigComponent: () => import('./EditorConfig.vue')
}
```

### Конфигурация модуля

Формат конфигурации:

```ts
interface FaqConfig {
  title?: string
  expandedByDefault?: boolean
  items?: FaqItem[]
}

interface FaqItem {
  question: string
  answer: string
}
```

Поля:

| Поле | Тип | Значение по умолчанию | Описание |
|---|---|---:|---|
| `title` | `string` | `Часто задаваемые вопросы` | Заголовок FAQ-блока |
| `expandedByDefault` | `boolean` | `false` | Раскрывать ли все элементы при первом отображении |
| `items` | `FaqItem[]` | `[]` | Список вопросов и ответов |
| `items[].question` | `string` | — | Текст вопроса |
| `items[].answer` | `string` | — | Текст ответа |

Ограничение схемы:

```ts
maxItems: 10
```

### `EditorConfig.vue`

#### Props

```ts
const props = defineProps<{
  modelValue: Record<string, any>
}>()
```

| Prop | Тип | Описание |
|---|---|---|
| `modelValue` | `Record<string, any>` | Текущая конфигурация экземпляра FAQ, обычно `configOverride` TipTap-узла |

#### Events

```ts
const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()
```

| Event | Payload | Описание |
|---|---|---|
| `update:modelValue` | `Record<string, any>` | Отправляет обновлённую конфигурацию родительскому компоненту |

#### Slots

Slots в компоненте не используются.

#### Вычисляемые поля

##### `title`

```ts
const title = computed({
  get: () => String(props.modelValue?.title ?? 'Часто задаваемые вопросы'),
  set: (v: string) => emit('update:modelValue', { ...props.modelValue, title: v })
})
```

Возвращает строковый заголовок. Если значение не задано, используется дефолтный текст.

##### `expandedByDefault`

```ts
const expandedByDefault = computed({
  get: () => Boolean(props.modelValue?.expandedByDefault ?? false),
  set: (v: boolean) => emit('update:modelValue', { ...props.modelValue, expandedByDefault: v })
})
```

Возвращает булево значение для режима начального раскрытия.

##### `items`

```ts
const items = computed<FaqItem[]>(() => {
  const raw = props.modelValue?.items
  return Array.isArray(raw)
    ? raw.slice(0, MAX_ITEMS).map((it: any) => ({
        question: String(it?.question ?? ''),
        answer: String(it?.answer ?? '')
      }))
    : []
})
```

Нормализует массив элементов:

- если `items` не массив — возвращается пустой массив;
- массив обрезается до `MAX_ITEMS`;
- `question` и `answer` приводятся к строкам.

#### Основные методы

| Метод | Назначение |
|---|---|
| `commitItems(next)` | Сохраняет новый массив элементов, дополнительно обрезая его до 10 элементов |
| `addItem()` | Добавляет пустой FAQ-элемент, если лимит не превышен |
| `removeItem(i)` | Удаляет элемент по индексу |
| `moveUp(i)` | Перемещает элемент вверх |
| `moveDown(i)` | Перемещает элемент вниз |
| `updateField(i, key, value)` | Обновляет поле `question` или `answer` у элемента |

### `Public.vue`

#### Props

```ts
const props = defineProps<{
  instructionId: string
  config: Record<string, any>
  viewerSessionId: string
}>()
```

| Prop | Тип | Описание |
|---|---|---|
| `instructionId` | `string` | Идентификатор инструкции. В текущем коде компонента напрямую не используется |
| `config` | `Record<string, any>` | Итоговая конфигурация FAQ-блока |
| `viewerSessionId` | `string` | Идентификатор сессии просмотра. В текущем коде компонента напрямую не используется |

#### Events

Компонент не объявляет пользовательские события.

#### Slots

Slots не используются.

#### Состояние

```ts
const openIndex = ref<Set<number>>(
  new Set(expandedByDefault.value ? items.value.map((_, i) => i) : [])
)
```

`openIndex` хранит индексы раскрытых FAQ-элементов.

#### Поведение аккордеона

```ts
function toggle(i: number) {
  const next = new Set(openIndex.value)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  openIndex.value = next
}
```

Каждый элемент может быть раскрыт или закрыт независимо от остальных. Это не single-open accordion: одновременно может быть открыто несколько вопросов.

## Бизнес-логика

### Хранение настроек

Модуль не имеет глобальной tenant-wide конфигурации. Все настройки хранятся на уровне экземпляра блока внутри инструкции.

Это явно указано в комментарии к `index.ts`:

```ts
// There is no tenant-wide config: each FAQ block is authored where it's placed.
```

### Доступность по тарифу

В манифесте указан тариф:

```ts
requiresPlan: 'free'
```

Следовательно, модуль доступен начиная с бесплатного тарифа.

### Ограничение количества элементов

Максимальное количество FAQ-элементов — 10.

Ограничение задано в двух местах:

1. В редакторе:

```ts
const MAX_ITEMS = 10
```

2. В схеме конфигурации:

```ts
maxItems: 10
```

В редакторе кнопка «Добавить» становится недоступной при достижении лимита:

```vue
:disabled="items.length >= MAX_ITEMS"
```

Также при сохранении массива используется защитное обрезание:

```ts
items: next.slice(0, MAX_ITEMS)
```

### Нормализация данных в редакторе

При чтении `items` компонент `EditorConfig.vue`:

- проверяет, что значение является массивом;
- обрезает массив до 10 элементов;
- приводит `question` и `answer` к строкам;
- для отсутствующих значений использует пустую строку.

Это снижает риск ошибок при работе с неполной или некорректной конфигурацией.

### Нормализация данных на публичной странице

В `Public.vue` элементы также приводятся к строкам и очищаются от пробелов по краям:

```ts
.map((it: any) => ({
  question: String(it?.question ?? '').trim(),
  answer: String(it?.answer ?? '').trim()
}))
```

После этого полностью пустые элементы фильтруются:

```ts
.filter((it) => it.question || it.answer)
```

FAQ-блок не рендерится, если после фильтрации список пуст:

```vue
<section v-if="items.length" class="my-section-sm" data-module="faq">
```

### Раскрытие по умолчанию

Если `expandedByDefault` равно `true`, при инициализации публичного компонента открываются все элементы:

```ts
new Set(expandedByDefault.value ? items.value.map((_, i) => i) : [])
```

Если значение отсутствует или ложно, все элементы изначально закрыты.

### Отображение ответа

Ответ отображается только если:

- элемент раскрыт;
- поле `answer` не пустое.

```vue
<div v-if="openIndex.has(i) && item.answer">
  {{ item.answer }}
</div>
```

Для текста ответа используется `whitespace-pre-line`, поэтому переносы строк в textarea сохраняются при отображении.

## Зависимости

### Внутренние зависимости ManualOnline

- `~~/modules-sdk/types` — тип `ModuleDefinition` для регистрации подключаемого модуля.
- Система подключаемых instruction modules — загружает `PublicComponent` и `EditorConfigComponent`.
- TipTap-редактор / module-ref node — по комментариям в коде, именно через него открывается модальное окно настройки, а конфигурация сохраняется в атрибут узла как `configOverride`.
- UI-инфраструктура Nuxt/Vue — используется Vue 3 Composition API через `<script setup>`.
- Компонент `Icon` — используется для иконок:
  - `lucide:plus`
  - `lucide:arrow-up`
  - `lucide:arrow-down`
  - `lucide:trash-2`
  - `lucide:chevron-down`

### Внешние сервисы

В представленном коде модуль не обращается к внешним сервисам. Нет прямых зависимостей от Prisma, PostgreSQL, S3/MinIO или HTTP API.

### CSS / дизайн-токены

Компоненты используют utility-классы и дизайн-токены проекта:

- `text-ink`
- `text-steel`
- `text-charcoal`
- `border-hairline`
- `bg-canvas`
- `bg-surface`
- `text-h3`
- `text-h5`
- `text-body`
- `my-section-sm`
- `spacing`-подобные классы: `mb-md`, `py-md`, `gap-md`, `pr-xxl` и др.

В комментарии `Public.vue` указано соответствие Notion-like token spec для `faq-accordion-item`.

## Примеры использования

### Пример конфигурации FAQ-блока

```json
{
  "title": "Часто задаваемые вопросы",
  "expandedByDefault": false,
  "items": [
    {
      "question": "Как включить устройство?",
      "answer": "Подключите устройство к питанию и удерживайте кнопку включения 3 секунды."
    },
    {
      "question": "Можно ли мыть аксессуар водой?",
      "answer": "Да, но перед очисткой отключите устройство от сети и не погружайте основной блок в воду."
    }
  ]
}
```

### Сценарий настройки в редакторе

1. Автор инструкции добавляет модуль `faq` в TipTap-редактор.
2. В меню блока нажимает «Настроить».
3. В модальном окне задаёт заголовок, например `Вопросы по эксплуатации`.
4. Добавляет до 10 вопросов и ответов.
5. При необходимости меняет порядок вопросов кнопками со стрелками.
6. Сохраняемая конфигурация попадает в `configOverride` конкретного module-ref узла.
7. На публичной странице инструкция отображает FAQ как интерактивный аккордеон.

## Замечания

- В коде нет tenant-wide настроек модуля: это сделано намеренно. Отсутствие `configFields` означает пустую форму администрирования на уровне продавца/тенанта.
- `instructionId` и `viewerSessionId` передаются в `Public.vue`, но в текущей реализации не используются. Возможно, они нужны для унифицированного интерфейса публичных компонентов модулей или будущей аналитики.
- В публичном компоненте `openIndex` инициализируется один раз на основе начальных `items` и `expandedByDefault`. Если `config` изменится уже после монтирования компонента, набор открытых элементов автоматически не пересобирается.
- Ответы отображаются как plain text через интерполяцию Vue, без Markdown/HTML-рендеринга. Это безопасно с точки зрения HTML-инъекций, но ограничивает форматирование.
- В редакторе нет явной валидации на обязательность непустого вопроса или ответа. Пустые элементы можно создать, но на публичной странице полностью пустые записи будут отфильтрованы.
- Код модуля представлен полностью в объёме 3 файлов; дополнительных API-роутов, composables или сервисных функций для `faq` в исходных данных нет.

---
module: faq
section: modules
generated: 2026-05-08
files: 3
---