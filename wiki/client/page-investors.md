# page-investors

## Назначение

`page-investors` — это публичная Nuxt-страница `pages/investors.vue`, представляющая investor pitch quar.io. Модуль показывает инвестиционный нарратив продукта: проблему плохих инструкций, решение через QR-ready мобильные инструкции, план проверки спроса, бизнес-модель, дифференциацию, roadmap и инвестиционный запрос.

Страница не реализует интерактивную бизнес-функциональность SaaS, а служит маркетингово-презентационным лендингом для инвесторов.

## Ключевые возможности

- Публичная страница investor pitch по маршруту `/investors`.
- Использование отдельного layout `blank`, без стандартного приложения/дашборда.
- SEO-настройки через `useHead`: заголовок и meta description.
- Hero-блок с positioning quar.io и CTA-ссылками:
  - `#deck` — переход к pitch-секции;
  - `#ask` — переход к инвестиционному запросу.
- Визуальный mockup продукта:
  - мобильная инструкция;
  - QR-ready состояние;
  - risk report;
  - проблемные шаги;
  - базовые proof metrics.
- Структурированное описание:
  - проблемы рынка;
  - решения;
  - market wedge;
  - proof plan;
  - business model;
  - differentiation;
  - roadmap;
  - investor ask.
- Рендеринг повторяющихся блоков через массивы данных и `v-for`.
- Локальные декоративные CSS-элементы `.pitch-mesh*` в `scoped`-стиле.

## Архитектура

### Файлы

```text
pages/
└── investors.vue
```

Модуль представлен одним Nuxt page-файлом:

- `pages/investors.vue` автоматически регистрируется Nuxt как страница маршрута `/investors`.
- Внутри файла используется `<script setup lang="ts">`, `<template>` и локальный `<style scoped>`.

### Структура `investors.vue`

#### `script setup`

В верхней части страницы задаются метаданные и статические данные для шаблона.

```ts
definePageMeta({ layout: 'blank' })
```

Страница использует layout `blank`. Это означает, что она намеренно отделена от основного интерфейса quar.io, например от публичных страниц инструкций или seller dashboard.

```ts
useHead({
  title: 'quar.io — investor pitch',
  meta: [
    {
      name: 'description',
      content: 'Investor pitch for quar.io: QR-ready mobile instructions that protect marketplace product ratings.'
    }
  ]
})
```

Через `useHead` задаются SEO-метаданные страницы.

#### Статические data-массивы

В модуле определены локальные массивы, которые используются для рендеринга секций:

- `problemSignals` — сигналы проблемы;
- `wedgeSteps` — шаги product wedge / solution workflow;
- `marketCards` — описание первого ICP, категорий входа и платного момента;
- `proofMetrics` — метрики, которые нужно доказать до масштабирования;
- `moatItems` — элементы дифференциации;
- `roadmap` — план на следующие 90 дней.

Эти данные не загружаются из API и не зависят от backend.

#### Template

Шаблон состоит из нескольких крупных лендинговых секций:

1. **Hero / Intro**
   - темный navy-фон;
   - декоративные элементы;
   - заголовок investor pitch;
   - CTA-кнопки;
   - продуктовый mockup;
   - блок thesis с `problemSignals`.

2. **Problem**
   - описание ключевой проблемы селлеров;
   - четыре карточки с аспектами боли.

3. **Solution**
   - описание quar.io как post-purchase канала;
   - карточки `wedgeSteps`.

4. **Market wedge**
   - описание точки входа на рынок;
   - карточки `marketCards`.

5. **Proof plan + Business model**
   - список `proofMetrics`;
   - блоки Pilot / Catalog / Brand Enterprise.

6. **Differentiation**
   - позиционирование против QR-хостинга PDF, редакторов инструкций и AI-manual tools;
   - карточки `moatItems`.

7. **Roadmap + Investor ask**
   - список roadmap-этапов;
   - инвестиционный запрос;
   - целевые milestone-метрики.

#### Scoped CSS

Внизу файла определены локальные стили:

```css
.pitch-mesh {
  position: absolute;
  width: 220px;
  height: 150px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 12px;
  background-image:
    linear-gradient(rgb(255 255 255 / 12%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 12%) 1px, transparent 1px);
  background-size: 22px 22px;
  transform: rotate(-8deg) skewX(-10deg);
}
```

Классы:

- `.pitch-mesh` — базовый декоративный grid-элемент;
- `.pitch-mesh-left` — позиционирование слева;
- `.pitch-mesh-right` — позиционирование справа с альтернативной трансформацией.

CSS изолирован через `scoped`, поэтому эти стили применяются только внутри `investors.vue`.

## API / Интерфейс

### Маршрут страницы

Так как файл расположен в директории `pages`, Nuxt автоматически создает маршрут:

```text
GET /investors
```

Это client-facing page route, а не Nitro API route.

### Props

У страницы нет props.

```ts
// props не объявлены
```

### Events

Компонент не эмитит событий.

```ts
// defineEmits не используется
```

### Slots

Slots не используются.

### Composables

Используются стандартные Nuxt composables/macros:

| API | Назначение |
|---|---|
| `definePageMeta` | Указывает page-level metadata, в данном случае layout `blank` |
| `useHead` | Устанавливает `<title>` и meta description |

### Внутренний интерфейс данных

#### `problemSignals`

```ts
const problemSignals: string[]
```

Используется для списка тезисов в hero-блоке `Thesis`.

Пример элемента:

```ts
'Покупатель не понял сборку и ставит 1-3 звезды'
```

#### `wedgeSteps`

```ts
const wedgeSteps: Array<{
  step: string
  title: string
  copy: string
}>
```

Используется в секции `Solution`.

Пример:

```ts
{
  step: '01',
  title: 'Находим товары с явными жалобами',
  copy: 'Смотрим отзывы и вопросы: инструкция, сборка, настройка, комплектация, "не работает".'
}
```

#### `marketCards`

```ts
const marketCards: Array<{
  title: string
  value: string
  copy: string
}>
```

Используется в секции `Market wedge`.

#### `proofMetrics`

```ts
const proofMetrics: string[]
```

Используется для списка proof criteria.

#### `moatItems`

```ts
const moatItems: Array<{
  title: string
  copy: string
}>
```

Используется в секции `Differentiation`.

#### `roadmap`

```ts
const roadmap: string[]
```

Используется в секции `Roadmap`. Индекс элемента используется для отображения порядкового номера:

```vue
<p class="text-h3 text-primary">0{{ index + 1 }}</p>
```

## Бизнес-логика

В коде нет серверной бизнес-логики, авторизации, тарифных ограничений, работы с БД, публикации инструкций или API-запросов.

Однако в тексте страницы зафиксирована продуктовая и go-to-market логика quar.io:

### 1. Основная инвестиционная гипотеза

quar.io позиционируется как инструмент защиты рейтинга товара через понятные QR-инструкции.

Ключевой тезис:

> Плохая инструкция превращается в плохой отзыв быстрее, чем бренд успевает ответить.

### 2. Product wedge

В секции `Solution` описан workflow входа:

1. Найти товары с явными жалобами в отзывах и вопросах.
2. За 48 часов переделать PDF, фото или скан в мобильную QR-ready инструкцию.
3. Показать селлеру, где покупатель застрял, через просмотры, дочитывание, отметки и комментарии.

Эта логика присутствует только как статический контент страницы, не как исполняемый алгоритм.

### 3. ICP и market wedge

Первый ICP:

- private-label селлеры и бренды на маркетплейсах;
- 10–100 SKU;
- товары с повторяющимися жалобами на сборку и использование.

Категории входа:

- мебель;
- тренажеры;
- детские товары;
- электроника;
- инструменты;
- товары для хобби и сборки.

### 4. Модель монетизации

На странице описана последовательность:

1. **Pilot** — фиксированная цена за перенос 5–10 инструкций, QR-ссылки, разбор отзывов и отчет.
2. **Catalog** — подписка для 50–200 SKU.
3. **Brand / Enterprise** — брендирование, переводы, роли, интеграции и compliance после подтвержденного спроса.

Это не реализовано как pricing engine или billing logic в данном модуле.

### 5. Proof plan

До масштабирования предполагается доказать:

- QR-инструкции опубликованы;
- ссылки размещены в карточке, вкладыше или чате;
- покупатели открывают инструкции;
- проблемные шаги получают правки;
- селлер просит перенести остальные SKU;
- пилот переходит в оплату или подписку.

### 6. Investor ask

Инвестиционный запрос сформулирован как финансирование скорости проверки, а не расширения продукта.

Целевые milestone-метрики, указанные в шаблоне:

- 3 пилотных клиента;
- 30 опубликованных инструкций;
- 100+ реальных просмотров;
- 1+ платный переход.

## Зависимости

### Внутренние зависимости quar.io

В коде явно используются только инфраструктурные элементы frontend-проекта:

- Nuxt pages routing;
- layout `blank`;
- глобальная дизайн-система / Tailwind utility classes.

Судя по классам, страница зависит от набора design tokens, определенных на уровне проекта:

- цвета:
  - `bg-canvas`;
  - `bg-navy`;
  - `text-ink`;
  - `text-slate`;
  - `bg-primary`;
  - `bg-brand-yellow`;
  - `bg-brand-pink`;
  - `bg-brand-green`;
  - `bg-brand-orange`;
  - `bg-tint-*`;
- типографика:
  - `text-micro`;
  - `text-subtitle`;
  - `text-caption`;
  - `text-caption-bold`;
  - `text-body-sm`;
  - `text-body-md`;
  - `text-h3`;
  - `text-h4`;
  - `text-h5`;
- layout utilities:
  - `container-page`;
  - `py-hero`;
  - `py-section-lg`;
  - `mt-section`;
  - `shadow-mockup`;
  - `shadow-subtle`;
  - `shadow-card`.

Эти классы не определены в данном файле, поэтому должны существовать в глобальной CSS/Tailwind-конфигурации проекта.

### Внешние зависимости

Прямые внешние сервисы не используются.

Модуль не обращается к:

- Prisma/PostgreSQL;
- S3/MinIO;
- Nitro API;
- внешним SDK;
- аналитическим API;
- авторизации;
- платежным сервисам.

Технически страница зависит от:

- Nuxt 3;
- Vue 3;
- Tailwind CSS или совместимой utility-first CSS-конфигурации проекта.

## Примеры использования

### 1. Открытие страницы investor pitch

После запуска Nuxt-приложения страница доступна по маршруту:

```text
/investors
```

Пример:

```text
https://manual.online/investors
```

Nuxt отрендерит `pages/investors.vue` с layout `blank`.

### 2. Добавление нового пункта в roadmap

Чтобы добавить дополнительный roadmap-этап, достаточно расширить массив `roadmap`:

```ts
const roadmap = [
  'Пилоты: 3 селлера, 15-30 инструкций, реальные просмотры покупателей.',
  'Каталог: массовый импорт SKU, единый стиль, библиотека ссылок для поддержки.',
  'Expansion: переводы, печатные вкладыши, брендирование, затем интеграции и warranty modules.',
  'Новый этап: описание следующего действия.'
]
```

Шаблон автоматически отобразит новый пункт через `v-for`.

### 3. Изменение SEO-описания страницы

SEO-метаданные задаются в `useHead`:

```ts
useHead({
  title: 'quar.io — investor pitch',
  meta: [
    {
      name: 'description',
      content: 'Investor pitch for quar.io: QR-ready mobile instructions that protect marketplace product ratings.'
    }
  ]
})
```

Для изменения description нужно обновить поле `content`.

## Замечания

- Страница полностью статическая: все данные находятся непосредственно в `pages/investors.vue`.
- Нет загрузки данных из CMS, базы данных или API.
- Нет i18n: контент смешивает русский основной текст и англоязычные заголовки/лейблы вроде `Investor pitch`, `Risk report`, `Market wedge`, `Proof plan`.
- Нет переиспользуемых компонентов: все карточки и секции описаны прямо в page-файле.
- Повторяющиеся визуальные паттерны карточек можно в будущем вынести в UI-компоненты, если investor pitch будет расширяться или появятся похожие лендинги.
- Страница сильно зависит от глобальных CSS utility-классов проекта. Если дизайн-токены будут переименованы, этот модуль потребует синхронного обновления.
- В коде нет явных TODO.
- Инвестиционные метрики и бизнес-модель представлены как статический текст; они не связаны с реальной аналитикой quar.io.

---
module: page-investors
section: client
generated: 2026-05-08
files: 1
---