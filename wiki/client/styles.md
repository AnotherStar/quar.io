# styles

## Назначение

Модуль `styles` задаёт глобальные стили и дизайн-токены фронтенда quar.io. Он обеспечивает единый визуальный язык для публичных страниц инструкций, редактора TipTap и интерфейсных элементов, используя Tailwind CSS и CSS Custom Properties.

## Ключевые возможности

- Подключение базовых слоёв Tailwind CSS: `base`, `components`, `utilities`.
- Глобальная настройка рендеринга текста и базовых цветов страницы.
- Централизованные дизайн-токены через CSS-переменные в `:root`.
- Общий контейнер страницы `.container-page`.
- Единые стили для TipTap-контента в редакторе и публичном рендере:
  - многоколоночные блоки;
  - таблицы;
  - чек-листы / task lists.
- Editor-only стили для интерактивных возможностей TipTap:
  - выделение ячеек таблицы;
  - handle для resize колонок;
  - курсор изменения ширины.
- Поддержка потенциального runtime-переопределения брендовых цветов через CSS Custom Properties.

## Архитектура

Модуль состоит из двух CSS-файлов:

```text
assets/css/
├── global.css
└── tokens.css
```

### `assets/css/tokens.css`

Файл содержит дизайн-токены quar.io в виде CSS Custom Properties, объявленных в `:root`.

Основные группы токенов:

- **Brand & Primary**
  - `--color-primary`
  - `--color-primary-pressed`
  - `--color-on-primary`
  - `--color-brand-navy`
  - `--color-link-blue`

- **Brand spectrum**
  - дополнительные брендовые цвета: orange, pink, purple, teal, green, yellow, brown.

- **Tints**
  - пастельные фоновые оттенки: peach, rose, mint, lavender, sky, yellow, cream, gray.

- **Surface**
  - цвета холста, поверхностей и бордеров:
    - `--color-canvas`
    - `--color-surface`
    - `--color-hairline`
    - `--color-hairline-soft`
    - `--color-hairline-strong`

- **Text**
  - текстовые цвета:
    - `--color-ink`
    - `--color-charcoal`
    - `--color-slate`
    - `--color-muted`

- **Semantic**
  - `--color-success`
  - `--color-warning`
  - `--color-error`

Комментарий в коде явно указывает, что токены взяты из `DESIGN-notion.md` и выбраны как CSS-переменные для возможности переопределения брендинга на уровне tenant/runtime.

### `assets/css/global.css`

Файл содержит глобальные стили приложения и shared-стили для TipTap-контента.

#### Tailwind layers

В начале подключаются стандартные слои Tailwind:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Далее используются кастомные слои:

- `@layer base` — базовые стили для `html`, `body`, `::selection`;
- `@layer components` — переиспользуемые CSS-классы компонентов, например `.container-page`.

#### Base styles

```css
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

Для `html` включены настройки сглаживания шрифтов и оптимизации читаемости.

```css
body {
  @apply bg-canvas text-ink font-sans;
  font-feature-settings: 'cv11', 'ss01', 'ss03';
}
```

Для `body` применяются Tailwind utility-классы, завязанные на дизайн-токены:

- `bg-canvas`;
- `text-ink`;
- `font-sans`.

Также включены OpenType-фичи шрифта.

#### Selection

```css
::selection {
  background: var(--color-primary);
  color: var(--color-on-primary);
}
```

Выделение текста использует основной брендовый цвет и цвет текста поверх primary-фона.

#### Layout utility

```css
.container-page {
  @apply mx-auto w-full max-w-[1280px] px-4 md:px-8;
}
```

Класс `.container-page` задаёт стандартный контейнер страницы:

- центрирование через `mx-auto`;
- ширина `100%`;
- максимальная ширина `1280px`;
- горизонтальные отступы `16px`, на `md` — `32px`.

#### TipTap multi-column layout

Для многоколоночных блоков используются классы:

- `.mo-columns`;
- `.mo-column`;
- `.mo-column-resizer`.

Стили расположены в `global.css`, потому что должны одинаково работать:

- в preview редактора;
- в публичном рендере инструкции.

Комментарий в коде указывает, что `grid-template-columns` задаётся inline из атрибута `columnWidths` через `renderHTML` / `NodeView`, либо используется fallback вида `repeat(N, 1fr)`.

На мобильных экранах до `640px` колонки принудительно сворачиваются в одну:

```css
@media (max-width: 640px) {
  .mo-columns { grid-template-columns: 1fr !important; }
  .mo-column-resizer { display: none !important; }
}
```

#### TipTap tables

Стили таблиц применяются одновременно к:

```css
.mo-table
.tableWrapper > table
```

Такой двойной селектор используется защитно: если `HTMLAttributes` из TipTap Table extension перестанут попадать в editable view, таблица всё равно будет стилизована через `.tableWrapper > table`.

Основные правила:

- `border-collapse: separate`;
- `border-spacing: 0`;
- `table-layout: fixed`;
- ширина `100%`;
- внешний border `1px solid var(--color-hairline)`;
- скругление `8px`;
- фон `var(--color-canvas)`;
- горизонтальный overflow через `.tableWrapper`.

Ячейки таблиц получают:

- padding `12px 16px`;
- `min-width: 80px`;
- внутренние разделители через `border-right` и `border-bottom`;
- `word-break: break-word`;
- цвет текста `var(--color-charcoal)`.

Последняя колонка и последняя строка очищаются от лишних border, чтобы избежать двойных линий.

Заголовочные ячейки `th` получают:

- фон `var(--color-surface)`;
- цвет `var(--color-ink)`;
- `font-weight: 500`;
- выравнивание по левому краю.

Параграфы внутри ячеек сбрасываются до `margin: 0`, чтобы публичные prose-стили не добавляли лишний нижний отступ.

#### TipTap task lists

Для чек-листов TipTap используются селекторы на markup расширения TaskList:

```html
<ul data-type="taskList">
  <li data-checked="true|false">
    <label><input type="checkbox" /></label>
    <div><p>...</p></div>
  </li>
</ul>
```

Глобальные стили:

- убирают стандартные bullets;
- сбрасывают padding/margin списка;
- задают flex-layout для `li`;
- стилизуют checkbox как кастомный Notion-style квадрат `18px`;
- используют `clip-path` для галочки без иконок и шрифтов;
- для выполненного пункта применяют:
  - серый цвет текста;
  - `line-through`;
  - цвет зачёркивания `var(--color-muted)`.

#### Editor-only affordances

Стили, завязанные на `.tiptap`, применяются только в editable-инстансе редактора:

```css
.tiptap .selectedCell::after
.tiptap .column-resize-handle
.tiptap.resize-cursor
```

Они отвечают за:

- подсветку выбранной ячейки таблицы;
- визуальный handle изменения ширины колонок;
- курсор `col-resize` при resize.

В публичном рендере эти стили не активируются, так как класс `.tiptap` присутствует только на редактируемом экземпляре.

## API / Интерфейс

В модуле нет Nitro route-файлов, Vue-компонентов, composables, SDK или zod-схем. Интерфейс модуля представлен CSS-классами и CSS Custom Properties.

### CSS Custom Properties

Основной публичный интерфейс дизайн-системы — переменные из `tokens.css`.

Примеры ключевых переменных:

```css
--color-primary
--color-primary-pressed
--color-on-primary

--color-canvas
--color-surface
--color-surface-soft

--color-hairline
--color-hairline-soft
--color-hairline-strong

--color-ink
--color-charcoal
--color-muted

--color-success
--color-warning
--color-error
```

Эти переменные могут использоваться напрямую в CSS:

```css
.my-block {
  background: var(--color-surface);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
}
```

### CSS-классы

#### `.container-page`

Стандартный контейнер страницы.

```html
<div class="container-page">
  ...
</div>
```

Характеристики:

- центрирование;
- максимальная ширина `1280px`;
- адаптивные горизонтальные отступы.

#### `.mo-columns`

Grid-контейнер для многоколоночного TipTap-блока.

```html
<div class="mo-columns" style="grid-template-columns: 1fr 1fr">
  <div class="mo-column">...</div>
  <div class="mo-column">...</div>
</div>
```

Особенности:

- `display: grid`;
- `gap: 20px`;
- на экранах до `640px` всегда становится одной колонкой.

#### `.mo-column`

Колонка внутри `.mo-columns`.

```css
.mo-column {
  min-width: 0;
}
```

`min-width: 0` нужен, чтобы содержимое не ломало grid-layout.

#### `.mo-column-resizer`

Абсолютно позиционированный drag-divider между колонками.

```html
<button class="mo-column-resizer" />
```

Особенности:

- ширина hit area `8px`;
- визуальная линия `2px` через `::before`;
- цвет линии появляется при hover/active;
- скрывается на мобильных экранах.

#### `.mo-table`

Класс таблицы TipTap.

```html
<div class="tableWrapper">
  <table class="mo-table">
    ...
  </table>
</div>
```

Класс может быть установлен через `Table.configure({ HTMLAttributes })`, но стили также применяются к `.tableWrapper > table`.

#### Task list markup

Для чек-листов используется не класс, а атрибуты TipTap:

```html
<ul data-type="taskList">
  <li data-checked="false">
    <label>
      <input type="checkbox" />
    </label>
    <div>
      <p>Проверить комплектацию</p>
    </div>
  </li>
</ul>
```

Стили завязаны на:

- `ul[data-type='taskList']`;
- `li[data-checked='true']`;
- `input[type='checkbox']`.

## Бизнес-логика

В модуле нет бизнес-логики в прикладном смысле: отсутствуют проверки тарифов, статусы публикации, работа с пользователями, API-запросы или серверная обработка.

При этом в CSS зафиксированы важные правила поведения UI.

### Единый внешний вид редактора и публичного рендера

Стили таблиц, чек-листов и колонок намеренно не ограничены только `.tiptap`, чтобы один и тот же HTML TipTap выглядел одинаково:

- в редакторе;
- в preview;
- на публичной странице инструкции.

Это важно для WYSIWYG-поведения: контент, созданный продавцом в редакторе, должен соответствовать публичному отображению.

### Разделение editor-only и public styles

Стили, относящиеся только к редактированию, ограничены `.tiptap`:

```css
.tiptap .selectedCell::after
.tiptap .column-resize-handle
.tiptap.resize-cursor
```

Так публичная страница не получает артефакты редактирования: подсветки выбранных ячеек, resize-handle и resize-cursor.

### Адаптивность многоколоночных блоков

На ширине до `640px` многоколоночные блоки принудительно становятся одноколоночными:

```css
.mo-columns {
  grid-template-columns: 1fr !important;
}
```

Это защищает публичные инструкции от нечитаемого многостолбцового layout на мобильных устройствах.

### Геометрия таблиц

Таблицы используют `border-collapse: separate`, а не `collapse`, чтобы корректно работали скруглённые внешние углы.

Внутренние линии строятся через правую и нижнюю границы ячеек. Последняя колонка и последняя строка очи��аются от границ, чтобы не возникали двойные border.

### Сброс margin внутри таблиц и task lists

Параграфы внутри ячеек таблиц и пунктов task list сбрасываются:

```css
margin: 0;
```

Это необходимо, потому что публичные prose-стили могут задавать отступы для обычных параграфов и списков. Без сброса в таблицах и чек-листах появлялись бы лишние интервалы.

### Runtime-брендинг

`tokens.css` использует CSS Custom Properties, а не статичные значения в классах. Комментарий в коде прямо указывает, что это сделано для per-tenant branding override at runtime.

## Зависимости

### Внутренние зависимости quar.io

Модуль связан с frontend-частями, которые рендерят TipTap-документы:

- редактор инструкций на TipTap;
- preview редактора;
- публичный рендер инструкции;
- страницы и layout-компоненты, использующие `.container-page`;
- Tailwind-конфигурация проекта, в которой должны быть доступны utility-классы вроде `bg-canvas`, `text-ink`, `font-sans`.

Прямых импортов внутренних TypeScript/Vue-модулей в предоставленном коде нет.

### Внешние зависимости

- **Nuxt 3 / Vite asset pipeline** — для подключения CSS из `assets/css`.
- **Tailwind CSS** — используется через директивы:
  - `@tailwind base`;
  - `@tailwind components`;
  - `@tailwind utilities`;
  - `@apply`.
- **Vue 3 / Nuxt frontend** — как среда применения глобальных стилей.
- **TipTap / ProseMirror** — стили завязаны на DOM-структуры и классы/атрибуты, которые генерируют расширения:
  - Columns / Column extensions;
  - `@tiptap/extension-table`;
  - task list extension;
  - ProseMirror wrapper `.tableWrapper`;
  - editable root `.tiptap`.

Внешние сервисы вроде PostgreSQL, Prisma, S3/MinIO этим модулем напрямую не используются.

## Примеры использования

### Стандартный контейнер страницы

```vue
<template>
  <main class="container-page">
    <h1>Инструкция по эксплуатации</h1>
    <p>Содержимое публичной инструкции.</p>
  </main>
</template>
```

`container-page` обеспечивает единый max-width и адаптивные горизонтальные отступы.

### Многоколоночный блок TipTap

```html
<div class="mo-columns" style="grid-template-columns: 2fr 1fr">
  <div class="mo-column">
    <p>Основное описание шага.</p>
  </div>

  <div class="mo-column">
    <p>Дополнительные замечания.</p>
  </div>
</div>
```

На desktop блок будет отображаться в две колонки, а на экранах до `640px` автоматически станет одной колонкой.

### Таблица TipTap

```html
<div class="tableWrapper">
  <table class="mo-table">
    <tbody>
      <tr>
        <th>Параметр</th>
        <th>Значение</th>
      </tr>
      <tr>
        <td><p>Напряжение</p></td>
        <td><p>220 В</p></td>
      </tr>
    </tbody>
  </table>
</div>
```

Стили таблицы будут одинаково применяться в редакторе и публичном рендере.

### Переопределение primary-цвета

Так как цвета заданы через CSS-переменные, branding может быть переопределён на уровне контейнера или `:root`:

```css
:root {
  --color-primary: #0f766e;
  --color-primary-pressed: #115e59;
  --color-on-primary: #ffffff;
}
```

## Замечания

- Код модуля представлен только CSS-файлами. Подключение этих файлов в Nuxt-конфигурации или layout не показано в предоставленном фрагменте.
- Tailwind utility-классы `bg-canvas` и `text-ink` предполагают наличие соответствующей настройки цветов в Tailwind config. Сам конфиг в исходниках модуля не предоставлен.
- Для колонок `grid-template-columns` задаётся inline логикой TipTap `renderHTML` / `NodeView`, но соответствующий код расширений не входит в предоставленный фрагмент.
- Стили таблиц зависят от DOM-структуры TipTap/ProseMirror: `.tableWrapper > table`. При изменении markup со стороны TipTap часть правил может потребовать обновления.
- Глобальные селекторы task list и table намеренно не scoped. Это обеспечивает общий вид в редакторе и публичном рендере, но требует аккуратности: похожая HTML-структура вне TipTap также может попасть под эти стили.
- В CSS нет явных TODO, но комментарии фиксируют несколько проектных решений: defensive-селекторы для таблиц, не-scoped стили для shared-рендера и editor-only правила через `.tiptap`.

---
module: styles
section: client
generated: 2026-05-08
files: 2
---