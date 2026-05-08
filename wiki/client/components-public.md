# components-public

## Назначение

Модуль `components-public` содержит Vue-компоненты для публичной страницы опубликованной инструкции ManualOnline. Он отвечает за read-only рендеринг TipTap-контента, клиентский поиск по инструкции, сбор аналитики просмотра, отправку обратной связи по отдельным блокам и подключение публичных pluggable-модулей.

## Ключевые возможности

- Рендеринг опубликованного TipTap-документа в режиме `editable: false`.
- Сохранение `data-block-id` в DOM для аналитики, поиска и обратной связи.
- Сбор публичной аналитики:
  - просмотр страницы;
  - уход со страницы;
  - глубина прокрутки;
  - просмотр блоков;
  - dwell-событие при удержании блока во viewport более 5 секунд.
- Отправка per-block feedback:
  - «Полезно»;
  - «Непонятно»;
  - «Ошибка»;
  - произвольный комментарий.
- Клиентский полнотекстовый поиск по уже отрендеренным DOM-блокам инструкции.
- Динамическая загрузка публичных компонентов pluggable instruction modules.
- Рендеринг reusable sections как отдельного визуального блока.

## Архитектура

Модуль расположен в директории:

```text
components/public/
```

Состав файлов:

```text
components/public/
├── AnalyticsBeacon.vue
├── BlockFeedback.vue
├── InstructionContent.vue
├── InstructionSearch.vue
├── ModuleRenderer.vue
└── SectionRenderer.vue
```

### Общая схема взаимодействия

Публичная страница инструкции обычно состоит из read-only контента, отрендеренного через `InstructionContent`, и вспомогательных клиентских компонентов:

```text
Published instruction page
        │
        ├── InstructionContent
        │       └── TipTap renderer
        │           └── DOM blocks with data-block-id
        │
        ├── AnalyticsBeacon
        │       └── читает [data-block-id], отправляет события аналитики
        │
        ├── BlockFeedback
        │       └── отслеживает hover по [data-block-id], отправляет feedback
        │
        ├── InstructionSearch
        │       └── индексирует текст [data-block-id], скроллит к результату
        │
        ├── SectionRenderer
        │       └── рендерит reusable section через InstructionContent
        │
        └── ModuleRenderer
                └── динамически загружает публичный компонент модуля
```

Ключевой связующий механизм между компонентами — DOM-атрибут `data-block-id`. Он проставляется TipTap-расширением `BlockId` и используется:

- `AnalyticsBeacon.vue` — для событий `BLOCK_VIEW` и `BLOCK_DWELL`;
- `BlockFeedback.vue` — для привязки feedback к конкретному блоку;
- `InstructionSearch.vue` — для построения клиентского индекса и перехода к найденному блоку.

### `AnalyticsBeacon.vue`

Компонент-коллектор публичной аналитики.

Основные обязанности:

- отправляет `PAGE_VIEW` при монтировании;
- считает максимальную глубину прокрутки;
- отправляет `PAGE_LEAVE` при `visibilitychange` и `beforeunload`;
- отслеживает видимость блоков через `IntersectionObserver`;
- отправляет `BLOCK_VIEW` при первом появлении блока во viewport;
- отправляет `BLOCK_DWELL`, если блок оставался видимым более 5 секунд;
- буферизует события в локальной очереди;
- использует `navigator.sendBeacon` при уходе со страницы.

Компонент не рендерит видимый UI:

```vue
<template>
  <div hidden />
</template>
```

### `BlockFeedback.vue`

Плавающий виджет обратной связи по конкретному блоку инструкции.

Он подписывается на `pointerover` в указанном корневом контейнере и ищет ближайший родительский элемент с `data-block-id`.

При наведении на непустой блок показывает popover с действиями:

- 👍 Полезно;
- 😕 Непонятно;
- ⚠️ Ошибка;
- 💬 комментарий.

Popover рендерится через `Teleport` в `body`.

### `InstructionContent.vue`

Read-only renderer для опубликованного TipTap-документа.

Использует `@tiptap/vue-3` и набор расширений, совпадающий с публично поддерживаемыми возможностями редактора:

- `StarterKit`;
- `Link`;
- `TaskList`;
- `TaskItem`;
- `Youtube`;
- `TextAlign`;
- `Table`;
- `TableRow`;
- `TableHeader`;
- `TableCell`;
- внутренние расширения ManualOnline:
  - `BlockId`;
  - `SafetyBlock`;
  - `SectionRefPublic`;
  - `ModuleRefPublic`;
  - `ResizableImage`;
  - `Columns`;
  - `Column`.

Редактор создаётся с параметром:

```ts
editable: false
```

При изменении `props.content` содержимое редактора обновляется через:

```ts
editor.value.commands.setContent(val as object, false)
```

При размонтировании экземпляр TipTap-редактора уничтожается.

### `InstructionSearch.vue`

Клиентский поиск по уже отрендеренному DOM инструкции.

Особенности:

- индекс строится лениво при первом поиске;
- индексируются элементы с `data-block-id`;
- поиск выполняется по `textContent`;
- минимальная длина запроса — 2 символа;
- максимальное количество результатов — 30;
- результат содержит короткий preview-фрагмент;
- при выборе результата выполняется `scrollIntoView`;
- найденный блок временно подсвечивается CSS-классом `search-highlight`;
- поддерживаются горячие клавиши:
  - `Cmd/Ctrl + K` — открыть или закрыть поиск;
  - `Escape` — закрыть поиск.

### `ModuleRenderer.vue`

Компонент для подключения публичной части pluggable instruction modules.

Он получает код модуля, ищет описание модуля в registry через:

```ts
getModuleByCode(props.code)
```

Затем на клиенте динамически загружает публичный компонент:

```ts
const mod = await definition.PublicComponent()
Component.value = mod.default
```

Если модуль не зарегистрирован или загрузка завершилась ошибкой, компонент показывает текст ошибки.

### `SectionRenderer.vue`

Компонент для отображения reusable section на публичной странице.

Он принимает название секции и TipTap-контент, рендерит секцию в отдельной карточке и использует `InstructionContent` внутри `ClientOnly`.

```vue
<section>
  <h3>{{ name }}</h3>
  <ClientOnly>
    <InstructionContent :content="content" />
  </ClientOnly>
</section>
```

## API / Интерфейс

### `AnalyticsBeacon.vue`

#### Props

| Prop | Тип | Обязательный | Описание |
|---|---:|---:|---|
| `instructionId` | `string` | да | Идентификатор инструкции. |
| `versionId` | `string \| null` | нет | Идентификатор опубликованной версии инструкции. |
| `sessionId` | `string` | да | Стабильный идентификатор viewer-сессии. |

#### Events

Компонент не эмитит Vue-события.

#### Slots

Слоты не используются.

#### Backend API

Компонент отправляет события в endpoint:

```http
POST /api/public/analytics
```

Тело запроса:

```ts
{
  events: Array<{
    instructionId: string
    versionId?: string
    sessionId: string
    referrer?: string
    language: string
    type: string
    blockId?: string
    durationMs?: number
    scrollDepth?: number
  }>
}
```

Типы событий, видимые в коде:

```ts
'PAGE_VIEW'
'PAGE_LEAVE'
'BLOCK_VIEW'
'BLOCK_DWELL'
```

### `BlockFeedback.vue`

#### Props

| Prop | Тип | Обязательный | Описание |
|---|---:|---:|---|
| `instructionId` | `string` | да | Идентификатор инструкции. |
| `versionId` | `string \| null` | нет | Идентификатор версии инструкции. |
| `sessionId` | `string` | да | Идентификатор viewer-сессии. |
| `rootSelector` | `string` | нет | CSS-селектор корня, в котором отслеживается hover. По умолчанию `body`. |

#### Events

Компонент не эмитит Vue-события.

#### Slots

Слоты не используются.

#### Backend API

Компонент отправляет feedback в endpoint:

```http
POST /api/public/feedback
```

Тело запроса:

```ts
{
  instructionId: string
  versionId?: string
  sessionId: string
  blockId: string
  kind: 'HELPFUL' | 'CONFUSING' | 'INCORRECT' | 'COMMENT'
  comment?: string
}
```

### `InstructionContent.vue`

#### Props

| Prop | Тип | О��язательный | Описание |
|---|---:|---:|---|
| `content` | `object` | да | JSON-документ TipTap/ProseMirror для отображения. |

#### Events

Компонент не эмитит Vue-события.

#### Slots

Слоты не используются.

#### Внутренний интерфейс TipTap

Компонент создаёт TipTap editor через:

```ts
useEditor({
  content: props.content,
  editable: false,
  extensions: [...]
})
```

Поддерживаемые расширения перечислены в архитектурном разделе.

### `InstructionSearch.vue`

#### Props

| Prop | Тип | Обязательный | Описание |
|---|---:|---:|---|
| `rootSelector` | `string` | нет | CSS-селектор корневого DOM-элемента инструкции. По умолчанию `#instruction-root`. |

#### Events

Компонент не эмитит Vue-события.

#### Slots

Слоты не используются.

#### DOM-контракт

Для работы поиска внутри `rootSelector` должны существовать элементы:

```html
<div data-block-id="...">...</div>
```

### `ModuleRenderer.vue`

#### Props

| Prop | Тип | Обязательный | Описание |
|---|---:|---:|---|
| `code` | `string` | да | Код модуля в registry. |
| `config` | `Record<string, any>` | да | Конфигурация экземпляра модуля. |
| `instructionId` | `string` | да | Идентификатор инструкции. |
| `viewerSessionId` | `string` | да | Идентификатор viewer-сессии. |

#### Events

Компонент не эмитит Vue-события.

#### Slots

Слоты не используются.

#### Контракт публичного компонента модуля

Загружаемый компонент получает props:

```ts
{
  instructionId: string
  config: Record<string, any>
  viewerSessionId: string
}
```

Registry должен возвращать definition с функцией:

```ts
PublicComponent(): Promise<{ default: Component }>
```

### `SectionRenderer.vue`

#### Props

| Prop | Тип | Обязательный | Описание |
|---|---:|---:|---|
| `name` | `string` | да | Название reusable section. |
| `content` | `object` | да | TipTap JSON-контент секции. |

#### Events

Компонент не эмитит Vue-события.

#### Slots

Слоты не используются.

## Бизнес-логика

### Аналитика публичного просмотра

`AnalyticsBeacon.vue` реализует несколько правил сбора событий.

#### Общие поля события

Каждое событие дополняется полями:

```ts
{
  instructionId,
  versionId,
  sessionId,
  referrer,
  language
}
```

Где:

- `referrer` берётся из `document.referrer`;
- `language` берётся из `navigator.language`;
- `versionId` не отправляется, если равен `null` или `undefined`.

#### Очередь событий

События помещаются в локальную очередь:

```ts
const queue: any[] = []
```

Автоматический flush выполняется при накоплении 10 событий:

```ts
if (queue.length >= 10) flush()
```

#### PAGE_VIEW

При монтировании компонента:

```ts
track({ type: 'PAGE_VIEW' })
flush()
```

#### PAGE_LEAVE

При скрытии страницы или закрытии окна отправляется:

```ts
{
  type: 'PAGE_LEAVE',
  durationMs: Date.now() - pageStart,
  scrollDepth: scrollMax
}
```

Для отправки при уходе со страницы используется `navigator.sendBeacon`, если он доступен.

#### Scroll depth

Глубина прокрутки считается как процент:

```ts
((scrollTop + clientHeight) / scrollHeight) * 100
```

Сохраняется только максимальное значение за сессию просмотра:

```ts
if (pct > scrollMax) scrollMax = Math.min(100, pct)
```

#### BLOCK_VIEW

Для каждого DOM-элемента с `data-block-id` создаётся наблюдение через `IntersectionObserver`.

Порог видимости:

```ts
threshold: 0.5
```

`BLOCK_VIEW` отправляется только один раз на блок, что контролируется `seenBlocks`.

#### BLOCK_DWELL

Если блок попал во viewport, запускается таймер на 5 секунд:

```ts
window.setTimeout(() => {
  track({ type: 'BLOCK_DWELL', blockId: id, durationMs: 5000 })
}, 5000)
```

Если блок выходит из viewport раньше, таймер отменяется.

### Обратная связь по блокам

`BlockFeedback.vue` показывает feedback-виджет только для непустых блоков.

Блок считается пустым, если:

- у него нет текстового содержимого;
- и внутри нет медиа или embedded-элементов:

```ts
img, video, iframe, audio, svg, [data-type="youtube"]
```

Для пустого блока popover не показывается.

Feedback всегда привязывается к активному `blockId`.

После успешной отправки показывается состояние благодарности:

```text
✓ Спасибо за отзыв!
```

Через 1,5 секунды popover скрывается.

### Клиентский поиск

`InstructionSearch.vue` работает только по DOM, без backend-запросов.

Индекс строится из элементов:

```ts
root.querySelectorAll('[data-block-id]')
```

Каждый индексный элемент содержит:

```ts
{
  id: string
  text: string
}
```

Текст нормализуется:

```ts
(el.textContent || '').replace(/\s+/g, ' ').trim()
```

Поиск:

- case-insensitive;
- выполняется через `String.includes`;
- активируется только при длине запроса от 2 символов;
- ограничивается 30 результатами.

При выборе результата:

1. находится элемент по `data-block-id`;
2. выполняется плавный scroll;
3. добавляется класс `search-highlight`;
4. через 1600 мс подсветка снимается;
5. модальное окно поиска закрывается.

### Рендеринг контента

`InstructionContent.vue` рендерит документ TipTap в read-only режиме. Это важно для публичных страниц: пользователь может переходить по ссылкам, видеть таблицы, изображения, списки задач, YouTube-вставки и кастомные блоки, но не может редактировать контент.

### Рендеринг модулей

`ModuleRenderer.vue` загружает публичный компонент модуля только на клиенте в `onMounted`.

Если модуль не найден в registry:

```text
Module "..." not registered
```

Если загрузка компонента завершилась ошибкой, выводится сообщение:

```text
Module error: ...
```

## Зависимости

### Внутренние зависимости ManualOnline

`InstructionContent.vue` зависит от редакторских расширений:

```ts
~/components/editor/extensions/BlockId
~/components/editor/extensions/SafetyBlock
~/components/editor/extensions/SectionRefPublic
~/components/editor/extensions/ModuleRefPublic
~/components/editor/extensions/ResizableImage
~/components/editor/extensions/Columns
```

`ModuleRenderer.vue` зависит от registry модулей:

```ts
~~/modules-sdk/registry
```

Также компоненты зависят от backend API:

```http
POST /api/public/analytics
POST /api/public/feedback
```

Реализация этих API-роутов в предоставленном коде не показана.

### Внешние зависимости

Используются библиотеки TipTap:

```ts
@tiptap/vue-3
@tiptap/starter-kit
@tiptap/extension-link
@tiptap/extension-task-list
@tiptap/extension-task-item
@tiptap/extension-youtube
@tiptap/extension-text-align
@tiptap/extension-table
@tiptap/extension-table-row
@tiptap/extension-table-header
@tiptap/extension-table-cell
```

Используются браузерные API:

- `document`;
- `window`;
- `navigator`;
- `navigator.sendBeacon`;
- `IntersectionObserver`;
- `MutationObserver` — объявлен в `BlockFeedback.vue`, но фактически не используется;
- `requestAnimationFrame`;
- `scrollIntoView`;
- `Blob`.

Используются возможности Nuxt/Vue:

- `<script setup>`;
- Composition API;
- `ref`;
- `watch`;
- `onMounted`;
- `onBeforeUnmount`;
- `ClientOnly`;
- `Teleport`;
- `$fetch`.

## Примеры использования

### Подключение публичных компонентов на странице инструкции

Пример условной публичной страницы, где основной контент находится в `#instruction-root`:

```vue
<template>
  <main>
    <article id="instruction-root">
      <ClientOnly>
        <InstructionContent :content="instruction.content" />
      </ClientOnly>
    </article>

    <AnalyticsBeacon
      :instruction-id="instruction.id"
      :version-id="instruction.versionId"
      :session-id="viewerSessionId"
    />

    <BlockFeedback
      :instruction-id="instruction.id"
      :version-id="instruction.versionId"
      :session-id="viewerSessionId"
      root-selector="#instruction-root"
    />

    <InstructionSearch root-selector="#instruction-root" />
  </main>
</template>
```

### Рендеринг pluggable-модуля

```vue
<template>
  <ModuleRenderer
    code="warranty-check"
    :config="{ showSerialInput: true }"
    :instruction-id="instructionId"
    :viewer-session-id="viewerSessionId"
  />
</template>
```

### Рендеринг reusable section

```vue
<template>
  <SectionRenderer
    name="Меры безопасности"
    :content="safetySectionContent"
  />
</template>
```

## Замечания

- `AnalyticsBeacon.vue` может отправить `PAGE_LEAVE` более одного раза, так как событие отправляется и при `visibilitychange`, и при `beforeunload`. В коде нет дедупликации ухода со страницы.
- В `flush(useBeacon = true)` при использовании `navigator.sendBeacon` результат отправки не проверяется и события уже удалены из очереди.
- При ошибке обычной отправки аналитики через `$fetch` исключение намеренно подавляется: аналитика не должна ломать публичную страницу.
- `InstructionSearch.vue` строит индекс лениво и только один раз. Если DOM инструкции изменится после построения индекса, поиск не переиндексирует контент.
- `InstructionSearch.vue` ищет только по тексту DOM-элементов. Медиа, изображения без текстового описания и embed-контент фактически не индексируются.
- `BlockFeedback.vue` содержит переменную `observer: MutationObserver | null`, но в текущем коде `MutationObserver` не создаётся и не используется.
- `BlockFeedback.vue` рассчитывает позицию popover при наведении. При последующем изменении layout или прокрутке позиция не пересчитывается до нового hover-события.
- `BlockFeedback.vue` визуально скрыт на малых экранах через классы `hidden md:block`; мобильный сценарий feedback в коде не реализован.
- Компоненты активно используют browser-only API (`document`, `window`, `navigator`). Их безопаснее подключать в клиентском контексте или через `ClientOnly`, особенно для `InstructionContent` и компонентов, завязанных на DOM.
- Реализация backend-роутов `/api/public/analytics` и `/api/public/feedback` в предоставленном фрагменте отсутствует, поэтому серверная валидация, хранение и ограничения не описаны.

---
module: components-public
section: client
generated: 2026-05-08
files: 6
---