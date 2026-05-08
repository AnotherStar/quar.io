# prisma

## Назначение

Модуль `prisma` описывает модель данных ManualOnline и базовые seed-данные для запуска SaaS-платформы. Он определяет PostgreSQL-схему для пользователей, tenants, инструкций, версионирования, модулей, аналитики, медиа и подписок, а также заполняет справочники тарифов и доступных модулей.

## Ключевые возможности

- Описание полной Prisma-схемы приложения для PostgreSQL.
- Мультитенантная модель данных: `Tenant`, участники, роли, подписки, брендирование.
- Аутентификация и сессии: пользователи, сессии, magic links.
- Тарифные планы с feature flags в JSON.
- Инструкции с черновиками, публикацией, immutable-версиями и workflow ревью.
- Reusable sections — переиспользуемые секции инструкций.
- Расширяемые instruction modules через реестр `ModuleManifest`.
- Tenant-level и instruction-level конфигурации модулей.
- Аналитика просмотров и событий по блокам инструкции.
- Feedback на уровне блоков.
- Хранение метаданных медиафайлов, загружаемых в S3/MinIO.
- Scaffold для API-ключей.
- Seed-данные для тарифов `free`, `plus`, `business`.
- Seed-данные для модулей:
  - `warranty-registration`
  - `chat-consultant`
  - `faq`
  - `feedback`

## Архитектура

Модуль состоит из двух файлов:

```text
prisma/
├── schema.prisma
└── seed.ts
```

### `prisma/schema.prisma`

Файл содержит Prisma schema для генерации Prisma Client и описания структуры PostgreSQL.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Схема подключается к PostgreSQL через переменную окружения `DATABASE_URL`.

Основные доменные области схемы:

### Auth

Модели:

- `User`
- `Session`
- `MagicLink`

`User` хранит базовую информацию о пользователе: email, хеш пароля, имя, аватар, дату подтверждения email.  
`Session` хранит серверные сессии пользователя.  
`MagicLink` предназначен для входа по одноразовой ссылке через `tokenHash`.

Связи:

- `User.sessions` → `Session[]`
- `User.magicLinks` → `MagicLink[]`
- удаление пользователя каскадно удаляет его сессии и magic links.

### Tenant и multi-user модель

Модели:

- `Tenant`
- `Membership`
- enum `Role`

`Tenant` — ключевая сущность для мультитенантности. Один tenant соответствует продавцу, бренду или организации.

В `Tenant` хранятся:

- `slug` для публичных URL вида `manual.online/atvel/...`
- `customDomain` для будущей поддержки пользовательских доменов
- `embedAllowedOrigins` для embed-страниц
- поля брендирования:
  - `brandingPrimaryColor`
  - `brandingLogoUrl`
  - `brandingFontFamily`

`Membership` связывает пользователей с tenants и задаёт роль пользователя.

Доступные роли:

```prisma
enum Role {
  OWNER
  EDITOR
  VIEWER
}
```

Ограничения:

- один пользователь может иметь только одно membership-соответствие на tenant:

```prisma
@@unique([userId, tenantId])
```

### Plans, Subscription и feature flags

Модели:

- `Plan`
- `Subscription`

`Plan` хранит тарифные планы в базе данных, а не в коде. Это позволяет добавлять или менять тарифы без миграций схемы.

Ключевое поле:

```prisma
features Json
```

В `features` хранится JSON с возможностями тарифа, например:

- максимальное количество инструкций
- доступность кастомных секций
- доступные модули
- поддержка custom domain
- retention аналитики
- количество участников команды
- approval workflow

`Subscription` связывает tenant с тарифом.

Важные поля:

- `tenantId` — уникальный, один tenant имеет одну подписку
- `planId`
- `status`
- `currentPeriodEnd`
- `trialUsedAt`
- `externalRef`

Статус подписки хранится строкой:

```prisma
status String @default("active")
```

В комментарии указаны ожидаемые значения:

- `active`
- `past_due`
- `canceled`
- `trialing`

### Product Groups

Модель:

- `ProductGroup`

`ProductGroup` группирует инструкции одного продукта, например инструкции на разных языках.

Поля:

- `tenantId`
- `name`
- `externalSku`

Связь:

- `ProductGroup.instructions` → `Instruction[]`

При удалении tenant группы продуктов удаляются каскадно.

### Instructions, Versioning и Approval Workflow

Модели:

- `Instruction`
- `InstructionVersion`
- `ReviewRequest`

Enums:

- `InstructionStatus`
- `ReviewStatus`

#### `Instruction`

`Instruction` — основная модель инструкции.

Ключевые поля:

- `shortId` — fallback URL для публичного доступа `/s/<shortId>`
- `tenantId`
- `productGroupId`
- `slug`
- `title`
- `description`
- `language`
- `status`
- `draftContent`
- `publishedVersionId`
- `publishedAt`
- `archivedAt`

Статусы инструкции:

```prisma
enum InstructionStatus {
  DRAFT
  IN_REVIEW
  PUBLISHED
  ARCHIVED
}
```

Черновой контент хранится в JSON:

```prisma
draftContent Json @default("{\"type\":\"doc\",\"content\":[]}")
```

По комментарию в схеме это mutable TipTap-документ. При публикации он должен превращаться в immutable snapshot в `InstructionVersion`.

Ограничения:

```prisma
@@unique([tenantId, slug])
@@index([tenantId, status])
@@index([productGroupId])
```

То есть `slug` уникален в рамках tenant, но не глобально.

#### `InstructionVersion`

`InstructionVersion` — неизменяемый снимок инструкции.

Используется для:

- фиксации опубликованного состояния инструкции;
- compliance-сценариев;
- ответа на вопрос, какая версия инструкции была активна в момент продажи товара.

Важные поля:

- `instructionId`
- `versionNumber`
- `content`
- `changelog`
- `createdById`

Ограничение:

```prisma
@@unique([instructionId, versionNumber])
```

Номер версии монотонный в рамках одной инструкции.

`Instruction.publishedVersionId` указывает на текущую опубликованную immutable-версию.

#### `ReviewRequest`

`ReviewRequest` описывает approval workflow: редактор отправляет инструкцию на проверку, владелец проверяет и публикует или отклоняет.

Статусы ревью:

```prisma
enum ReviewStatus {
  PENDING
  APPROVED
  REJECTED
}
```

Ключевые поля:

- `requestedById`
- `reviewedById`
- `status`
- `message`
- `reviewNote`
- `reviewedAt`

### Reusable Sections

Модели:

- `Section`
- `InstructionSectionAttachment`

`Section` — переиспользуемый фрагмент TipTap-контента внутри tenant.

Поля:

- `name`
- `description`
- `content`

`InstructionSectionAttachment` связывает секцию с инструкцией и задаёт место отображения.

Поля:

- `instructionId`
- `sectionId`
- `position`
- `slot`

`slot` по умолчанию:

```prisma
slot String @default("after")
```

В комментарии указаны возможные варианты:

- `before`
- `after`
- `sidebar`

Ограничение:

```prisma
@@unique([instructionId, sectionId])
```

Одна и та же секция может быть прикреплена к инструкции только один раз.

### Modules

Модели:

- `ModuleManifest`
- `TenantModuleConfig`
- `InstructionModuleAttachment`

Эта часть схемы реализует расширяемую plugin-систему ManualOnline.

#### `ModuleManifest`

`ModuleManifest` — реестр доступных модулей.

Поля:

- `code`
- `name`
- `description`
- `version`
- `configSchema`
- `requiresPlan`
- `isActive`

`configSchema` — JSON Schema конфигурации модуля.

`requiresPlan` задаёт минимальный тариф, необходимый для использования модуля. В seed-данных используются значения:

- `free`
- `plus`
- `business`

#### `TenantModuleConfig`

`TenantModuleConfig` включает модуль для конкретного tenant и хранит tenant-level конфигурацию.

Поля:

- `tenantId`
- `moduleId`
- `enabled`
- `config`

Ограничение:

```prisma
@@unique([tenantId, moduleId])
```

Один модуль может иметь только одну tenant-level конфигурацию в рамках tenant.

#### `InstructionModuleAttachment`

`InstructionModuleAttachment` прикрепляет включённый tenant-модуль к конкретной инструкции.

Поля:

- `instructionId`
- `tenantModuleConfigId`
- `position`
- `slot`
- `configOverride`

`configOverride` позволяет переопределить конфигурацию модуля на уровне инструкции.

Ограничение:

```prisma
@@unique([instructionId, tenantModuleConfigId])
```

Один и тот же tenant-модуль нельзя прикрепить к инструкции несколько раз.

### Analytics

Модель:

- `ViewEvent`

Enum:

- `ViewEventType`

События аналитики:

```prisma
enum ViewEventType {
  PAGE_VIEW
  PAGE_LEAVE
  BLOCK_VIEW
  BLOCK_DWELL
}
```

`ViewEvent` хранит granular analytics events:

- просмотр страницы;
- уход со страницы;
- попадание блока в viewport;
- dwell time блока.

В модели также предусмотрены поля для device и geo-информации:

- `country`
- `region`
- `city`
- `deviceType`
- `os`
- `browser`
- `referrer`
- `language`

Индексы:

```prisma
@@index([instructionId, createdAt])
@@index([instructionId, type])
@@index([sessionId])
```

Судя по комментариям, агрегация должна выполняться server-side через cron, но соответствующий код в предоставленном фрагменте отсутствует.

### Block-level feedback

Модель:

- `BlockFeedback`

Enum:

- `FeedbackKind`

Типы feedback:

```prisma
enum FeedbackKind {
  HELPFUL
  CONFUSING
  INCORRECT
  COMMENT
}
```

Feedback привязан к:

- инструкции;
- версии инструкции, опционально;
- конкретному TipTap block id;
- anonymous viewer session.

Индексы:

```prisma
@@index([instructionId, blockId])
@@index([instructionId, kind])
```

### Sample module data

Для демонстрационных модулей в общей схеме присутствуют отдельные таблицы данных:

- `WarrantyRegistration`
- `FeedbackSubmission`

#### `WarrantyRegistration`

Хранит заявки на регистрацию гарантии:

- имя клиента;
- email;
- телефон;
- серийный номер;
- дату покупки;
- произвольные metadata.

#### `FeedbackSubmission`

Хранит отправки формы обратной связи:

- ФИО;
- телефон;
- email;
- telegram;
- сообщение;
- metadata.

В комментарии отмечено, что данные модулей в идеале должны жить внутри package конкретного модуля, но сейчас находятся в общей Prisma-схеме как sample module data.

### Media assets

Модель:

- `MediaAsset`

`MediaAsset` хранит метаданные файлов, размещённых в S3-compatible storage.

Поля:

- `tenantId`
- `key`
- `url`
- `mimeType`
- `sizeBytes`
- `width`
- `height`
- `durationMs`
- `uploadedById`

`key` уникален глобально:

```prisma
key String @unique
```

### API keys

Модель:

- `ApiKey`

Это scaffold для будущей функциональности API-ключей.

Поля:

- `tenantId`
- `name`
- `keyHash`
- `prefix`
- `scopes`
- `lastUsedAt`
- `expiresAt`
- `revokedAt`

`keyHash` уникален:

```prisma
keyHash String @unique
```

Открытый ключ не хранится, сохраняется только хеш и префикс для отображения.

### `prisma/seed.ts`

Seed-скрипт создаёт или обновляет базовые справочные данные:

1. Тарифные планы.
2. Реестр модулей.

Используется `PrismaClient`:

```ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
```

Основная функция:

```ts
async function main() {
  // ...
}
```

В конце соединение закрывается:

```ts
.finally(async () => {
  await prisma.$disconnect()
})
```

Seed-операции реализованы через `upsert`, поэтому скрипт можно запускать повторно без создания дублей.

## API / Интерфейс

В предоставленном коде нет Nitro route-файлов, Vue-компонентов, composables или SDK-интерфейсов. Публичный интерфейс модуля — это Prisma schema и seed-скрипт.

### Prisma Client

После генерации Prisma Client код приложения может работать с моделями через стандартный интерфейс Prisma:

```ts
prisma.user
prisma.tenant
prisma.instruction
prisma.instructionVersion
prisma.plan
prisma.subscription
prisma.moduleManifest
prisma.tenantModuleConfig
prisma.instructionModuleAttachment
```

### Основные модели Prisma

| Модель | Назначение |
|---|---|
| `User` | Пользователь системы |
| `Session` | Сессия пользователя |
| `MagicLink` | Одноразовая ссылка для входа |
| `Tenant` | Организация/продавец/бренд |
| `Membership` | Связь пользователя и tenant с ролью |
| `Plan` | Тарифный план |
| `Subscription` | Подписка tenant на тариф |
| `ProductGroup` | Группа инструкций одного продукта |
| `Instruction` | Инструкция |
| `InstructionVersion` | Immutable-версия инструкции |
| `ReviewRequest` | Запрос на ревью |
| `Section` | Переиспользуемая секция |
| `InstructionSectionAttachment` | Привязка секции к инструкции |
| `ModuleManifest` | Реестр доступных модулей |
| `TenantModuleConfig` | Настройка модуля на уровне tenant |
| `InstructionModuleAttachment` | Привязка модуля к инструкции |
| `ViewEvent` | Событие аналитики |
| `BlockFeedback` | Feedback по блоку инструкции |
| `WarrantyRegistration` | Данные модуля регистрации гарантии |
| `FeedbackSubmission` | Данные модуля обратной связи |
| `MediaAsset` | Метаданные медиафайла |
| `ApiKey` | API-ключ tenant |

### Seed-интерфейс

Seed-скрипт ожидает доступную переменную окружения:

```env
DATABASE_URL=postgresql://...
```

Скрипт заполняет таблицы:

- `Plan`
- `ModuleManifest`

Используемые операции:

```ts
await prisma.plan.upsert(...)
await prisma.moduleManifest.upsert(...)
```

## Бизнес-логика

### Мультитенантность

Большинство бизнес-сущностей привязаны к `Tenant`:

- инструкции;
- секции;
- конфигурации модулей;
- API-ключи;
- медиа;
- группы продуктов;
- подписка.

При удалении tenant связанные сущности в большинстве случаев удаляются каскадно через `onDelete: Cascade`.

### Роли пользователей

Поддерживаются три роли:

- `OWNER`
- `EDITOR`
- `VIEWER`

Роль хранится в `Membership`. По умолчанию создаётся роль `OWNER`:

```prisma
role Role @default(OWNER)
```

### Тарифные ограничения

Тарифные возможности хранятся в JSON-поле `Plan.features`.

Seed создаёт три плана.

#### Free

```ts
{
  maxInstructions: 5,
  customSections: false,
  modules: ['faq', 'feedback'],
  customDomain: false,
  analyticsRetentionDays: 30,
  teamMembers: 1,
  approvalWorkflow: false
}
```

#### Plus

```ts
{
  maxInstructions: 50,
  customSections: true,
  modules: ['warranty-registration', 'faq', 'feedback'],
  customDomain: false,
  analyticsRetentionDays: 365,
  teamMembers: 3,
  approvalWorkflow: true
}
```

#### Business

```ts
{
  maxInstructions: -1,
  customSections: true,
  modules: ['warranty-registration', 'chat-consultant', 'faq', 'feedback'],
  customDomain: true,
  analyticsRetentionDays: -1,
  teamMembers: 25,
  approvalWorkflow: true
}
```

Видимое правило из seed-данных:

- `-1` используется как значение «без ограничения» для `maxInstructions` и `analyticsRetentionDays`.

Важно: сама проверка лимитов в предоставленном коде не реализована. Схема только хранит данные, которые должны использоваться runtime gating-логикой приложения.

### Публикация инструкций

Схема предусматривает модель публикации:

1. Черновой контент хранится в `Instruction.draftContent`.
2. При публикации или явном сохранении версии должен создаваться `InstructionVersion`.
3. Текущая опубликованная версия указывается в `Instruction.publishedVersionId`.
4. Публичный рендер может быстро получить immutable snapshot через связь `publishedVersion`.

В коде схемы есть необходимые поля и связи, но сам алгоритм публикации в предоставленных файлах отсутствует.

### Версионирование

Для каждой инструкции номер версии уникален:

```prisma
@@unique([instructionId, versionNumber])
```

Это означает, что прикладной код должен обеспечивать монотонное увеличение `versionNumber` в рамках одной инструкции.

### Approval workflow

Схема поддерживает сценарий:

```text
EDITOR → ReviewRequest → OWNER review → approve/reject → publish
```

Но в предоставленном модуле реализованы только структуры данных:

- `ReviewRequest`
- `ReviewStatus`
- связи с `Instruction`

Проверки ролей и переходы статусов должны находиться в других слоях приложения.

### Slug и публичные URL

Для инструкции:

```prisma
@@unique([tenantId, slug])
```

Следовательно, один и тот же `slug` может существовать у разных tenants.

Дополнительно каждая инструкция имеет глобальный `shortId`:

```prisma
shortId String @unique @default(cuid())
```

Комментарий указывает fallback URL:

```text
/s/<shortId>
```

### Модули

Модульная система разделена на три уровня:

1. `ModuleManifest` — глобальный реестр доступных модулей.
2. `TenantModuleConfig` — включение и базовая настройка для tenant.
3. `InstructionModuleAttachment` — подключение модуля к конкретной инструкции с override-конфигурацией.

Seed создаёт четыре module manifests.

#### `warranty-registration`

- Название: `Регистрация расширенной гарантии`
- Минимальный тариф: `plus`
- Назначение: форма регистрации расширенной гарантии.

Конфигурация:

- `warrantyMonths`
- `requirePhone`
- `requireSerial`
- `successMessage`

#### `chat-consultant`

- Название: `Чат с консультантом`
- Минимальный тариф: `business`
- Назначение: кнопка чата на странице инструкции.

Конфигурация:

- `provider`
- `siteId`

#### `faq`

- Название: `Вопрос — Ответ (FAQ)`
- Минимальный тариф: `free`
- Назначение: аккордеон вопросов и ответов.

Конфигурация:

- `title`
- `expandedByDefault`
- `items`

#### `feedback`

- Название: `Обратная связь`
- Минимальный тариф: `free`
- Назначение: форма обратной связи.

Конфигурация:

- `title`
- `description`
- `recipientEmail`
- `requireFio`
- `requirePhone`
- `requireEmail`
- `requireTelegram`
- `requireMessage`
- `successMessage`

### Аналитика

Схема хранит granular events для будущих сценариев:

- heatmaps;
- A/B;
- server-side aggregation via cron.

Видимые события:

- `PAGE_VIEW`
- `PAGE_LEAVE`
- `BLOCK_VIEW`
- `BLOCK_DWELL`

Для `PAGE_LEAVE` предусмотрены:

- `durationMs`
- `scrollDepth`

Для block-level событий:

- `blockId`
- `durationMs`

### Медиа

`MediaAsset` хранит только метаданные файлов. Сам файл находится во внешнем S3-compatible storage.

Глобальная уникальность S3 object key обеспечивается на уровне БД:

```prisma
key String @unique
```

## Зависимости

### Внешние зависимости

- `@prisma/client` — Prisma Client для доступа к базе данных.
- PostgreSQL — основная база данных.
- Переменная окружения `DATABASE_URL`.
- S3/MinIO — внешний storage для медиафайлов, отражённый в модели `MediaAsset`.

### Внутренние доменные зависимости ManualOnline

Схема является нижним уровнем для следующих частей приложения:

- авторизация и управление сессиями;
- dashboard продавца;
- публичные страницы инструкций;
- TipTap-редактор;
- reusable sections;
- pluggable instruction modules;
- аналитика просмотров;
- сбор feedback;
- управление тарифами и подписками;
- хранение медиа;
- будущий API-доступ через API keys.

## Примеры использования

### Повторный запуск seed

Seed-скрипт безопасен для повторного запуска, так как использует `upsert`.

Пример операции из `seed.ts`:

```ts
await prisma.plan.upsert({
  where: { code: plan.code },
  update: { ...plan, features: plan.features as object },
  create: { ...plan, features: plan.features as object }
})
```

Если тариф уже существует, он будет обновлён. Если отсутствует — создан.

### Получение опубликованной версии инструкции

Пример запроса через Prisma Client:

```ts
const instruction = await prisma.instruction.findUnique({
  where: {
    tenantId_slug: {
      tenantId,
      slug
    }
  },
  include: {
    publishedVersion: true,
    moduleAttachments: {
      include: {
        tenantModuleConfig: {
          include: {
            module: true
          }
        }
      }
    },
    sectionAttachments: {
      include: {
        section: true
      },
      orderBy: {
        position: 'asc'
      }
    }
  }
})
```

Такой запрос соответствует ст��уктуре схемы: инструкция загружается вместе с опубликованной immutable-версией, подключёнными модулями и reusable sections.

### Создание версии инструкции при публикации

Пример прикладной логики, которую схема поддерживает:

```ts
const latestVersion = await prisma.instructionVersion.findFirst({
  where: { instructionId },
  orderBy: { versionNumber: 'desc' }
})

const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1

const version = await prisma.instructionVersion.create({
  data: {
    instructionId,
    versionNumber: nextVersionNumber,
    content: draftContent,
    changelog,
    createdById: userId
  }
})

await prisma.instruction.update({
  where: { id: instructionId },
  data: {
    status: 'PUBLISHED',
    publishedVersionId: version.id,
    publishedAt: new Date()
  }
})
```

Важно: этот алгоритм не находится в предоставленном коде, но напрямую следует из структуры моделей `Instruction` и `InstructionVersion`.

## Замечания

- В предоставленном модуле нет API-роутов, UI-компонентов, composables или сервисных функций. Реализованы только Prisma-схема и seed-скрипт.
- Тарифные ограничения описаны в `Plan.features`, но enforcement-логика в этом коде отсутствует.
- Статус подписки хранится строкой, а не enum. Это гибко, но повышает риск неконсистентных значений.
- Поле `requiresPlan` в `ModuleManifest` также хранится строкой, а не связью с `Plan.code`.
- Возможные значения `slot` для секций и модулей указаны только в комментариях, но не ограничены enum на уровне Prisma.
- Модульные данные `WarrantyRegistration` и `FeedbackSubmission` находятся в общей Prisma-схеме. В комментарии явно указано, что в идеале данные модуля должны жить в package самого модуля.
- `createdById`, `reviewedById`, `uploadedById` хранятся как строки без явных relation-связей с `User`.
- Для `InstructionVersion.versionNumber` требуется прикладная логика монотонного увеличения; база данных гарантирует только уникальность пары `instructionId + versionNumber`.
- Analytics aggregation через cron упомянута в комментариях, но реализация в предоставленном коде отсутствует.
- Для custom domains, API keys, embed origins и части backlog-функций в схеме есть scaffold, но прикладная реализация не представлена.

---
module: prisma
section: data
generated: 2026-05-08
files: 2
---