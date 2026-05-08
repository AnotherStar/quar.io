# components-editor

## Назначение

Модуль `components-editor` реализует клиентскую часть TipTap-редактора инструкций в ManualOnline. Он отвечает за WYSIWYG-редактирование контента инструкций, вставку медиа, таблиц, предупреждений, переиспользуемых секций, подключаемых модулей, колонок и служебных атрибутов блоков для аналитики и публичного рендера.

## Ключевые возможности

- Полноценный редактор инструкций на базе TipTap / ProseMirror.
- Панель форматирования с командами для текста, списков, таблиц, ссылок, изображений, YouTube-видео и undo/redo.
- Slash-меню команд при вводе `/`.
- Кастомные блоки:
  - `safetyBlock` — информационные, предупредительные и опасные блоки;
  - `sectionRef` — ссылка на переиспользуемую секцию;
  - `moduleRef` — ссылка на подключаемый tenant-модуль;
  - `columns` / `column` — Notion-подобные колонки;
  - `image` с изменяемым размером и выравниванием.
- Notion-style drag handle для перемещения блоков и создания колонок боковым drag-and-drop.
- Автоматическая генерация стабильных `data-block-id` для блоков.
- Отдельные NodeView для режима редактирования и публичного read-only-рендера ссылок на секции и модули.
- Поддержка таблиц с добавлением/удалением строк и столбцов, шапкой и объединением ячеек.
- Встраивание tenant-модулей с возможностью per-instance override-конфигурации.

## Архитектура

Модуль расположен в `components/editor` и состоит из основного редактора, toolbar, slash-меню и набора TipTap-расширений.

### Основные компоненты

| Файл | Назначение |
|---|---|
| `InstructionEditor.vue` | Главный Vue-компонент редактора. Инициализирует TipTap, регистрирует расширения, синхронизирует `modelValue`, рендерит toolbar, editor content и slash-меню. |
| `EditorToolbar.vue` | Верхняя sticky-панель инструментов редактора. Выполняет команды форматирования через TipTap `editor.chain()`. |
| `SlashMenu.vue` | Контекстное меню команд, открывающееся при вводе `/`. Позволяет быстро вставлять заголовки, списки, safety-блоки, секции, модули, таблицы, изображения и YouTube-видео. |

### TipTap-расширения

| Файл | Расширение / NodeView | Назначение |
|---|---|---|
| `extensions/BlockId.ts` | `BlockId` | Добавляет стабильный `id` к поддерживаемым top-level блокам через `data-block-id`. |
| `extensions/BlockDragHandle.ts` | `BlockDragHandle` | ProseMirror plugin для Notion-style drag handle, вертикального reorder и бокового drop в колонки. |
| `extensions/SafetyBlock.ts` | `SafetyBlock` | Кастомный block-node для предупреждений и регуляторного контента. |
| `extensions/SafetyBlockView.vue` | NodeView | Редактируемое отображение safety-блока с иконкой, severity и кастомным заголовком. |
| `extensions/ResizableImage.ts` | `ResizableImage` | Расширяет стандартный TipTap Image атрибутами `width` и `align`. |
| `extensions/ResizableImageView.vue` | NodeView | UI для изменения размера изображения, выравнивания и preset-ширин. |
| `extensions/Columns.ts` | `Columns`, `Column` | Узлы колонок: wrapper `columns` содержит 2–4 `column`. |
| `extensions/ColumnsView.vue` | NodeView | Рендерит CSS-grid колонок, resize handles и toolbar вертикального выравнивания. |
| `extensions/SectionRef.ts` | `SectionRef` | Atom-блок ссылки на reusable section в режиме редактирования. |
| `extensions/SectionRefView.vue` | NodeView | Выбор секции, inline-preview содержимого, удаление блока. |
| `extensions/SectionRefPublic.ts` | `SectionRefPublic` | Read-only вариант `sectionRef` для публичного рендера. |
| `extensions/SectionRefPublicView.vue` | NodeView | Отображает предварительно разрешённое содержимое секции через `InstructionContent`. |
| `extensions/ModuleRef.ts` | `ModuleRef` | Atom-блок ссылки на tenant module config в редакторе. |
| `extensions/ModuleRefView.vue` | NodeView | Выбор tenant-модуля, preview публичного компонента, per-instance config modal. |
| `extensions/ModuleRefPublic.ts` | `ModuleRefPublic` | Read-only вариант `moduleRef` для публичной страницы. |
| `extensions/ModuleRefPublicView.vue` | NodeView | Рендерит публичный модуль через `ModuleRenderer`. |

### Взаимодействие компонентов

`InstructionEditor.vue` создаёт экземпляр TipTap через `useEditor()` и регистрирует стандартные и кастомные расширения:

- `StarterKit`
- `Placeholder`
- `Link`
- `TaskList`
- `TaskItem`
- `Youtube`
- `TextAlign`
- `Table`, `TableRow`, `TableHeader`, `TableCell`
- `ResizableImage`
- `SafetyBlock`
- `SectionRef`, `ModuleRef`
- `Columns`, `Column`
- `BlockDragHandle`
- `BlockId`

После создания редактор:

1. Рендерит `EditorToolbar`, передавая ему live-инстанс `editor`.
2. Рендерит `EditorContent`.
3. Рендерит `SlashMenu`, также передавая ему `editor`.

При каждом обновлении содержимого вызывается:

```ts
emit('update:modelValue', editor.getJSON())
```

Таким образом родительский компонент получает актуальный TipTap JSON-документ.

### Editor Toolbar

`EditorToolbar.vue` работает напрямую с TipTap-командами:

- форматирование текста: `toggleBold`, `toggleItalic`, `toggleStrike`, `toggleCode`;
- ссылки: `setLink`, `unsetLink`;
- списки: `toggleBulletList`, `toggleOrderedList`, `toggleTaskList`;
- блоки: `toggleBlockquote`, `toggleCodeBlock`, `setSafetyBlock`;
- выравнивание: `setTextAlign`;
- таблицы: `insertTable`, `addRowBefore`, `addRowAfter`, `deleteRow`, `addColumnBefore`, `addColumnAfter`, `deleteColumn`, `toggleHeaderRow`, `mergeOrSplit`, `deleteTable`;
- медиа: `setImage`, `setYoutubeVideo`;
- кастомные ссылки: `insertSectionRef`, `insertModuleRef`;
- история: `undo`, `redo`.

Для загрузки изображений toolbar создаёт `<input type="file">`, вызывает `uploadFile(file)` и вставляет изображение по возвращённому URL.

### Slash Menu

`SlashMenu.vue` отслеживает события TipTap:

```ts
props.editor.on('update', detectSlash)
props.editor.on('selectionUpdate', detectSlash)
```

Меню открывается, если в текущей строке найден паттерн:

```ts
/(?:^|\s)\/([^\s/]*)$/
```

Команда удаляет введённый `/...` диапазон и применяет действие к редактору.

### SectionRef

`SectionRef` хранит только `sectionId`. В редакторе `SectionRefView.vue`:

- загружает список секций через `/api/sections`;
- кэширует его в `useState('mo:editor-sections')`;
- позволяет выбрать секцию из меню;
- показывает read-only preview через `InstructionContent`;
- удаляет atom-блок через `deleteRange`.

В публичном режиме `SectionRefPublicView.vue` не делает API-запрос. Он ожидает, что секции уже переданы через Vue `inject('publicRefs')`.

### ModuleRef

`ModuleRef` хранит:

- `tenantModuleConfigId`;
- `configOverride`.

В редакторе `ModuleRefView.vue`:

- загружает список доступных модулей через `/api/modules`;
- кэширует их в `useState('mo:editor-modules')`;
- показывает только включённые и разрешённые тарифом модули;
- динамически загружает публичный preview-компонент из `modules-sdk/registry`;
- при наличии `EditorConfigComponent` показывает кнопку «Настроить»;
- сохраняет per-instance override в `configOverride`.

В публичном режиме `ModuleRefPublicView.vue` получает уже разрешённые module refs через `inject('publicRefs')` и рендерит `ModuleRenderer`.

### Columns

`Columns.ts` определяет два узла:

- `columns`:
  - `group: 'block'`;
  - `content: 'column{2,4}'`;
  - `defining: true`;
  - `isolating: true`;
- `column`:
  - `content: 'block+'`;
  - `isolating: true`.

`ColumnsView.vue` отвечает за редакторский UI:

- CSS-grid layout;
- resize handles между колонками;
- ограничение минимальной ширины колонки в `8%`;
- toolbar вертикального выравнивания: `top`, `center`, `bottom`.

Ширины колонок хранятся в атрибуте `columnWidths`.

### BlockDragHandle

`BlockDragHandle.ts` создаёт ProseMirror plugin, который монтирует два DOM-элемента в `document.body`:

- `.mo-block-handle` — floating handle с кнопками `+` и drag grip;
- `.mo-block-droppos` — визуальный индикатор drop-position.

Плагин поддерживает:

- добавление пустого paragraph после текущего блока;
- вертикальное перемещение блоков;
- боковой drop для создания колонок;
- добавление колонки к существующему `columns`;
- cleanup пустых колонок;
- специальную обработку `Backspace` в пустом единственном блоке внутри колонки.

## API / Интерфейс

### `InstructionEditor.vue`

#### Props

| Prop | Тип | Описание |
|---|---|---|
| `modelValue` | `TiptapDoc \| object` | Текущее содержимое редактора в TipTap JSON. |
| `placeholder?` | `string` | Placeholder для первой пустой строки. |
| `disableSectionRefs?` | `boolean` | Отключает регистрацию `SectionRef` и `ModuleRef`, а также скрывает UI для их вставки. Используется в редакторе секций, чтобы избежать рекурсивного вложения секций. |

#### Events

| Event | Payload | Описание |
|---|---|---|
| `update:modelValue` | `object` | Вызывается при любом обновлении документа. |
| `ready` | `editor: any` | Передаёт live-инстанс TipTap Editor после создания. |

#### Expose

```ts
{
  editor,
  getEditor: () => editor.value
}
```

### `EditorToolbar.vue`

#### Props

| Prop | Тип | Описание |
|---|---|---|
| `editor` | `Editor` | Экземпляр TipTap Editor. |
| `disableSectionRefs?` | `boolean` | Скрывает кнопки вставки секции и модуля. |

#### Slots

Слотов нет.

#### Events

Пользовательские Vue events не эмитятся. Все действия применяются напрямую к `editor`.

### `SlashMenu.vue`

#### Props

| Prop | Тип | Описание |
|---|---|---|
| `editor` | `Editor` | Экземпляр TipTap Editor. |
| `disableSectionRefs?` | `boolean` | Исключает команды `section-ref` и `module-ref` из меню. |

#### Основные команды

- `h1`, `h2`, `h3`
- `p`
- `ul`, `ol`, `todo`
- `quote`
- `code`
- `safety-info`, `safety-warn`, `safety-danger`
- `section-ref`
- `module-ref`
- `table`
- `image`
- `youtube`

### TipTap-команды расширений

#### `SafetyBlock`

```ts
editor.chain().focus().setSafetyBlock('info').run()
editor.chain().focus().setSafetyBlock('warning').run()
editor.chain().focus().setSafetyBlock('danger').run()
```

Контракт severity:

```ts
type SafetySeverity = 'info' | 'warning' | 'danger'
```

#### `SectionRef`

```ts
editor.chain().focus().insertSectionRef(sectionId).run()
```

Атрибуты узла:

| Атрибут | Тип | Описание |
|---|---|---|
| `sectionId` | `string \| null` | ID reusable section. |

HTML-представление:

```html
<div data-type="section-ref" data-section-id="..."></div>
```

#### `ModuleRef`

```ts
editor.chain().focus().insertModuleRef(tenantModuleConfigId).run()
```

Атрибуты узла:

| Атрибут | Тип | Описание |
|---|---|---|
| `tenantModuleConfigId` | `string \| null` | ID tenant-конфигурации модуля. |
| `configOverride` | `Record<string, unknown>` | Override-настройки конкретного экземпляра блока. |

HTML-представление:

```html
<div
  data-type="module-ref"
  data-config-id="..."
  data-override="{}"
></div>
```

#### `Columns`

```ts
editor.chain().focus().insertColumns(2).run()
editor.chain().focus().insertColumns(3).run()
editor.chain().focus().insertColumns(4).run()
```

Атрибуты `columns`:

| Атрибут | Тип | Описание |
|---|---|---|
| `columnWidths` | `number[] \| null` | Ширины колонок в процентах/fr-единицах. |
| `verticalAlign` | `'top' \| 'center' \| 'bottom'` | Вертикальное выравнивание содержимого колонок. |

HTML-представление:

```html
<div
  data-type="columns"
  class="mo-columns"
  data-column-widths="[50,50]"
  data-valign="top"
>
  <div data-type="column" class="mo-column"></div>
  <div data-type="column" class="mo-column"></div>
</div>
```

#### `ResizableImage`

Расширяет стандартный TipTap `image`.

Дополнительные атрибуты:

| Атрибут | Тип | Описание |
|---|---|---|
| `width` | `number \| null` | Ширина изображения в пикселях. |
| `align` | `'left' \| 'center' \| 'right'` | Выравнивание изображения. |

Пример вставки:

```ts
editor.chain().focus().setImage({ src: url }).run()
```

#### `BlockId`

Добавляет атрибут `id` следующим типам узлов:

```ts
[
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'taskList',
  'blockquote',
  'codeBlock',
  'image',
  'safetyBlock',
  'youtube',
  'sectionRef',
  'moduleRef'
]
```

HTML-представление:

```html
<p data-block-id="abc123def4">...</p>
```

### API-запросы, используемые компонентами

В модуле нет Nitro route-файлов, но Vue-компоненты обращаются к внутренним API ManualOnline:

| Компонент | Метод | Endpoint | Назначение |
|---|---:|---|---|
| `SectionRefView.vue` | `GET` | `/api/sections` | Получение списка reusable sections для выбора в редакторе. |
| `ModuleRefView.vue` | `GET` | `/api/modules` | Получение списка tenant-модулей и их конфигураций. |

Также используется функция:

```ts
uploadFile(file)
```

Она вызывается в `EditorToolbar.vue` и `SlashMenu.vue`, но её реализация не входит в представленный код модуля.

## Бизнес-логика

### Синхронизация контента редактора

`InstructionEditor.vue` хранит источник правды во внешнем `modelValue`.

- При изменении документа эмитится `update:modelValue`.
- При изменении `props.modelValue` снаружи редактор вызывает `setContent`.
- Для предотвращения циклической перезаписи используется сравнение JSON:

```ts
if (JSON.stringify(val) === JSON.stringify(editor.value.getJSON())) return
```

### Защита от рекурсивных секций

Если `disableSectionRefs === true`:

- `SectionRef` и `ModuleRef` не регистрируются в TipTap extensions;
- toolbar не показывает кнопки «Секция» и «Модуль»;
- slash-меню исключает команды `section-ref` и `module-ref`.

Комментарий в коде указывает основной сценарий: редактор секций не должен позволять вставлять секции внутрь секций.

### SafetyBlock

Safety-блок имеет три уровня:

| Severity | Иконка | Стандартный label |
|---|---|---|
| `info` | `ℹ️` | `Информация` |
| `warning` | `⚠️` | `Внимание` |
| `danger` | `⛔` | `Опасно` |

Правила:

- Клик по иконке циклически меняет severity: `info → warning → danger → info`.
- Заголовок можно переопределить через `label`.
- Если введённый label пустой или совпадает со стандартным label текущего severity, значение сбрасывается в `null`.
- При `label: null` смена severity автоматически меняет отображаемый стандартный заголовок.

### BlockId

`BlockId` гарантирует наличие уникального `id` у поддерживаемых блоков.

Алгоритм:

1. После транзакций ProseMirror обходит документ.
2. Для каждого поддерживаемого типа проверяет `node.attrs.id`.
3. Если `id` отсутствует или уже встречался, генерируется новый ID через `nanoid`.
4. ID сохраняется через `tr.setNodeMarkup`.

Назначение указано в комментарии к коду:

- analytics `BLOCK_VIEW`;
- targeting feedback widget;
- search anchors.

### Колонки

Ограничения `columns`:

- Минимум 2 колонки.
- Максимум 4 колонки.
- Каждая `column` должна содержать минимум один block: `content: 'block+'`.
- Если `columnWidths` отсутствует или не соответствует количеству колонок, используется равномерное распределение.
- Минимальная ширина при resize — `8%`.

При drag-and-drop:

- Боковой drop разрешён только для top-level блоков.
- Боковой drop не применяется, если source уже является `columns`.
- Нельзя боковым drop создавать колонки из пустого placeholder-блока.
- Вертикальный drop внутрь колонки разрешён только при reorder внутри той же колонки.
- Если колонка после перемещения становится пустой, выполняется cleanup:
  - пустая колонка удаляется;
  - если осталось меньше двух колонок, wrapper `columns` растворяется, а содержимое поднимается на верхний уровень;
  - если осталось две и более колонки, ширины перераспределяются равномерно.

### Backspace внутри колонок

`BlockDragHandle` перехватывает `Backspace`, если:

- selection пустой;
- текущий блок пустой;
- блок является единственным дочерним элементом своей `column`;
- родительский узел — `columns`.

В этом случае удаляется колонка целиком, а `columns` либо перестраивается, либо растворяется. Это сделано одной транзакцией, чтобы ProseMirror не восстановил невалидную структуру колонок автоматически.

### Изображения

Resizable image:

- минимальная ширина при drag resize — `80px`;
- максимальная ширина ограничена шириной родительского контейнера;
- доступны preset-кнопки:
  - `25%`;
  - `50%`;
  - `100%`;
- ширину можно сбросить в `null`;
- выравнивание хранится в атрибуте `align`.

### Секции

В редакторе `SectionRefView.vue`:

- секции загружаются один раз на страницу и кэшируются в `useState`;
- если секция не выбрана, показывается placeholder;
- если секция удалена или не найдена, показывается ошибка;
- preview отображается в `pointer-events-none`, то есть содержимое нельзя редактировать внутри ссылки.

В публичном рендере:

- компонент не делает запросов;
- данные секций должны быть заранее предоставлены через `provide('publicRefs', ...)`.

### Модули

В редакторе `ModuleRefView.vue`:

- список модулей загружается один раз и кэшируется в `useState`;
- для выбора доступны только модули, у которых:
  - есть `tenantConfig`;
  - `tenantConfig.enabled === true`;
  - `allowedByPlan === true`;
- preview-компонент загружается динамически из registry;
- если модуль не зарегистрирован, показывается ошибка;
- если `EditorConfigComponent` отсутствует, кнопка «Настроить» не показывается;
- per-instance config сохраняется только при нажатии «Сохранить»;
- «Отмена» и `Escape` закрывают modal без записи в node attrs.

## Зависимости

### Внутренние зависимости ManualOnline

- `useApi()` — выполнение запросов к внутренним API.
- `uploadFile(file)` — загрузка медиафайлов; реализация не входит в показанный код.
- `InstructionContent` — рендер TipTap-контента, используется для preview секций и публичного рендера section refs.
- `ModuleRenderer` — публичный рендер подключаемых модулей.
- `modules-sdk/registry`:
  - `getModuleByCode`;
  - динамическая загрузка `PublicComponent`;
  - динамическая загрузка `EditorConfigComponent`.
- `shared/types/instruction`:
  - `TiptapDoc`.
- UI-компоненты:
  - `UiButton`.
- Nuxt-компоненты:
  - `ClientOnly`;
  - `NuxtLink`;
  - `Icon`.

### Внешние библиотеки

- `@tiptap/vue-3`
- `@tiptap/core`
- `@tiptap/starter-kit`
- `@tiptap/extension-placeholder`
- `@tiptap/extension-link`
- `@tiptap/extension-task-list`
- `@tiptap/extension-task-item`
- `@tiptap/extension-youtube`
- `@tiptap/extension-text-align`
- `@tiptap/extension-table`
- `@tiptap/extension-table-row`
- `@tiptap/extension-table-header`
- `@tiptap/extension-table-cell`
- `@tiptap/extension-image`
- `@tiptap/pm/state`
- `@tiptap/pm/view`
- `@tiptap/pm/model`
- `@vueuse/core`
- `nanoid`
- Vue / Nuxt Composition API:
  - `ref`;
  - `computed`;
  - `watch`;
  - `onMounted`;
  - `onBeforeUnmount`;
  - `inject`;
  - `shallowRef`;
  - `useState`.

## Примеры использования

### Подключение редактора в форме инструкции

```vue
<script setup lang="ts">
const content = ref({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Начните писать инструкцию...' }]
    }
  ]
})

function onReady(editor: any) {
  console.log('Editor ready:', editor)
}
</script>

<template>
  <InstructionEditor
    v-model="content"
    placeholder="Введите «/» для команд..."
    @ready="onReady"
  />
</template>
```

### Редактор секции без ссылок на секции и модули

```vue
<template>
  <InstructionEditor
    v-model="sectionContent"
    placeholder="Опишите переиспользуемую секцию..."
    disable-section-refs
  />
</template>
```

В этом режиме `SectionRef` и `ModuleRef` не регистрируются, а соответствующие команды не отображаются в toolbar и slash-меню.

## Замечания

- В `BlockDragHandle.ts` комментарий в начале говорит, что это “Phase 1” и поддерживается только vertical reorder, но фактический код уже содержит `performSidewaysDrop()` и создание колонок боковым drop. Комментарий устарел относительно реализации.
- `uploadFile(file)` используется напрямую, но не импортируется в `EditorToolbar.vue` и `SlashMenu.vue`. Вероятно, функция доступна глобально через auto-import Nuxt; при изменении конфигурации auto-import это место может сломаться.
- `EditorToolbar.vue` использует `prompt()` и `alert()` для ссылок, YouTube и ошибок загрузки. Это простая реализация, но UX может быть улучшен через modal/toast-компоненты.
- В `InstructionEditor.vue` сравнение документов через `JSON.stringify` может быть дорогим на больших инструкциях.
- `BlockDragHandle` активно работает с DOM и ProseMirror internals, включая `(view as any).dragging`. Это мощная, но потенциально хрупкая интеграция при обновлении TipTap/ProseMirror.
- Public NodeView для секций и модулей полагаются на `inject('publicRefs')`. Если provider не передаст нужные данные, блоки просто не отрендерят содержимое.
- В `ModuleRefView.vue` preview публичного модуля рендерится с `pointer-events-none` и `viewer-session-id="editor-preview"`, то есть интерактивность модуля в редакторе намеренно отключена.
- В коде нет route-файлов Nitro; эндпоинты `/api/sections` и `/api/modules` только используются, но не реализуются в данном модуле.

---
module: components-editor
section: client
generated: 2026-05-08
files: 19
---