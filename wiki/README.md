# ManualOnline Wiki — Индекс

> Автоматически сгенерировано: 2026-05-08

Документация по основным зонам Nuxt 3 fullstack SaaS для интерактивных инструкций к товарам.

## Server API и Nitro

- ✅ [api-auth](./server/api-auth.md)
- ✅ [api-billing](./server/api-billing.md)
- ✅ [api-instructions](./server/api-instructions.md)
- ✅ [api-media](./server/api-media.md)
- ✅ [api-modules](./server/api-modules.md)
- ✅ [api-public](./server/api-public.md)
- ✅ [api-sections](./server/api-sections.md)
- ✅ [server-middleware](./server/server-middleware.md)
- ✅ [server-routes](./server/server-routes.md)
- ✅ [server-utils](./server/server-utils.md)

## Frontend Nuxt/Vue

- ✅ [app-shell](./client/app-shell.md)
- ✅ [client-middleware](./client/client-middleware.md)
- ✅ [components-editor](./client/components-editor.md)
- ✅ [components-public](./client/components-public.md)
- ✅ [components-ui](./client/components-ui.md)
- ✅ [composables](./client/composables.md)
- ✅ [layouts](./client/layouts.md)
- ✅ [page-auth](./client/page-auth.md)
- ✅ [page-dashboard](./client/page-dashboard.md)
- ✅ [page-investors](./client/page-investors.md)
- ✅ [page-landing](./client/page-landing.md)
- ✅ [page-pricing](./client/page-pricing.md)
- ✅ [page-public-instruction](./client/page-public-instruction.md)
- ✅ [page-short-url](./client/page-short-url.md)
- ✅ [plugins](./client/plugins.md)
- ✅ [styles](./client/styles.md)

## Shared-контракты

- ✅ [modules-sdk](./shared/modules-sdk.md)
- ✅ [shared-schemas](./shared/shared-schemas.md)
- ✅ [shared-types](./shared/shared-types.md)

## Instruction Modules

- ✅ [chat-consultant](./modules/chat-consultant.md)
- ✅ [faq](./modules/faq.md)
- ✅ [feedback](./modules/feedback.md)
- ✅ [warranty-registration](./modules/warranty-registration.md)

## Данные и Prisma

- ✅ [prisma](./data/prisma.md)

---

## Как обновить wiki

```bash
# Все модули из корня проекта
pnpm wiki:generate

# Один модуль
pnpm wiki:generate -- --module api-instructions

# Только серверная часть
pnpm wiki:generate -- --section server

# Быстрая проверка списка модулей
pnpm wiki:dry-run
```