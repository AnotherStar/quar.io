# components-ui

## Назначение

Модуль `components-ui` содержит базовые переиспользуемые Vue-компоненты интерфейса из директории `components/ui`. Эти компоненты формируют визуальный фундамент quar.io: кнопки, карточки, бейджи, уведомления, поля ввода и строку для копирования/скачивания URL с QR-кодом.

## Ключевые возможности

- Единый набор UI-компонентов для страниц Nuxt 3 / Vue 3.
- Поддержка дизайн-токенов проекта через utility-классы и CSS-переменные.
- Типизированные props на TypeScript для вариантов отображения, размеров и состояний.
- Универсальная кнопка `UiButton`, работающая как:
  - обычный `<button>`;
  - ссылка `<a>`;
  - `NuxtLink`.
- Компонент `UiCopyableUrl` для:
  - копирования URL в буфер обмена;
  - скачивания QR-кода;
  - кастомного отображения URL через scoped slot.
- Простые состояния ошибок и подсказок для `UiInput`.
- Набор визуальных вариантов для alert, badge и card-компонентов.

## Архитектура

Модуль представлен набором Vue Single File Components в директории:

```text
components/
└── ui/
    ├── UiAlert.vue
    ├── UiBadge.vue
    ├── UiButton.vue
    ├── UiCard.vue
    ├── UiCopyableUrl.vue
    └── UiInput.vue
```

### Общий подход

Все компоненты реализованы через `<script setup lang="ts">`, используют Composition API и типизированные props. Компоненты не содержат серверной логики, API-роутов, Prisma-запросов или прямых обращений к backend-сервисам.

Стили задаются через классы, предположительно основанные на Tailwind CSS и дизайн-системе quar.io:

- `bg-primary`
- `text-charcoal`
- `border-hairline`
- `bg-tint-*`
- `text-body-sm`
- `rounded-md`
- и другие utility-классы проекта.

### Компоненты

#### `UiAlert.vue`

Компонент уведомления с цветовой схемой по типу сообщения.

Поддерживает виды:

- `info`
- `success`
- `warning`
- `error`

Внутри использует объект `kindClass`, который сопоставляет тип уведомления с CSS-классами.

#### `UiBadge.vue`

Компонент компактного бейджа или тега.

Поддерживает несколько визуальных вариантов:

- основные бейджи: `purple`, `pink`, `orange`, `popular`;
- теги: `tag-purple`, `tag-orange`, `tag-green`.

Контент передается через default slot.

#### `UiButton.vue`

Универсальная кнопка с несколькими вариантами оформления и размерами.

Компонент сам выбирает HTML-тег:

```ts
const Tag = computed(() => (
  props.to
    ? resolveComponent('NuxtLink')
    : props.href
      ? 'a'
      : 'button'
))
```

Логика выбора:

| Условие | Результирующий элемент |
|---|---|
| Передан `to` | `NuxtLink` |
| Передан `href`, но нет `to` | `<a>` |
| Не переданы `to` и `href` | `<button>` |

Поддерживает состояния `disabled`, `loading` и `block`.

#### `UiCard.vue`

Компонент карточки-контейнера.

Позволяет управлять:

- цветовым фоном через `tint`;
- внутренними отступами через `padded`;
- наличием рамки через `bordered`.

Рамка применяется только при `tint === 'canvas'`.

#### `UiCopyableUrl.vue`

Компонент строки URL с действиями:

- копирование URL в буфер обмена;
- скачивание QR-кода в формате PNG.

QR-код генерируется лениво: библиотека `qrcode` импортируется динамически только при вызове скачивания:

```ts
const QRCode = (await import('qrcode')).default
```

Это уменьшает initial bundle для страниц, где пользователь не скачивает QR-код.

Компонент хранит локальные состояния:

- `copied` — кратковременное состояние успешного копирования;
- `downloading` — состояние генерации QR;
- `error` — текст ошибки копирования или генерации.

#### `UiInput.vue`

Базовое поле ввода с поддержкой:

- `v-model`;
- label;
- placeholder;
- hint;
- error;
- required indicator;
- disabled state;
- prefix-секции перед input.

Компонент эмитит событие `update:modelValue`.

## API / Интерфейс

В модуле нет Nitro route-файлов и HTTP API. Интерфейс модуля представлен Vue-компонентами.

---

### `UiAlert`

#### Props

| Prop | Тип | По умолчанию | Описание |
|---|---:|---:|---|
| `kind` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | Тип уведомления и цветовая схема |
| `title` | `string` | `undefined` | Необязательный заголовок уведомления |

#### Slots

| Slot | Описание |
|---|---|
| `default` | Основной текст или произвольный контент уведомления |

#### Пример

```vue
<UiAlert kind="success" title="Инструкция опубликована">
  Публичная страница инструкции доступна покупателям.
</UiAlert>
```

---

### `UiBadge`

#### Props

| Prop | Тип | По умолчанию | Описание |
|---|---:|---:|---|
| `variant` | `'purple' \| 'pink' \| 'orange' \| 'tag-purple' \| 'tag-orange' \| 'tag-green' \| 'popular'` | `'purple'` | Визуальный вариант бейджа |

#### Slots

| Slot | Описание |
|---|---|
| `default` | Текст или содержимое бейджа |

#### Пример

```vue
<UiBadge variant="tag-green">
  Активно
</UiBadge>
```

---

### `UiButton`

#### Props

| Prop | Тип | По умолчанию | Описание |
|---|---:|---:|---|
| `variant` | `'primary' \| 'dark' \| 'secondary' \| 'on-dark' \| 'secondary-on-dark' \| 'ghost' \| 'link'` | `'primary'` | Вариант оформления |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Размер кнопки |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | HTML-тип кнопки, применяется только для `<button>` |
| `to` | `string` | `undefined` | Nuxt route target, при наличии используется `NuxtLink` |
| `href` | `string` | `undefined` | Внешняя или обычная ссылка, используется `<a>`, если нет `to` |
| `disabled` | `boolean` | `false` | Отключенное состояние |
| `loading` | `boolean` | `false` | Состояние загрузки; также отключает кнопку |
| `block` | `boolean` | `false` | Растягивает кнопку на всю ширину |

#### Slots

| Slot | Описание |
|---|---|
| `default` | Контент кнопки |

#### Особенности

- Если `loading === true`, внутри отображается спиннер.
- `disabled` вычисляется как `disabled || loading`.
- Для варианта `link` не применяются классы размера `sizeClass`.

#### Пример

```vue
<UiButton type="submit" :loading="saving">
  Сохранить инструкцию
</UiButton>

<UiButton variant="secondary" to="/dashboard/instructions">
  К списку инструкций
</UiButton>
```

---

### `UiCard`

#### Props

| Prop | Тип | По умолчанию | Описание |
|---|---:|---:|---|
| `tint` | `'canvas' \| 'peach' \| 'rose' \| 'mint' \| 'lavender' \| 'sky' \| 'yellow' \| 'yellow-bold' \| 'cream' \| 'gray'` | `'canvas'` | Фоновый оттенок карточки |
| `padded` | `'sm' \| 'md' \| 'lg'` | `'md'` | Размер внутренних отступов |
| `bordered` | `boolean` | `true` | Включает рамку для `canvas`-карточек |

#### Slots

| Slot | Описание |
|---|---|
| `default` | Контент карточки |

#### Пример

```vue
<UiCard tint="lavender" padded="lg">
  <h2 class="text-body-md">Совет</h2>
  <p class="text-body-sm">
    Добавьте изображения к каждому шагу инструкции.
  </p>
</UiCard>
```

---

### `UiCopyableUrl`

#### Props

| Prop | Тип | По умолчанию | Описание |
|---|---:|---:|---|
| `url` | `string` | обязательный | URL, который копируется и кодируется в QR |
| `qrFilename` | `string` | `undefined` | Имя файла PNG без расширения |
| `qrSize` | `number` | `512` | Размер QR-кода в пикселях |
| `hideQr` | `boolean` | `false` | Скрывает кнопку скачивания QR |

#### Slots

| Slot | Props | Описание |
|---|---|---|
| `default` | `{ url: string }` | Кастомное отображение URL |

Если slot не передан, отображается plain text URL:

```vue
<slot :url="url">{{ url }}</slot>
```

#### Поведение

- Кнопка копирования вызывает `navigator.clipboard.writeText(props.url)`.
- После успешного копирования иконка меняется на `lucide:check` на 1500 мс.
- QR-код скачивается как PNG.
- Если `qrFilename` не передан, имя файла выводится из pathname URL.
- При ошибке отображается текст ошибки под строкой.

#### Алгоритм генерации имени файла

Если `qrFilename` передан, используется он.

Иначе компонент пытается распарсить URL:

```ts
const u = new URL(props.url)
const slug = u.pathname
  .replace(/^\/+|\/+$/g, '')
  .replace(/\//g, '-') || u.hostname

return `qr-${slug || 'link'}`
```

Если URL некорректен, используется:

```text
qr-code.png
```

#### Пример

```vue
<UiCopyableUrl
  url="https://manualonline.example/instructions/kettle-123"
  qr-filename="kettle-123"
/>
```

Пример с кастомным отображением URL:

```vue
<UiCopyableUrl :url="publicUrl">
  <template #default="{ url }">
    <NuxtLink :to="url" class="text-link truncate">
      {{ url }}
    </NuxtLink>
  </template>
</UiCopyableUrl>
```

---

### `UiInput`

#### Props

| Prop | Тип | По умолчанию | Описание |
|---|---:|---:|---|
| `modelValue` | `string \| number` | `undefined` | Значение поля |
| `label` | `string` | `undefined` | Подпись над полем |
| `type` | `string` | `'text'` | HTML type input |
| `placeholder` | `string` | `undefined` | Placeholder |
| `hint` | `string` | `undefined` | Подсказка под полем |
| `error` | `string` | `undefined` | Сообщение ошибки |
| `required` | `boolean` | `false` | Отображает `*` и прокидывает `required` в input |
| `autocomplete` | `string` | `undefined` | Значение атрибута `autocomplete` |
| `disabled` | `boolean` | `false` | Отключает поле |
| `prefix` | `string` | `undefined` | Префикс перед input |

#### Events

| Event | Payload | Описание |
|---|---|---|
| `update:modelValue` | `string` | Эмитится при вводе значения |

#### Пример

```vue
<UiInput
  v-model="productName"
  label="Название товара"
  placeholder="Например, Электрический чайник"
  required
  :error="errors.productName"
/>
```

Пример с префиксом:

```vue
<UiInput
  v-model="slug"
  label="Публичный адрес"
  prefix="quar.io/i/"
  placeholder="kettle-123"
/>
```

## Бизнес-логика

Модуль содержит только клиентскую UI-логику. Бизнес-правил публикации инструкций, тарифных ограничений, проверок прав доступа или серверных статусов в коде нет.

Тем не менее, в компонентах есть несколько прикладных правил поведения.

### `UiAlert`

- Если `title` не передан, заголовок не рендерится.
- Цветовая схема полностью определяется prop `kind`.
- По умолчанию используется информационное уведомление `info`.

### `UiBadge`

- Вариант `popular` визуально совпадает с `purple`:
  - `bg-primary`
  - `text-white`
  - `rounded-full`
  - `text-caption-bold`

### `UiButton`

- `to` имеет приоритет над `href`.
- Если передан `to`, используется `NuxtLink`.
- Если передан `href` и не передан `to`, используется `<a>`.
- Если не переданы `to` и `href`, используется `<button>`.
- При `loading`:
  - показывается индикатор загрузки;
  - элемент получает `disabled`;
  - кнопка становится недоступной для повторного нажатия, если это нативная button-семантика.
- При `block` добавляется класс `w-full`.

### `UiCard`

- Рамка добавляется только если одновременно выполняются условия:
  - `bordered === true`;
  - `tint === 'canvas'`.

Это означает, что tinted-карточки (`peach`, `mint`, `lavender` и др.) не получают рамку даже при `bordered: true`.

### `UiCopyableUrl`

- Копирование URL использует Clipboard API браузера.
- Ошибка копирования сохраняется в `error` и выводится пользователю.
- Состояние `copied` сбрасывается через 1500 мс.
- QR-код генерируется только по клику на кнопку скачивания.
- При генерации QR:
  - используется размер `qrSize`;
  - margin равен `2`;
  - `errorCorrectionLevel` установлен в `'M'`;
  - темный цвет: `#1a1a1a`;
  - светлый цвет: `#ffffff`.
- Во время генерации QR кнопка скачивания отключается и показывает spinner.
- Если `hideQr === true`, кнопка скачивания QR не отображается.

### `UiInput`

- Если передан `error`, поле получает класс ошибки и показывает сообщение ошибки.
- Если одновременно переданы `hint` и `error`, отображается только `error`.
- `type` по умолчанию — `text`.
- Несмотря на то что `modelValue` допускает `string | number`, событие `update:modelValue` всегда эмитит строку из `HTMLInputElement.value`.

## Зависимости

### Внутренние зависимости quar.io

В коде напрямую используются внутренние дизайн-токены и CSS-классы проекта:

- цветовые токены:
  - `bg-primary`
  - `bg-brand-pink`
  - `bg-brand-orange`
  - `bg-tint-mint`
  - `bg-tint-lavender`
  - `bg-tint-peach`
  - `bg-canvas`
  - `bg-surface`
- текстовые токены:
  - `text-charcoal`
  - `text-muted`
  - `text-steel`
  - `text-error`
  - `text-link`
- border-токены:
  - `border-hairline`
  - `border-hairline-strong`
- типографика:
  - `text-body`
  - `text-body-sm`
  - `text-body-md`
  - `text-btn`
  - `text-caption`
  - `text-caption-bold`

Также используются CSS-переменные:

```css
var(--color-brand-purple-800)
var(--color-brand-orange-deep)
```

### Nuxt / Vue

- Vue 3 Composition API:
  - `computed`
  - `ref`
- Nuxt auto-imports / runtime:
  - `resolveComponent`
  - `NuxtLink`
- Vue SFC `<script setup>`.

### Внешние зависимости

#### `qrcode`

Используется в `UiCopyableUrl.vue` для генерации QR-кода:

```ts
const QRCode = (await import('qrcode')).default
```

Импорт динамический, поэтому библиотека не попадает в eager bundle компонента до первого вызова скачивания.

#### Icon-компонент

В `UiCopyableUrl.vue` используется компонент:

```vue
<Icon />
```

Судя по именам иконок вида `lucide:copy`, `lucide:qr-code`, компонент зависит от установленного icon-модуля в Nuxt-проекте, например Nuxt Icon или аналогичной интеграции. Конкретный модуль в предоставленном коде не указан.

#### Browser APIs

`UiCopyableUrl` использует браузерные API:

- `navigator.clipboard.writeText`
- `document.createElement`
- `document.body.appendChild`
- `HTMLAnchorElement.click`
- `URL`

Эти вызовы находятся внутри обработчиков пользовательских действий, а не на этапе SSR-рендера.

## Примеры использования

### Форма создания инструкции

```vue
<script setup lang="ts">
const title = ref('')
const slug = ref('')
const saving = ref(false)
const error = ref('')
</script>

<template>
  <UiCard>
    <form class="space-y-md">
      <UiAlert
        v-if="error"
        kind="error"
        title="Не удалось сохранить"
      >
        {{ error }}
      </UiAlert>

      <UiInput
        v-model="title"
        label="Название инструкции"
        placeholder="Например, Настройка кофемашины"
        required
      />

      <UiInput
        v-model="slug"
        label="URL"
        prefix="quar.io/i/"
        placeholder="coffee-machine-setup"
        hint="Используется в публичной ссылке на инструкцию"
      />

      <UiButton type="submit" :loading="saving">
        Сохранить
      </UiButton>
    </form>
  </UiCard>
</template>
```

### Публичная ссылка на опубликованную инструкцию

```vue
<script setup lang="ts">
const publicUrl = 'https://manualonline.example/i/coffee-machine-setup'
</script>

<template>
  <UiCard tint="mint">
    <div class="space-y-sm">
      <div class="flex items-center gap-2">
        <h2 class="text-body-md">Инструкция опубликована</h2>
        <UiBadge variant="tag-green">Активно</UiBadge>
      </div>

      <UiCopyableUrl
        :url="publicUrl"
        qr-filename="coffee-machine-setup"
      />
    </div>
  </UiCard>
</template>
```

## Замечания

- В модуле нет серверных API-роутов, composables, Prisma-схем или сервисных функций — только UI-компоненты.
- `UiButton` передает `disabled` также на `NuxtLink` и `<a>`. Для ссылок это не является полноценным нативным отключением поведения, поэтому при необходимости запрета перехода может потребоваться дополнительная обработка на уровне компонента или вызывающего кода.
- В `UiInput` значение `modelValue` может быть `number`, но событие `update:modelValue` всегда возвращает `string`. Для числовых полей вызывающему коду нужно самостоятельно приводить тип.
- `UiCopyableUrl` зависит от Clipboard API. В некоторых браузерах или небезопасных контекстах копирование может быть недоступно.
- QR-генерация в `UiCopyableUrl` работает только на клиенте, так как использует DOM API для скачивания файла.
- Компоненты жестко завязаны на наличие дизайн-токенов и utility-классов проекта. При использовании вне текущей темы quar.io потребуется перенос соответствующих стилей.
- Для `UiAlert`, `UiBadge`, `UiButton` и `UiCard` набор вариантов зафиксирован union-типами. Добавление новых визуальных вариантов требует изменения TypeScript-типа и соответствующей map-структуры классов.

---
module: components-ui
section: client
generated: 2026-05-08
files: 6
---