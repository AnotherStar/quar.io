# ManualOnline Wiki Generator

AI-генератор Markdown-документации для структуры ManualOnline.

## Запуск

```bash
# Из корня проекта
pnpm wiki:dry-run
pnpm wiki:generate
pnpm wiki:generate -- --section server
pnpm wiki:generate -- --module api-instructions
pnpm wiki:update -- api-instructions server

# Из этой папки
npm run dry-run
npm run generate -- --section modules
```

## Разделы

- `server` — `server/api`, `server/utils`, `server/middleware`, `server/routes`
- `client` — `pages`, `components`, `composables`, `layouts`, `middleware`, `plugins`, `assets/css`, `app.vue`
- `shared` — `shared/*`, `modules-sdk`
- `modules` — `instruction-modules/*`
- `data` — `prisma`

Ключи `OPENAI_API_KEY` или `ANTHROPIC_API_KEY` читаются из корневого `.env` или из `wiki-gen/.env`.
Для OpenAI также должен быть явно задан `OPENAI_BASE_URL`, например `https://api.openai.com/v1`.
