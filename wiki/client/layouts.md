# layouts

## Назначение

Модуль `layouts` задаёт базовые Nuxt-layouts для разных зон quar.io: публичного сайта, авторизации/минимальных страниц, публичных инструкций и кабинета продавца. Он отвечает за общую оболочку страниц: фон, шапку, футер, боковую навигацию дашборда и размещение контента через `<slot />`.

## Ключевые возможности

- Предоставляет четыре layout-шаблона Nuxt:
  - `default` — основной публичный сайт с шапкой и футером.
  - `dashboard` — кабинет продавца с верхней панелью, tenant-индикатором и боковой навигацией.
  - `blank` — минимальная оболочка без шапки и футера.
  - `public` — простая публичная оболочка для страниц без общей навигации.
- Интегрируется с состоянием авторизации через `useAuthState()`.
- Отображает разные CTA в публичной шапке в зависимости от наличия пользователя.
- Формирует меню дашборда из:
  - статических core-разделов;
  - динамических пунктов, объявленных подключаемыми модулями.
- Проверяет активный пункт меню по текущему маршруту.
- Выполняет logout из дашборда через `/api/auth/logout`.

## Архитектура

Модуль состоит из четырёх Vue-файлов в директории `layouts/`.

```text
layouts/
├── blank.vue
├── dashboard.vue
├── default.vue
└── public.vue
```

### `layouts/default.vue`

Основной layout для публичных страниц quar.io.

Содержит:

- корневой контейнер с минимальной высотой экрана и фоном `bg-canvas`;
- sticky-header с логотипом quar.io;
- публичную навигацию:
  - `/pricing` — «Тарифы»;
  - `/#features` — «Возможности»;
- auth-aware блок действий:
  - если пользователь авторизован — кнопка «Кабинет» на `/dashboard`;
  - если пользователь не авторизован — кнопки «Войти» и «Начать бесплатно»;
- `<main>` со слотом для содержимого страницы;
- футер со ссылками:
  - `/pricing`;
  - `/about`;
  - `/terms`;
  - `/privacy`.

Использует composable:

```ts
const { user } = useAuthState()
```

`user` применяется только для выбора набора кнопок в header.

### `layouts/dashboard.vue`

Layout для личного кабинета продавца.

Содержит:

- верхнюю панель с:
  - логотипом quar.io;
  - названием текущего tenant, если он доступен;
  - email пользователя;
  - кнопкой выхода;
- двухколоночную сетку:
  - `aside` с навигацией;
  - `section` со слотом страницы.

Используемые состояния и сервисы:

```ts
const { user, currentTenant } = useAuthState()
const route = useRoute()
const api = useApi()
```

#### Core-навигация

В коде задан статический список разделов кабинета:

```ts
const coreItems = [
  { to: '/dashboard', label: 'Обзор', icon: 'lucide:layout-dashboard', exact: true },
  { to: '/dashboard/instructions', label: 'Инструкции', icon: 'lucide:file-text' },
  { to: '/dashboard/sections', label: 'Секции', icon: 'lucide:blocks' },
  { to: '/dashboard/modules', label: 'Модули', icon: 'lucide:puzzle' },
  { to: '/dashboard/scan-qr', label: 'Пикнуть QR', icon: 'lucide:scan-qr-code' },
  { to: '/dashboard/billing', label: 'Тариф и оплата', icon: 'lucide:credit-card' },
  { to: '/dashboard/settings', label: 'Настройки', icon: 'lucide:settings' }
]
```

Комментарий в исходном коде указывает, что `/dashboard/scan-qr` является stub-страницей-заглушкой, чтобы ссылка не приводила к 404.

#### Навигация подключаемых модулей

Layout импортирует `moduleRegistry`:

```ts
import { moduleRegistry } from '~~/modules-sdk/registry'
```

Затем получает список модулей tenant через API:

```ts
const { data: modulesData } = await useAsyncData(
  'sidebar-modules',
  () => api<{ modules: any[] }>('/api/modules'),
  { default: () => ({ modules: [] }) }
)
```

На основе ответа API и локального registry вычисляются пункты меню:

```ts
const moduleNavItems = computed(() => {
  return moduleRegistry
    .filter((m) => m.dashboardNavItem)
    .filter((m) => modulesData.value?.modules.find((api) => api.code === m.manifest.code)?.tenantConfig?.enabled)
    .map((m) => ({ ...m.dashboardNavItem!, code: m.manifest.code }))
})
```

Пункт модуля попадает в sidebar только если:

1. модуль объявил `dashboardNavItem` в `modules-sdk/registry`;
2. API `/api/modules` вернул модуль с тем же `code`;
3. у найденного модуля включён флаг `tenantConfig.enabled`.

#### Проверка активного маршрута

Для подсветки активного пункта используется функция:

```ts
const isActive = (to: string, exact?: boolean) =>
  exact ? route.path === to : route.path.startsWith(to)
```

Если `exact` равен `true`, требуется полное совпадение пути. Для остальных пунктов достаточно префиксного совпадения.

#### Logout

Выход из аккаунта реализован функцией:

```ts
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/auth/login')
}
```

После успешного POST-запроса пользователь перенаправляется на страницу входа.

### `layouts/blank.vue`

Минимальный layout без навигации:

```vue
<template>
  <div class="min-h-screen bg-surface-soft">
    <slot />
  </div>
</template>
```

Используется для страниц, которым нужна только базовая высота экрана и мягкий фон. В коде отсутствует логика, props или интеграции с auth.

### `layouts/public.vue`

Простая публичная оболочка:

```vue
<template>
  <div class="min-h-screen bg-canvas">
    <slot />
  </div>
</template>
```

Отличается от `default.vue` отсутствием header/footer и любой бизнес-логики. Подходит для публичных страниц, где внешний вид полностью контролируется самой страницей.

## API / Интерфейс

В модуле нет Nitro route-файлов, поэтому собственные HTTP-эндпоинты он не объя��ляет.

### Nuxt layouts

Все файлы являются Nuxt layouts и используются через стандартный механизм Nuxt 3, например:

```ts
definePageMeta({
  layout: 'dashboard'
})
```

или по умолчанию через `default.vue`.

### `default.vue`

Тип: Vue/Nuxt layout.

#### Props

Не принимает props.

#### Events

Не эмитит пользовательские события.

#### Slots

| Slot | Описание |
|---|---|
| `default` | Основное содержимое страницы, рендерится внутри `<main>` |

#### Внутренний интерфейс

Использует `useAuthState()` и ожидает наличие поля:

```ts
user
```

`user` используется как truthy/falsy значение для выбора кнопок в шапке.

### `dashboard.vue`

Тип: Vue/Nuxt layout.

#### Props

Не принимает props.

#### Events

Не эмитит пользовательские события.

#### Slots

| Slot | Описание |
|---|---|
| `default` | Контент страницы кабинета, рендерится в правой области layout |

#### Внутренний интерфейс auth-состояния

Использует:

```ts
const { user, currentTenant } = useAuthState()
```

Ожидаемые поля, исходя из шаблона:

```ts
user?.email
currentTenant?.name
```

#### Внутренний API-вызов

Layout вызывает:

```http
GET /api/modules
```

через composable `useApi()`.

Ожидаемая форма ответа по использованию в коде:

```ts
{
  modules: Array<{
    code: string
    tenantConfig?: {
      enabled?: boolean
    }
  }>
}
```

Тип в коде указан как `any[]`, поэтому строгий контракт на уровне этого файла не зафиксирован.

#### Контракт `moduleRegistry`

Layout ожидает, что элементы `moduleRegistry` имеют следующую используемую структуру:

```ts
{
  manifest: {
    code: string
  }
  dashboardNavItem?: {
    to: string
    label: string
    icon: string
  }
}
```

Фактический тип registry находится вне текущего модуля и в предоставленном коде не показан.

### `blank.vue`

Тип: Vue/Nuxt layout.

#### Props

Не принимает props.

#### Events

Не эмитит события.

#### Slots

| Slot | Описание |
|---|---|
| `default` | Полное содержимое страницы |

### `public.vue`

Тип: Vue/Nuxt layout.

#### Props

Не принимает props.

#### Events

Не эмитит события.

#### Slots

| Slot | Описание |
|---|---|
| `default` | Полное содержимое публичной страницы |

## Бизнес-логика

### Выбор действий в публичной шапке

В `default.vue` UI зависит от состояния пользователя:

- если `user` существует:
  - отображается кнопка «Кабинет»;
- если `user` отсутствует:
  - отображаются кнопки «Войти» и «Начать бесплатно».

Дополнительных проверок ролей, tenant или тарифов в этом layout нет.

### Отображение tenant в дашборде

В `dashboard.vue` название текущей организации/tenant показывается только если `currentTenant` доступен:

```vue
<span v-if="currentTenant">
  {{ currentTenant.name }}
</span>
```

Если tenant отсутствует, бейдж не отображается.

### Формирование меню кабинета

Sidebar состоит из двух частей:

1. Core-разделы, заданные непосредственно в `dashboard.vue`.
2. Пункты подключаемых модулей.

Пункты модулей выводятся только при выполнении условий:

- модуль зарегистрирован в `moduleRegistry`;
- у модуля есть `dashboardNavItem`;
- `/api/modules` вернул модуль с совпадающим `code`;
- для tenant включён `tenantConfig.enabled`.

Если ни один модуль не подходит под эти условия, раздел с модульной навигацией и разделитель `<hr>` не выводятся.

### Подсветка активной страницы

Для `/dashboard` используется точное сравнение:

```ts
route.path === '/dashboard'
```

Для остальных пунктов используется проверка по префиксу:

```ts
route.path.startsWith(to)
```

Это позволяет подсвечивать, например, `/dashboard/instructions` также на вложенных страницах вроде `/dashboard/instructions/123`.

### Выход из аккаунта

При нажатии «Выйти»:

1. отправляется `POST /api/auth/logout`;
2. после завершения запроса выполняется переход на `/auth/login`.

Обработка ошибок logout в текущем коде отсутствует.

## Зависимости

### Внутренние зависимости quar.io

- `useAuthState()` — composable состояния авторизации и текущего tenant.
- `useApi()` — composable для API-запросов к backend.
- `modules-sdk/registry` — registry подключаемых модулей.
- `UiButton` — UI-компонент кнопки.
- `/api/modules` — API для получения списка модулей tenant.
- `/api/auth/logout` — API для завершения сессии.
- Дизайн-система/utility-классы проекта:
  - `container-page`;
  - `bg-canvas`;
  - `bg-surface-soft`;
  - `border-hairline`;
  - `text-ink`;
  - `text-steel`;
  - `shadow-subtle`;
  - и другие CSS utility-классы.

### Внешние зависимости и фреймворк

- Nuxt 3:
  - layouts convention;
  - `<NuxtLink>`;
  - `useRoute`;
  - `useAsyncData`;
  - `navigateTo`;
  - `$fetch`.
- Vue 3:
  - `<script setup>`;
  - `computed`.
- Nuxt Icon или совместимый компонент `Icon`:
  - используются иконки с префиксом `lucide:*`.

## Примеры использования

### Использование layout для страницы кабинета

```vue
<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})
</script>

<template>
  <div>
    <h1 class="text-h1">Инструкции</h1>
    <!-- Контент страницы будет вставлен в slot dashboard layout -->
  </div>
</template>
```

### Использование минимального layout для страницы авторизации

```vue
<script setup lang="ts">
definePageMeta({
  layout: 'blank'
})
</script>

<template>
  <div class="mx-auto max-w-md py-section">
    <!-- Форма входа или регистрации -->
  </div>
</template>
```

### Добавление пункта модуля в sidebar дашборда

Чтобы пункт появился в `dashboard.vue`, модуль должен быть зарегистрирован в `moduleRegistry` и иметь `dashboardNavItem`. Также backend `/api/modules` должен вернуть этот модуль включённым для tenant.

Условный пример ожидаемой структуры registry:

```ts
{
  manifest: {
    code: 'analytics'
  },
  dashboardNavItem: {
    to: '/dashboard/analytics',
    label: 'Аналитика',
    icon: 'lucide:chart-line'
  }
}
```

И соответствующий фрагмент ответа API:

```ts
{
  modules: [
    {
      code: 'analytics',
      tenantConfig: {
        enabled: true
      }
    }
  ]
}
```

## Замечания

- В `dashboard.vue` тип ответа `/api/modules` задан как `any[]`, поэтому контракт модулей не проверяется строго на уровне TypeScript.
- В logout-сценарии нет обработки ошибок. Если `POST /api/auth/logout` завершится неуспешно, fallback-поведение не описано.
- Пункт `/dashboard/scan-qr` помечен комментарием как stub: страница существует как placeholder, чтобы ссылка не вела на 404.
- Проверка активности через `route.path.startsWith(to)` может подсветить пункт при совпадении префикса с похожим маршрутом. Для текущих маршрутов это выглядит допустимо, но при добавлении новых разделов стоит учитывать возможные коллизии.
- В `default.vue` год в футере вычисляется прямо в шаблоне через `new Date().getFullYear()`. Это простое решение, но при SSR/гидратации теоретически может дать различие на границе года.
- Layouts не содержат собственных middleware-проверок доступа. Если страницы дашборда должны быть защищены, это должно обеспечиваться на уровне страниц, route middleware или backend API.

---
module: layouts
section: client
generated: 2026-05-08
files: 4
---