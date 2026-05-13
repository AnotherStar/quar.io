# TODO — Backlog

Features deferred from MVP. Architecture is prepared for them — keep that contract intact when picking up.

## In MVP (do not duplicate here)
- Аналитика инструкции (просмотры, гео, девайс, скролл, время) — feature #1
- Block-level feedback widget — feature #3
- Поиск внутри инструкции — feature #8
- Approval workflow (draft → review → published) — feature #14
- Спец-блок "Безопасность/предупреждение" в WYSIWYG — feature #16

---

## Backlog

### Data-driven
- [ ] **Тепловые карты по блокам** — feature #2. Расширение existing analytics. Хранить block-level dwell + scroll-into-view events. Агрегатор → визуал на блоках в дашборде.
- [ ] **A/B тестирование версий инструкции** — feature #4. Использовать existing `InstructionVersion`, добавить `Experiment` модель, splitter в публичном рендере по cookie.

### Снижение нагрузки на саппорт
- [ ] **AI-ассистент по инструкции** — feature #5. Эмбеддинги по блокам в pgvector, RAG, embed-чат-виджет. Включается per-instruction, требует платный тариф.
- [ ] **Step-by-step режим** — feature #6. Тоггл на публичной странице, не требует изменения схемы — просто другой компонент-рендерер (`StepByStepRenderer.vue`) поверх тех же блоков.
- [ ] **TTS / "слушать инструкцию"** — feature #7. Web Speech API на клиенте для базового, опциональная серверная генерация (ElevenLabs/OpenAI) для платного.

### Мультиязычность
- [ ] **Мультиязычные версии** — feature #9. В схеме уже есть `Instruction.language` и `Instruction.productGroupId` (связь языковых вариантов). Нужно UI для переключения и связывания.
- [ ] **Авто-определение языка + редирект** — feature #10. Middleware на публичной странице по `Accept-Language`.
- [ ] **PDF-экспорт** — feature #11. Server-side render через Playwright/Puppeteer → PDF. Кешировать по `instructionVersionId`.
- [ ] **PWA / офлайн** — feature #12. Nuxt PWA модуль, service worker кеширует посещённые инструкции.

### Доверие / compliance
- [ ] **Уведомления при апдейте** — feature #15. Требует email-инфраструктуры (Resend/SES). Триггер: на `Instruction.publish` для пользователей с зарегистрированной гарантией через модуль.

### Экосистема
- [ ] **Кастомные домены** — feature #17. В схеме есть `Tenant.customDomain`. Нужны: SSL (Caddy on-demand TLS или Cloudflare for SaaS), DNS-проверка, middleware-резолвер.
- [ ] **Брендирование** — feature #18. Поля `Tenant.brandingPrimaryColor`, `brandingLogoUrl`, `brandingFontFamily`. Применять CSS-vars override на публичной странице.
- [ ] **Embed-виджет (iframe)** — feature #19. Отдельный route `/embed/:tenantSlug/:instructionSlug` без шапки/футера, X-Frame-Options whitelist через `Tenant.embedAllowedOrigins`.
- [ ] **Публичный API + webhooks** — feature #20. API-ключи на уровне tenant, OpenAPI-спека, webhook delivery с retry (BullMQ).
- [ ] **Bulk-импорт CSV/JSON** — feature #21. Дашборд-страница, парсер, dry-run preview, batch-create.
- [ ] **Шаблоны инструкций** — feature #22. Системные `Instruction` с флагом `isTemplate`, диалог "create from template".

### Дифференцирующее
- [ ] **AI-генерация черновика** — feature #23. Загрузка PDF/изображений → vision-LLM → структурированный JSON блоков → импорт в редактор.
- [ ] **AI-прувридинг** — feature #24. Кнопка в редакторе, LLM-проход по блокам с suggestions diff-style.
- [ ] **Условный контент / branching** — feature #25. Новый тип блока `Branch` с условиями + UI-выбор пути на публичной странице.
- [ ] **Видео с главами** — feature #26. Расширение video-блока: массив `chapters: {time, label, blockId}`. Текстовые блоки могут ссылаться на таймкод.
- [ ] **QR-генератор внутри платформы** — feature #27. Страница в дашборде. Библиотека `qr-code-styling`. Готовый PDF/SVG/PNG для печати.
- [ ] **Предупреждение об устаревшей версии** — feature #28. Параметр `?v=<versionId>` в QR; если current.version != param → баннер "доступна новая версия".

### Командная работа
- [ ] **Multi-user внутри tenant** — feature #29. В схеме есть `Membership` + роли. Нужны UI: страница "team", приглашения по email, role-management.

---

## Технические TODO

- [ ] BullMQ + Redis для фоновых задач (аналитика-агрегаты, email, webhooks, AI)
- [ ] Rate limiting на публичных эндпоинтах (analytics ingest, feedback)
- [ ] CDN для медиа (CloudFront/Bunny перед MinIO/S3)
- [ ] **S3 storage cleanup (orphaned objects)** — данные уже копятся: при AI-генерации из PDF браузер аплоадит ВСЕ извлечённые превью в S3, юзер потом использует малую часть; при image-edit старая версия остаётся. Срочности нет, ключи уже tenant-префиксованы (`${tenantId}/${shortId}.${ext}`), поэтому почистить можно в любой момент. План: (1) добавить `deleteObject(key)` и `listTenantObjects(tenantId)` в [server/utils/storage.ts](server/utils/storage.ts); (2) `findOrphanedKeys(tenantId)` = `ListObjectsV2(Prefix='{tenantId}/')` минус ссылки из `Instruction.draftContent` + всех `InstructionVersion.content` + `Section.content` + `Tenant.brandingLogoUrl` + `PrintBatch.pdfStorageKey`; (3) endpoint `/api/admin/storage-cleanup` с dry-run по умолчанию; (4) опционально cron. Защита: не трогать объекты моложе 1 часа (могут быть в процессе аплоада до save). `MediaAsset` оставить как audit log, не как источник правды для cleanup.
- [ ] Backup-стратегия PostgreSQL
- [ ] Sentry / OpenTelemetry
- [ ] e2e тесты (Playwright) на критических сценариях: регистрация → создание инструкции → публикация → публичный просмотр
- [ ] CI: lint + typecheck + prisma migrate diff
- [ ] Migration tooling для seed данных (системные шаблоны, demo tenant)
