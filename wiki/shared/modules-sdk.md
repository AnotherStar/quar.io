# modules-sdk

## Назначение

`modules-sdk` задаёт контракты и реестр подключаемых модулей инструкций в quar.io. Модуль является единой точкой описания того, какие instruction modules доступны платформе, какие данные они декларируют в manifest и какие Vue-компоненты предоставляют для публичной страницы, дашборда и редактора.

## Ключевые возможности

- Описывает TypeScript-контракты для подключаемых модулей инструкций.
- Хранит централизованный реестр загруженных модулей.
- Позволяет находить модуль по стабильному коду `manifest.code`.
- Поддерживает публичный renderer-компонент модуля.
- Поддерживает опциональные компоненты:
  - административной настройки в дашборде;
  - настройки экземпляра модуля внутри редактора;
  - пункта навигации в sidebar дашборда.
- Описывает manifest модуля, включая версию, тарифные требования и схему конфигурации.
- Предусматривает конфигурационные поля для автоматического построения формы в dashboard.

## Архитектура

Модуль состоит из двух файлов:

```text
modules-sdk/
├── registry.ts
└── types.ts
```

### `types.ts`

Файл содержит SDK-контракты, которые должен реализовать каждый подключаемый instruction module.

Ключевая модель — `ModuleDefinition`. Каждый модуль должен экспортировать объект этого типа, содержащий:

- `manifest` — описание модуля;
- `PublicComponent` — асинхронный загрузчик Vue-компонента для публичной страницы инструкции;
- `AdminComponent` — опциональный компонент для tenant-wide настройки;
- `EditorConfigComponent` — опциональный компонент для настройки конкретного экземпляра модуля в редакторе;
- `dashboardNavItem` — опциональный пункт навигации в дашборде.

Из комментариев в коде следует, что платформа не должна напрямую импортировать внутренности модулей. Вместо этого она обнаруживает модули через `modules-sdk/registry.ts` и рендерит их по `manifest.code`.

### `registry.ts`

Файл является единой точкой регистрации доступных модулей.

В текущей реализации в реестр импортируются четыре модуля:

```ts
import warranty from '~~/instruction-modules/warranty-registration'
import chat from '~~/instruction-modules/chat-consultant'
import faq from '~~/instruction-modules/faq'
import feedback from '~~/instruction-modules/feedback'
```

После импорта они собираются в массив:

```ts
export const moduleRegistry: ModuleDefinition[] = [warranty, chat, faq, feedback]
```

Также предоставляется вспомогательная функция поиска модуля по коду:

```ts
export function getModuleByCode(code: string): ModuleDefinition | undefined {
  return moduleRegistry.find((m) => m.manifest.code === code)
}
```

### Взаимодействие частей

Общий поток работы выглядит так:

1. Каждый pluggable instruction module реализует `ModuleDefinition`.
2. Модуль импортируется в `modules-sdk/registry.ts`.
3. Реестр `moduleRegistry` становится источником правды для списка доступных модулей.
4. Платформа обращается к реестру напрямую или через `getModuleByCode`.
5. По найденному `ModuleDefinition` платформа может:
   - прочитать `manifest`;
   - загрузить публичный Vue-компонент;
   - загрузить административный компонент;
   - загрузить компонент настройки в редакторе;
   - добавить sidebar-пункт в dashboard.

## API / Интерфейс

В этом модуле нет Nitro route-файлов и HTTP-эндпоинтов. Основной API представлен TypeScript-интерфейсами и экспортами реестра.

### Экспорты `registry.ts`

#### `moduleRegistry`

```ts
export const moduleRegistry: ModuleDefinition[]
```

Массив всех подключённых модулей.

Текущий состав:

- `warranty-registration`
- `chat-consultant`
- `faq`
- `feedback`

Фактические коды берутся из `manifest.code` соответствующих модулей. В `registry.ts` импортируются сами определения модулей, а не их внутренние компоненты напрямую.

#### `getModuleByCode`

```ts
export function getModuleByCode(code: string): ModuleDefinition | undefined
```

Ищет модуль в `moduleRegistry` по `manifest.code`.

Параметры:

| Параметр | Тип | Описание |
|---|---|---|
| `code` | `string` | Стабильный код модуля |

Возвращает:

| Тип | Описание |
|---|---|
| `ModuleDefinition` | Если модуль найден |
| `undefined` | Если модуль с таким кодом отсутствует в реестре |

### SDK-контракты `types.ts`

#### `ModuleConfigField`

```ts
export interface ModuleConfigField {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select'
  required?: boolean
  default?: unknown
  options?: Array<{ value: string; label: string }>
}
```

Описывает одно поле конфигурации модуля для упрощённой автоматической формы в dashboard.

Поля:

| Поле | Тип | Обязательное | Описание |
|---|---|---:|---|
| `key` | `string` | Да | Ключ значения в конфигурации |
| `label` | `string` | Да | Человекочитаемое название поля |
| `type` | `'string' \| 'number' \| 'boolean' \| 'select'` | Да | Тип поля |
| `required` | `boolean` | Нет | Признак обязательности |
| `default` | `unknown` | Нет | Значение по умолчанию |
| `options` | `Array<{ value: string; label: string }>` | Нет | Варианты выбора для `select` |

#### `ModuleManifestDef`

```ts
export interface ModuleManifestDef {
  code: string
  name: string
  description?: string
  version: string
  requiresPlan?: string | null
  configSchema: Record<string, unknown>
  configFields?: ModuleConfigField[]
}
```

Manifest модуля. Используется как декларативное описание модуля и, согласно комментарию в коде, синхронизируется с базой данных при boot/seed через Prisma.

Поля:

| Поле | Тип | Обязательное | Описание |
|---|---|---:|---|
| `code` | `string` | Да | Уникальный стабильный идентификатор модуля, например `warranty-registration` |
| `name` | `string` | Да | Название модуля |
| `description` | `string` | Нет | Описание модуля |
| `version` | `string` | Да | Версия модуля |
| `requiresPlan` | `string \| null` | Нет | Минимальный тарифный план, например `free`, `plus`, `business`; `null` означает доступность всегда |
| `configSchema` | `Record<string, unknown>` | Да | JSON Schema для конфигурации экземпляра модуля |
| `configFields` | `ModuleConfigField[]` | Нет | Упрощённый список полей для автоформы в dashboard |

#### `ModuleRenderProps`

```ts
export interface ModuleRenderProps {
  instructionId: string
  config: Record<string, unknown>
  viewerSessionId: string
}
```

Props, которые получает публичный компонент модуля.

Поля:

| Поле | Тип | Описание |
|---|---|---|
| `instructionId` | `string` | Идентификатор инструкции |
| `config` | `Record<string, unknown>` | Конфигурация модуля, полученная объединением tenant defaults и per-instruction override |
| `viewerSessionId` | `string` | Стабильный идентификатор сессии публичного посетителя для внутренней аналитики модуля |

#### `DashboardNavItem`

```ts
export interface DashboardNavItem {
  to: string
  label: string
  icon: string
}
```

Описывает пункт навигации, который модуль может добавить в sidebar дашборда, если он включён для tenant.

Поля:

| Поле | Тип | Описание |
|---|---|---|
| `to` | `string` | Целевой путь внутри `/dashboard` |
| `label` | `string` | Текст пункта в sidebar |
| `icon` | `string` | Имя иконки Lucide, например `lucide:shield-check` |

#### `ModuleDefinition`

```ts
export interface ModuleDefinition {
  manifest: ModuleManifestDef
  PublicComponent: () => Promise<{ default: Component }>
  AdminComponent?: () => Promise<{ default: Component }>
  EditorConfigComponent?: () => Promise<{ default: Component }>
  dashboardNavItem?: DashboardNavItem
}
```

Основной контракт подключаемого модуля.

Поля:

| Поле | Тип | Обязательное | Описание |
|---|---|---:|---|
| `manifest` | `ModuleManifestDef` | Да | Декларативное описание модуля |
| `PublicComponent` | `() => Promise<{ default: Component }>` | Да | Асинхронный загрузчик публичного Vue-компонента |
| `AdminComponent` | `() => Promise<{ default: Component }>` | Нет | Компонент tenant-wide настройки в `/dashboard/modules` |
| `EditorConfigComponent` | `() => Promise<{ default: Component }>` | Нет | Компонент настройки конкретного экземпляра модуля из редактора |
| `dashboardNavItem` | `DashboardNavItem` | Нет | Sidebar-пункт в дашборде |

### Vue-компоненты модулей

Сами Vue-компоненты в исходном коде `modules-sdk` не представлены, но их контракты описаны через `ModuleDefinition`.

#### `PublicComponent`

Назначение: рендер модуля на публичной странице инструкции.

Ожидаемые props соответствуют `ModuleRenderProps`:

```ts
{
  instructionId: string
  config: Record<string, unknown>
  viewerSessionId: string
}
```

Events и slots в SDK-контракте не описаны.

#### `AdminComponent`

Назначение: административная tenant-wide настройка модуля в `/dashboard/modules`.

Точный набор props/events/slots в SDK не задан.

#### `EditorConfigComponent`

Назначение: настройка `configOverride` конкретного экземпляра модуля из dropdown `module-ref` в редакторе.

Согласно комментарию в коде, компонент получает:

```ts
modelValue: Record<string, unknown>
```

И должен эмитить:

```ts
update:modelValue
```

Это используется для сохранения изменений в node редактора.

Slots в SDK-контракте не описаны.

## Бизнес-логика

### Реестр как single source of truth

`moduleRegistry` является единственным источником правды для того, какие модули загружены в платформу.

Чтобы добавить новый модуль, согласно комментарию в коде, нужно:

1. создать папку модуля под `modules/<code>/` или, в текущей структуре импортов, соответствующий модуль в `instruction-modules`;
2. добавить `index.ts`, который default-export-ит `ModuleDefinition`;
3. импортировать модуль в `modules-sdk/registry.ts`;
4. добавить его в массив `moduleRegistry`.

### Поиск по стабильному коду

Модули идентифицируются через `manifest.code`.

Функция:

```ts
getModuleByCode(code)
```

выполняет линейный поиск по массиву `moduleRegistry` и возвращает первый модуль, у которого:

```ts
m.manifest.code === code
```

Если модуль не найден, возвращается `undefined`.

### Разделение core-платформы и модулей

В комментариях указано важное архитектурное правило: host platform не импортирует внутренности модулей напрямую. Доступ к модулям должен происходить через реестр и публичные SDK-контракты.

Это снижает связанность core-кода с конкретными модулями и позволяет подключать новые модули через единый интерфейс.

### Тарифные ограничения

В `ModuleManifestDef` есть поле:

```ts
requiresPlan?: string | null
```

Оно декларирует минимальный тарифный план, необходимый для использования модуля.

Из кода видно только наличие поля в manifest. Логика проверки тарифа, включения/отключения модуля для tenant или enforcement доступа в данном модуле не реализована.

### Конфигурация модуля

SDK поддерживает два уровня описания конфигурации:

1. `configSchema` — JSON Schema для описания per-instance config.
2. `configFields` — упрощённый список полей для автоматического рендера формы в dashboard.

Для публичного рендера модуль получает уже объединённую конфигурацию:

```ts
config: Record<string, unknown>
```

Комментарий указывает, что это результат merge tenant defaults и per-instruction override. Сам алгоритм объединения в данном коде не представлен.

## Зависимости

### Внутренние зависимости quar.io

- `~~/instruction-modules/warranty-registration`
- `~~/instruction-modules/chat-consultant`
- `~~/instruction-modules/faq`
- `~~/instruction-modules/feedback`

Эти модули должны default-export-ить объект, совместимый с `ModuleDefinition`.

Также из комментариев следует связь с:

- dashboard `/dashboard/modules` — для отображения `AdminComponent`;
- публичными страницами инструкций — для рендера `PublicComponent`;
- редактором инструкции и `module-ref` dropdown — для `EditorConfigComponent`;
- Prisma seed/boot — для синхронизации manifest с базой данных.

Реализация этих частей в представленном коде отсутствует.

### Внешние зависимости

- `vue`
  - используется тип `Component`:

```ts
import type { Component } from 'vue'
```

### Инфраструктурные зависимости

В данном модуле нет прямых импортов Prisma, PostgreSQL, S3/MinIO или Nitro API. Они упомянуты только на уровне общего контекста проекта и комментария о синхронизации manifest через Prisma seed.

## Примеры использования

### Поиск модуля по коду и загрузка публичного компонента

```ts
import { getModuleByCode } from '~/modules-sdk/registry'

const moduleDef = getModuleByCode('faq')

if (!moduleDef) {
  throw new Error('Module not found')
}

const componentModule = await moduleDef.PublicComponent()
const PublicModuleComponent = componentModule.default
```

### Пример минимального определения подключаемого модуля

```ts
import type { ModuleDefinition } from '~/modules-sdk/types'

const moduleDefinition: ModuleDefinition = {
  manifest: {
    code: 'example-module',
    name: 'Example Module',
    version: '1.0.0',
    requiresPlan: null,
    configSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' }
      }
    },
    configFields: [
      {
        key: 'title',
        label: 'Заголовок',
        type: 'string',
        required: true
      }
    ]
  },

  PublicComponent: () => import('./PublicComponent.vue')
}

export default moduleDefinition
```

Чтобы такой модуль стал доступен платформе, его нужно импортировать в `modules-sdk/registry.ts` и добавить в `moduleRegistry`.

## Замечания

- В коде присутствует комментарий о добавлении модуля через папку `modules/<code>/`, но фактические импорты идут из `~~/instruction-modules/...`. Это может быть следствием изменения структуры проекта или неполной актуализации комментария.
- `getModuleByCode` использует линейный поиск по массиву. Для текущего небольшого количества модулей это нормально, но при росте числа модулей может потребоваться индекс по `manifest.code`.
- SDK не валидирует уникальность `manifest.code`. Если два модуля будут иметь одинаковый code, `getModuleByCode` вернёт первый найденный.
- SDK только декларирует `requiresPlan`, но не содержит проверки тарифов.
- SDK только описывает `configSchema`, но не выполняет валидацию конфигурации.
- Контракты `AdminComponent` и `EditorConfigComponent` описаны минимально. Для `AdminComponent` не задан формальный интерфейс props/events.
- В представленном коде нет реализации синхронизации manifest с базой данных, хотя комментарий указывает, что она выполняется через Prisma seed на boot.

---
module: modules-sdk
section: shared
generated: 2026-05-08
files: 2
---