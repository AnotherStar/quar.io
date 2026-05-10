# page-public-instruction

## Назначение

Модуль `page-public-instruction` реализует публичную страницу просмотра опубликованной инструкции в пространстве арендатора (`tenant`) по URL вида `/:tenantSlug/:instructionSlug`. Он отвечает за загрузку публичных данных инструкции, применение брендинга, рендеринг основного контента, подключённых секций и модулей, а также за клиентскую аналитику и интерактивные функции чтения.

## Ключевые возможности

- Публичный маршрут Nuxt 3 для инструкции: `pages/[tenantSlug]/[instructionSlug].vue`.
- Загрузка данных инструкции через API `/api/public/{tenantSlug}/{instructionSlug}`.
- Обработка отсутствующей инструкции через `404` с фатальной ошибкой Nuxt.
- Поддержка публичного layout `public`.
- Применение tenant-брендинга:
  - логотип;
  - primary color через CSS-переменную `--color-primary`;
  - кастомный `font-family`.
- Рендеринг:
  - основного TipTap-контента инструкции;
  - reusable sections;
  - pluggable instruction modules;
  - sidebar-слота.
- Поддержка слотирования дополнительных секций и модулей:
  - `before`;
  - `after`;
  - `sidebar`.
- Передача resolved references в read-only NodeViews через Vue `provide`.
- Клиентский viewer session через `useViewerSession`.
- Автоматическая генерация и отслеживание heading anchors для `h1/h2/h3` основного контента.
- Подключение клиентских интерактивных компонентов:
  - `AnalyticsBeacon`;
  - `BlockFeedback`;
  - `InstructionSearch`.
- SEO-настройки страницы через `useHead`.

## Архитектура

### Файловая структура

В рамках предоставленного исходного кода модуль состоит из одного Nuxt page-файла:

```text
pages/
└── [tenantSlug]/
    └── [instructionSlug].vue
```

Файл реализует публичную страницу инструкции с динамическими параметрами маршрута:

- `tenantSlug` — slug арендатора/продавца;
- `instructionSlug` — slug инструкции.

### Основной поток данных

1. Nuxt открывает страницу по маршруту:

   ```text
   /:tenantSlug/:instructionSlug
   ```

2. Из `useRoute()` извлекаются параметры:

   ```ts
   const tenantSlug = route.params.tenantSlug as string
   const instructionSlug = route.params.instructionSlug as string
   ```

3. Страница выполняет серверно-клиентскую загрузку данных через `useFetch`:

   ```ts
   const { data, error } = await useFetch(`/api/public/${tenantSlug}/${instructionSlug}`, {
     key: `pub-${tenantSlug}-${instructionSlug}`
   })
   ```

4. Если API вернул ошибку или данные отсутствуют, создаётся Nuxt-ошибка `404`:

   ```ts
   if (error.value || !data.value) {
     throw createError({
       statusCode: 404,
       statusMessage: 'Инструкция не найдена',
       fatal: true
     })
   }
   ```

5. Создаётся или извлекается viewer session:

   ```ts
   const sessionId = useViewerSession()
   ```

6. В дерево компонентов через `provide('publicRefs', ...)` передаются resolved references, необходимые read-only NodeViews внутри `InstructionContent`:

   ```ts
   provide('publicRefs', {
     sections: data.value!.refs.sections,
     modules: data.value!.refs.modules,
     instructionId: data.value!.instruction.id,
     viewerSessionId: sessionId.value
   })
   ```

7. Через computed-свойства данные разделяются по слотам:

   - `beforeSlots`;
   - `afterSlots`;
   - `sidebarSlots`.

8. Основной контент инструкции рендерится внутри `.js-instruction-content`, чтобы composable `useHeadingAnchors` работал только с заголовками основной инструкции, а не с заголовками подключённых секций и модулей.

9. Клиентские компоненты аналитики, обратной связи и поиска подключаются через `<ClientOnly>`.

### Используемые компоненты

Из кода явно используются следующие компоненты quar.io:

| Компонент | Назначение |
|---|---|
| `InstructionContent` | Read-only рендеринг TipTap/JSON-контента инструкции или секции |
| `SectionRenderer` | Рендеринг reusable section по имени и JSON-контенту |
| `ModuleRenderer` | Рендеринг подключаемого instruction module |
| `UiCard` | Карточка для отображения sidebar-секции |
| `AnalyticsBeacon` | Клиентский маяк аналитики просмотра инструкции |
| `BlockFeedback` | Клиентский сбор обратной связи по блокам инструкции |
| `InstructionSearch` | Клиентский поиск по содержимому инструкции |
| `NuxtLink` | Навигационная ссылка Nuxt |

### Используемые composables

| Composable | Назначение |
|---|---|
| `useRoute` | Получение параметров текущего маршрута |
| `useFetch` | Загрузка публичных данных инструкции |
| `useViewerSession` | Получение viewer session ID для аналитики и модулей |
| `useHead` | Настройка `<title>`, meta description и языка документа |
| `useHeadingAnchors` | Генерация anchor-id для заголовков и синхронизация `location.hash` при скролле |

### Layout

Страница явно использует layout `public`:

```ts
definePageMeta({ layout: 'public' })
```

Это означает, что публичная инструкция рендерится не в dashboard/layout продавца, а в публичном пользовательском окружении.

### API-взаимодействие

Модуль сам не содержит Nitro route-файлов, но зависит от публичного API:

```text
GET /api/public/:tenantSlug/:instructionSlug
```

Метод HTTP напрямую в коде не указан, но `useFetch` без параметра `method` использует `GET`.

Ожидаемая структура ответа выводится из использования в шаблоне:

```ts
{
  tenant: {
    name: string
    branding?: {
      logoUrl?: string
      primaryColor?: string
      fontFamily?: string
    }
  }

  instruction: {
    id: string
    title: string
    description?: string | null
    language: string
    versionNumber: number | string
    versionId: string
    content: object
  }

  refs: {
    sections: unknown
    modules: unknown
  }

  sections?: Array<{
    id: string
    name: string
    content: object
    slot: 'before' | 'after' | 'sidebar' | string
    position: number
  }>

  modules?: Array<{
    attachmentId: string
    code: string
    config: unknown
    slot: 'before' | 'after' | 'sidebar' | string
    position: number
  }>
}
```

Точный контракт API в предоставленном коде не описан, поэтому структура выше является выводом из фактических обращений к полям.

## API / Интерфейс

### Page route

```text
pages/[tenantSlug]/[instructionSlug].vue
```

Публичный маршрут:

```text
/:tenantSlug/:instructionSlug
```

Параметры маршрута:

| Параметр | Тип | Описание |
|---|---:|---|
| `tenantSlug` | `string` | Slug tenant-пространства |
| `instructionSlug` | `string` | Slug публичной инструкции |

### Загружаемый API

```text
GET /api/public/{tenantSlug}/{instructionSlug}
```

Использование:

```ts
await useFetch(`/api/public/${tenantSlug}/${instructionSlug}`, {
  key: `pub-${tenantSlug}-${instructionSlug}`
})
```

Ключ кеширования/дедупликации `useFetch`:

```text
pub-{tenantSlug}-{instructionSlug}
```

### Интерфейс страницы

Это Nuxt page-компонент, поэтому внешние `props`, `events` и `slots` у него отсутствуют.

### Внутренний provide-контракт

Страница предоставляет зависимым read-only NodeViews объект под ключом `publicRefs`:

```ts
provide('publicRefs', {
  sections: data.value!.refs.sections,
  modules: data.value!.refs.modules,
  instructionId: data.value!.instruction.id,
  viewerSessionId: sessionId.value
})
```

Назначение:

- дать `InstructionContent` и его NodeViews доступ к уже разрешённым секциям;
- дать доступ к подключаемым модулям;
- передать контекст текущей инструкции;
- передать viewer session ID.

Потребитель указан в комментарии к коду:

```ts
inject('publicRefs')
```

### Используемые props дочерних компонентов

#### `SectionRenderer`

Используется для секций в слотах `before` и `after`:

```vue
<SectionRenderer :name="s.name" :content="s.content as object" />
```

Передаваемые props:

| Prop | Значение |
|---|---|
| `name` | Название секции |
| `content` | JSON-контент секции |

#### `ModuleRenderer`

Используется для модулей в слотах `before`, `after`, `sidebar`:

```vue
<ModuleRenderer
  :code="m.code"
  :config="m.config"
  :instruction-id="data!.instruction.id"
  :viewer-session-id="sessionId"
/>
```

Передаваемые props:

| Prop | Значение |
|---|---|
| `code` | Код подключаемого модуля |
| `config` | Конфигурация конкретного attachment |
| `instruction-id` | ID инструкции |
| `viewer-session-id` | ID viewer session |

#### `InstructionContent`

Используется для основного контента инструкции и sidebar-секций:

```vue
<InstructionContent :content="data!.instruction.content as object" />
```

```vue
<InstructionContent :content="s.content as object" />
```

Передаваемые props:

| Prop | Значение |
|---|---|
| `content` | JSON-контент инструкции или секции |

#### `AnalyticsBeacon`

```vue
<AnalyticsBeacon
  :instruction-id="data!.instruction.id"
  :version-id="data!.instruction.versionId"
  :session-id="sessionId"
/>
```

Передаваемые props:

| Prop | Значение |
|---|---|
| `instruction-id` | ID инструкции |
| `version-id` | ID версии инструкции |
| `session-id` | Viewer session ID |

#### `BlockFeedback`

```vue
<BlockFeedback
  :instruction-id="data!.instruction.id"
  :version-id="data!.instruction.versionId"
  :session-id="sessionId"
  root-selector="#instruction-root"
/>
```

Передаваемые props:

| Prop | Значение |
|---|---|
| `instruction-id` | ID инструкции |
| `version-id` | ID версии инструкции |
| `session-id` | Viewer session ID |
| `root-selector` | CSS-селектор корневого элемента инструкции |

#### `InstructionSearch`

```vue
<InstructionSearch root-selector="#instruction-root" />
```

Передаваемые props:

| Prop | Значение |
|---|---|
| `root-selector` | CSS-селектор области поиска |

## Бизнес-логика

### Проверка доступности инструкции

Если публичный API не вернул данные или вернул ошибку, страница завершает рендеринг ошибкой `404`:

```ts
if (error.value || !data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Инструкция не найдена',
    fatal: true
  })
}
```

Это единственная явная проверка публикации/доступности в данном файле. Правила определения, опубликована ли инструкция, доступны ли версии и как фильтруются данные, находятся на стороне API `/api/public/...` и в предоставленный код не входят.

### Разделение секций и модулей по слотам

Секции и модули сортируются и группируются по полю `slot`.

Для слота `before`:

```ts
const sec = (data.value?.sections ?? [])
  .filter((s) => s.slot === 'before')
  .sort((a, b) => a.position - b.position)

const mod = (data.value?.modules ?? [])
  .filter((m) => m.slot === 'before')
  .sort((a, b) => a.position - b.position)
```

Аналогично работают слоты:

- `after`;
- `sidebar`.

Порядок отображения внутри каждого типа сущностей определяется `position` по возрастанию.

Важно: секции и модули сортируются отдельно. Код не объединяет их в общий список с единой сортировкой между секциями и модулями. В шаблоне для каждого слота сначала выводятся секции, затем модули.

### Sidebar layout

Наличие sidebar определяется по наличию хотя бы одной секции или модуля в `sidebarSlots`:

```ts
const hasSidebar = computed(() =>
  sidebarSlots.value.sections.length > 0 ||
  sidebarSlots.value.modules.length > 0
)
```

Если sidebar есть, основная область получает grid-разметку:

```vue
:class="hasSidebar ? 'md:grid-cols-[1fr_280px]' : ''"
```

Если sidebar отсутствует, `<article>` центрируется и ограничивается максимальной шириной:

```vue
:class="hasSidebar ? '' : 'mx-auto w-full max-w-[760px]'"
```

### Брендинг tenant

Брендинг применяется через inline-style корневого контейнера:

```ts
const brandingStyle = computed(() => {
  const b = data.value?.tenant.branding
  if (!b) return ''
  return [
    b.primaryColor ? `--color-primary:${b.primaryColor};` : '',
    b.fontFamily ? `font-family:${b.fontFamily};` : ''
  ].join('')
})
```

Поддерживаются:

- `primaryColor`;
- `fontFamily`.

Логотип выводится отдельно в header:

```vue
<img
  v-if="data!.tenant.branding?.logoUrl"
  :src="data!.tenant.branding.logoUrl"
  alt=""
  class="h-8 w-auto"
/>
```

Комментарий в коде указывает, что branding override доступен только для paid plan:

```ts
// Branding override (paid plan only)
```

Однако сама тарифная проверка в этом файле отсутствует. Вероятно, API возвращает `tenant.branding` только при наличии соответствующих прав.

### SEO и язык документа

`useHead` формирует:

- `<title>`;
- meta description;
- атрибут `lang` у `<html>`.

```ts
useHead({
  title: () => `${data.value!.instruction.title} — ${data.value!.tenant.name}`,
  meta: [
    {
      name: 'description',
      content: () => data.value!.instruction.description ?? ''
    }
  ],
  htmlAttrs: {
    lang: () => data.value!.instruction.language
  }
})
```

### Anchor tracking

Composable `useHeadingAnchors` применяется только к основному контенту инструкции:

```ts
useHeadingAnchors('.js-instruction-content')
```

В комментариях к коду явно зафиксированы правила:

- обрабатываются `h1`, `h2`, `h3`;
- каждому заголовку назначается slug-id;
- `location.hash` синхронизируется при скролле;
- секции и модули в слотах `before`/`after` не участвуют, потому что находятся вне `.js-instruction-content`.

Для заголовков с `id` задан отступ при scroll-to-anchor:

```css
.prose-mo h1[id],
.prose-mo h2[id],
.prose-mo h3[id] {
  scroll-margin-top: 16px;
}
```

Также включён глобальный smooth scroll:

```css
html {
  scroll-behavior: smooth;
}
```

### Client-only рендеринг

Основной `InstructionContent` рендерится внутри `<ClientOnly>`:

```vue
<ClientOnly>
  <InstructionContent :content="data!.instruction.content as object" />
  <template #fallback>
    <div class="min-h-[400px] animate-pulse rounded-md bg-surface" />
  </template>
</ClientOnly>
```

Для sidebar-секций `InstructionContent` также клиентский:

```vue
<ClientOnly>
  <InstructionContent :content="s.content as object" />
</ClientOnly>
```

Клиентские инструменты в конце страницы также обёрнуты в `<ClientOnly>`:

```vue
<ClientOnly>
  <AnalyticsBeacon ... />
  <BlockFeedback ... />
  <InstructionSearch ... />
</ClientOnly>
```

Это снижает риск SSR-проблем для компонентов, зависящих от DOM, браузерного состояния или клиентских API.

### Стилизация prose-контента

Класс `.prose-mo` задаёт базовую типографику для публичной инструкции:

- заголовки `h1/h2/h3`;
- параграфы;
- списки;
- blockquote;
- изображения;
- iframe;
- inline code;
- preformatted code blocks;
- ссылки.

Особое правило применяется для списков:

```css
.prose-mo ul:not([data-type='taskList']) { @apply list-disc pl-6 mb-4; }
.prose-mo ol:not([data-type='taskList']) { @apply list-decimal pl-6 mb-4; }
.prose-mo [data-module] ul,
.prose-mo [data-module] ol { @apply list-none pl-0 mb-0; }
```

Из комментария следует:

- task lists не должны получать стандартные bullets;
- списки внутри attached modules не должны наследовать prose-оформление списков.

## Зависимости

### Внутренние зависимости quar.io

Модуль зависит от следующих внутренних частей приложения:

- публичный API инструкции:

  ```text
  /api/public/:tenantSlug/:instructionSlug
  ```

- layout:

  ```text
  public
  ```

- компоненты рендеринга контента:
  - `InstructionContent`;
  - `SectionRenderer`;
  - `ModuleRenderer`;

- UI-компоненты:
  - `UiCard`;

- клиентские инструменты публичной страницы:
  - `AnalyticsBeacon`;
  - `BlockFeedback`;
  - `InstructionSearch`;

- composables:
  - `useViewerSession`;
  - `useHeadingAnchors`;

- дизайн-система / Tailwind utility classes:
  - `container-page`;
  - `prose-mo`;
  - `text-h1`, `text-body`, `text-caption`;
  - `border-hairline`;
  - `bg-surface`;
  - и другие CSS utility-классы.

### Внешние зависимости

По предоставленному файлу явно используются:

- Nuxt 3:
  - file-based routing;
  - `definePageMeta`;
  - `useFetch`;
  - `useRoute`;
  - `useHead`;
  - `createError`;
  - `ClientOnly`;
  - `NuxtLink`;

- Vue 3 Composition API:
  - `computed`;
  - `provide`;

- Tailwind CSS или совместимая utility-first CSS-конфигурация через `@apply`.

Прямых обращений к Prisma, PostgreSQL, S3/MinIO в этом page-файле нет. Эти зависимости могут использоваться на стороне API, но в предоставленный код модуля не входят.

## Примеры использования

### Открытие публичной инструкции

Если tenant имеет slug `acme`, а инструкция имеет slug `coffee-machine`, страница будет доступна по адресу:

```text
/acme/coffee-machine
```

Nuxt откроет файл:

```text
pages/[tenantSlug]/[instructionSlug].vue
```

И выполнит запрос:

```text
GET /api/public/acme/coffee-machine
```

### Добавление блока в sidebar через данные API

Если API вернёт секцию со слотом `sidebar`:

```json
{
  "id": "sec_1",
  "name": "Полезные ссылки",
  "slot": "sidebar",
  "position": 10,
  "content": {
    "type": "doc",
    "content": []
  }
}
```

Она будет отрендерена в правой колонке внутри `UiCard`:

```vue
<UiCard>
  <h3 class="text-h5 mb-2">{{ s.name }}</h3>
  <ClientOnly>
    <InstructionContent :content="s.content as object" />
  </ClientOnly>
</UiCard>
```

При наличии sidebar основная сетка переключится на две колонки на `md`-размере экрана:

```text
md:grid-cols-[1fr_280px]
```

## Замечания

- В модуле представлен только page-файл. Реализация API `/api/public/:tenantSlug/:instructionSlug`, компонентов `InstructionContent`, `ModuleRenderer`, `SectionRenderer`, `AnalyticsBeacon`, `BlockFeedback`, `InstructionSearch`, а также composables `useViewerSession` и `useHeadingAnchors` в исходный код не включена.
- Проверка тарифного ограничения для branding override в этом файле не выполняется. Код только применяет `tenant.branding`, если он уже присутствует в ответе API.
- Секции и модули внутри одного слота не объединяются в общий порядок. Сначала всегда выводятся все секции слота, затем все модули слота, несмотря на поле `position`.
- Основной `InstructionContent` рендерится только на клиенте. Это может быть осознанным решением из-за TipTap/NodeViews, но означает, что HTML основного контента не будет полностью отрендерен на сервере из этого компонента.
- `html { scroll-behavior: smooth; }` задан в `<style>` page-компонента без `scoped`, поэтому правило является глобальным.
- Для `provide('publicRefs', ...)` используется plain object, зафиксированный на время жизни страницы. Это соответствует комментарию в коде, но не предполагает реактивного обновления refs после загрузки страницы.
- В шаблоне активно используется non-null assertion `data!`. Это безопасно только потому, что перед рендерингом выполняется фатальная ошибка при отсутствии данных.

---
module: page-public-instruction
section: client
generated: 2026-05-08
files: 1
---