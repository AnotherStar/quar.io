#!/usr/bin/env ts-node
/**
 * ManualOnline Wiki Generator
 *
 * Обходит смысловые зоны Nuxt 3 fullstack-проекта и генерирует Markdown-статьи
 * через LLM API. Поддерживает OpenAI и Anthropic — выбор по наличию ключа в .env.
 *
 * Запуск из корня: pnpm wiki:generate -- [опции]
 * Запуск из wiki-gen: npm run generate -- [опции]
 *
 * Опции:
 *   --module <name>       Сгенерировать только один модуль
 *   --section <name>      Только раздел: server | client | shared | modules | data
 *   --force               Перегенерировать даже если файл уже существует
 *   --dry-run             Показать план без генерации
 *   --provider openai     Принудительно использовать OpenAI
 *   --provider anthropic  Принудительно использовать Anthropic
 */

import fs from 'fs';
import path from 'path';
import https from 'https';

// Подгружаем .env: сначала корневой, потом wiki-gen/.env.
const envPaths = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '.env'),
];
for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
        if (!match) continue;

        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = value;
    }
}

// ─── Конфигурация ────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const WIKI_DIR = path.join(ROOT, 'wiki');
const MAX_FILE_SIZE = 40_000; // символов, обрезаем большие файлы
const MAX_CONTEXT_SIZE = 120_000; // суммарно на модуль
const MAX_FILES_PER_MODULE = 30;

const WIKI_GENERATOR_OPENAI_ID = 'gpt-5.5';
const WIKI_GENERATOR_ANTHROPIC_ID = 'claude-opus-4-5';

type WikiSection = 'server' | 'client' | 'shared' | 'modules' | 'data';

interface ModuleTarget {
    section: WikiSection;
    name: string;
    sourcePath: string;
    outputFile: string;
    description?: string;
}

function getModel(provider: 'openai' | 'anthropic'): string {
    if (provider === 'openai') {
        return WIKI_GENERATOR_OPENAI_ID;
    }
    return WIKI_GENERATOR_ANTHROPIC_ID;
}

// ─── Расширения файлов для анализа ───────────────────────────────────────────

const CODE_EXTENSIONS = new Set([
    '.ts', '.tsx', '.vue', '.js', '.mts', '.mjs', '.css', '.prisma', '.md',
]);

const IGNORE_DIRS = new Set([
    'node_modules', 'dist', 'build', '.git', '__pycache__', '.nuxt', '.output',
    'coverage', '.cache',
]);

const IGNORE_FILES = new Set([
    'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'tsconfig.tsbuildinfo',
]);

// ─── Сбор модулей ────────────────────────────────────────────────────────────

function target(
    section: WikiSection,
    name: string,
    sourcePath: string,
    description?: string,
): ModuleTarget {
    return {
        section,
        name,
        sourcePath,
        outputFile: path.join(WIKI_DIR, section, `${name}.md`),
        description,
    };
}

function listExistingChildren(dir: string): fs.Dirent[] {
    if (!fs.existsSync(dir)) return [];

    return fs.readdirSync(dir, { withFileTypes: true })
        .filter(entry => !entry.name.startsWith('.') && !IGNORE_DIRS.has(entry.name))
        .sort((a, b) => a.name.localeCompare(b.name));
}

function basenameWithoutExt(fileName: string): string {
    return fileName.replace(/\.(vue|ts|tsx|js|mts|mjs|css|prisma|md)$/i, '');
}

function normalizeName(value: string): string {
    return value
        .replace(/^\[(.+)]$/, '$1')
        .replace(/\[([^\]]+)]/g, '$1')
        .replace(/[^a-zA-Z0-9а-яА-Я_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

function collectServerModules(): ModuleTarget[] {
    const modules: ModuleTarget[] = [];

    const apiDir = path.join(ROOT, 'server', 'api');
    for (const entry of listExistingChildren(apiDir)) {
        if (!entry.isDirectory()) continue;

        modules.push(target(
            'server',
            `api-${normalizeName(entry.name)}`,
            path.join(apiDir, entry.name),
            `Nitro API routes for ${entry.name}`,
        ));
    }

    const utilityGroups = [
        ['server-utils', path.join(ROOT, 'server', 'utils'), 'Server-side helpers: auth, tenancy, storage, plans and generation'],
        ['server-middleware', path.join(ROOT, 'server', 'middleware'), 'Nitro server middleware'],
        ['server-routes', path.join(ROOT, 'server', 'routes'), 'Custom Nitro server routes'],
    ] as const;

    for (const [name, sourcePath, description] of utilityGroups) {
        if (fs.existsSync(sourcePath)) modules.push(target('server', name, sourcePath, description));
    }

    return modules;
}

function collectClientModules(): ModuleTarget[] {
    const modules: ModuleTarget[] = [];

    const pageNames: Record<string, string> = {
        index: 'page-landing',
        pricing: 'page-pricing',
        investors: 'page-investors',
        error: 'page-error',
    };
    const pageDirectoryNames: Record<string, string> = {
        '[tenantSlug]': 'page-public-instruction',
        s: 'page-short-url',
    };

    const pagesDir = path.join(ROOT, 'pages');
    for (const entry of listExistingChildren(pagesDir)) {
        const fullPath = path.join(pagesDir, entry.name);

        if (entry.isDirectory()) {
            modules.push(target(
                'client',
                pageDirectoryNames[entry.name] ?? `page-${normalizeName(entry.name)}`,
                fullPath,
                `Nuxt pages under pages/${entry.name}`,
            ));
            continue;
        }

        if (entry.isFile() && path.extname(entry.name) === '.vue') {
            const baseName = basenameWithoutExt(entry.name);
            modules.push(target(
                'client',
                pageNames[baseName] ?? `page-${normalizeName(baseName)}`,
                fullPath,
                `Nuxt page ${entry.name}`,
            ));
        }
    }

    const componentsDir = path.join(ROOT, 'components');
    for (const entry of listExistingChildren(componentsDir)) {
        if (!entry.isDirectory()) continue;

        modules.push(target(
            'client',
            `components-${normalizeName(entry.name)}`,
            path.join(componentsDir, entry.name),
            `Vue components from components/${entry.name}`,
        ));
    }

    const clientGroups = [
        ['composables', path.join(ROOT, 'composables'), 'Vue/Nuxt composables'],
        ['layouts', path.join(ROOT, 'layouts'), 'Nuxt layouts'],
        ['client-middleware', path.join(ROOT, 'middleware'), 'Nuxt route middleware'],
        ['plugins', path.join(ROOT, 'plugins'), 'Nuxt plugins'],
        ['styles', path.join(ROOT, 'assets', 'css'), 'Global CSS and design tokens'],
        ['app-shell', path.join(ROOT, 'app.vue'), 'Root Nuxt application shell'],
    ] as const;

    for (const [name, sourcePath, description] of clientGroups) {
        if (fs.existsSync(sourcePath)) modules.push(target('client', name, sourcePath, description));
    }

    return modules;
}

function collectSharedModules(): ModuleTarget[] {
    const modules: ModuleTarget[] = [];

    const sharedDir = path.join(ROOT, 'shared');
    for (const entry of listExistingChildren(sharedDir)) {
        if (!entry.isDirectory()) continue;

        modules.push(target(
            'shared',
            `shared-${normalizeName(entry.name)}`,
            path.join(sharedDir, entry.name),
            `Shared ${entry.name} used by client and server`,
        ));
    }

    const modulesSdk = path.join(ROOT, 'modules-sdk');
    if (fs.existsSync(modulesSdk)) {
        modules.push(target(
            'shared',
            'modules-sdk',
            modulesSdk,
            'Contracts and registry for pluggable instruction modules',
        ));
    }

    return modules;
}

function collectInstructionModules(): ModuleTarget[] {
    const modulesDir = path.join(ROOT, 'instruction-modules');

    return listExistingChildren(modulesDir)
        .filter(entry => entry.isDirectory())
        .map(entry => target(
            'modules',
            normalizeName(entry.name),
            path.join(modulesDir, entry.name),
            `Pluggable instruction module ${entry.name}`,
        ));
}

function collectDataModules(): ModuleTarget[] {
    const modules: ModuleTarget[] = [];
    const prismaDir = path.join(ROOT, 'prisma');

    if (fs.existsSync(prismaDir)) {
        modules.push(target(
            'data',
            'prisma',
            prismaDir,
            'Database schema, seed data and persistence model',
        ));
    }

    return modules;
}

// ─── Чтение файлов модуля ────────────────────────────────────────────────────

interface FileContent {
    relativePath: string;
    content: string;
    truncated: boolean;
}

function readSourceFile(fullPath: string): FileContent | null {
    const fileName = path.basename(fullPath);
    if (IGNORE_FILES.has(fileName)) return null;

    const ext = path.extname(fileName);
    if (!CODE_EXTENSIONS.has(ext)) return null;

    try {
        const raw = fs.readFileSync(fullPath, 'utf-8');
        const truncated = raw.length > MAX_FILE_SIZE;
        const content = truncated ? `${raw.slice(0, MAX_FILE_SIZE)}\n... [обрезано]` : raw;

        return {
            relativePath: path.relative(ROOT, fullPath),
            content,
            truncated,
        };
    } catch {
        return null;
    }
}

function readModuleFiles(sourcePath: string): FileContent[] {
    const result: FileContent[] = [];
    if (!fs.existsSync(sourcePath)) return result;

    const stat = fs.statSync(sourcePath);
    if (stat.isFile()) {
        const file = readSourceFile(sourcePath);
        return file ? [file] : [];
    }

    function walk(currentDir: string): void {
        if (result.length >= MAX_FILES_PER_MODULE) return;

        let entries: fs.Dirent[];
        try {
            entries = fs.readdirSync(currentDir, { withFileTypes: true })
                .sort((a, b) => a.name.localeCompare(b.name));
        } catch {
            return;
        }

        for (const entry of entries) {
            if (result.length >= MAX_FILES_PER_MODULE) break;

            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                if (!IGNORE_DIRS.has(entry.name)) walk(fullPath);
                continue;
            }

            if (!entry.isFile()) continue;

            const file = readSourceFile(fullPath);
            if (file) result.push(file);
        }
    }

    walk(sourcePath);
    return result;
}

// ─── Абстракция LLM-провайдера ───────────────────────────────────────────────

type Provider = 'openai' | 'anthropic';

function detectProvider(forced?: string): Provider {
    if (forced === 'openai') return 'openai';
    if (forced === 'anthropic') return 'anthropic';
    // Автовыбор по наличию ключей
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    throw new Error(
        'Не задан ни OPENAI_API_KEY, ни ANTHROPIC_API_KEY.\n' +
        'Добавь один из них в корневой .env или wiki-gen/.env',
    );
}

function httpPost(
    hostname: string,
    requestPath: string,
    headers: Record<string, string>,
    body: unknown,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = https.request(
            { hostname, path: requestPath, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(data) } },
            res => {
                let raw = '';
                res.on('data', chunk => { raw += chunk; });
                res.on('end', () => resolve(raw));
            },
        );
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function callOpenAI(prompt: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY!;
    const body = {
        model: getModel('openai'),
        // max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
    };
    const raw = await httpPost('api.openai.com', '/v1/chat/completions', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    }, body);
    const parsed: {
        choices: Array<{ message: { content: string } }>;
        error?: { message: string };
    } = JSON.parse(raw);
    if (parsed.error) throw new Error(`OpenAI: ${parsed.error.message}`);
    return parsed.choices[0].message.content;
}

async function callAnthropic(prompt: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY!;
    const body = {
        model: getModel('anthropic'),
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
    };
    const raw = await httpPost('api.anthropic.com', '/v1/messages', {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
    }, body);
    const parsed: {
        content: Array<{ type: string; text: string }>;
        error?: { message: string };
    } = JSON.parse(raw);
    if (parsed.error) throw new Error(`Anthropic: ${parsed.error.message}`);
    const block = parsed.content.find(b => b.type === 'text');
    if (!block) throw new Error('Пустой ответ от Anthropic API');
    return block.text;
}

async function callLLM(prompt: string, provider: Provider): Promise<string> {
    if (provider === 'openai') return callOpenAI(prompt);
    return callAnthropic(prompt);
}

// ─── Генерация ────────────────────────────────────────────────────────────────

function buildPrompt(targetModule: ModuleTarget, files: FileContent[]): string {
    const sectionLabel: Record<WikiSection, string> = {
        server: 'Server API и Nitro-утилиты (Nuxt 3)',
        client: 'Frontend (Nuxt 3 / Vue 3)',
        shared: 'Общие схемы, типы и SDK-контракты',
        modules: 'Подключаемые модули инструкций',
        data: 'Prisma-модель данных и seed-данные',
    };

    const fileBlocks = files.map(f => {
        const truncNote = f.truncated ? ' *(файл обрезан)*' : '';
        const lang = path.extname(f.relativePath) === '.vue'
            ? 'vue'
            : path.extname(f.relativePath) === '.css'
                ? 'css'
                : path.extname(f.relativePath) === '.prisma'
                    ? 'prisma'
                    : 'typescript';

        return `### \`${f.relativePath}\`${truncNote}\n\`\`\`${lang}\n${f.content}\n\`\`\``;
    }).join('\n\n');

    const description = targetModule.description
        ? `\nКраткий контекст модуля: ${targetModule.description}\n`
        : '';

    return `Ты технический писатель для проекта ManualOnline. Это Nuxt 3 fullstack SaaS для создания, публикации и аналитики интерактивных инструкций к товарам: публичные страницы инструкций, дашборд продавца, TipTap-редактор, reusable sections, pluggable instruction modules, Prisma/PostgreSQL и S3/MinIO для медиа.

Твоя задача — сгенерировать wiki-статью на русском языке по модулю "${targetModule.name}" из раздела "${sectionLabel[targetModule.section]}".${description}

## Исходный код модуля

${fileBlocks}

## Требования к статье

Сгенерируй подробную wiki-статью в формате Markdown со следующей структурой:

1. **Заголовок** — название модуля (h1)
2. **Назначение** — 1-3 предложения: что делает модуль и какую роль играет в ManualOnline
3. **Ключевые возможности** — список основных функций, кратко и по делу
4. **Архитектура** — описание структуры файлов, компонентов, composables, API-роутов, схем или сервисных функций; как они взаимодействуют
5. **API / Интерфейс** — для Nitro route-файлов перечисли эндпоинты и HTTP-методы из имён файлов; для Vue-компонентов опиши props/events/slots; для zod-схем и SDK — основные контракты
6. **Бизнес-логика** — ключевые правила, проверки, алгоритмы, статусы, ограничения тарифов или сценарии публикации, если они видны в коде
7. **Зависимости** — от каких внутренних модулей ManualOnline и внешних сервисов зависит
8. **Примеры использования** — 1-2 коротких сценария или сниппета, если уместно
9. **Замечания** — технический долг, известные ограничения, TODO или риски, если они явно видны из кода

Требования к стилю:
- Пиши на русском языке
- Используй профессиональный технический стиль
- Пиши конкретно, на основе реального кода
- Не придумывай функциональность, которой нет в коде
- Если код обрезан или неполный — укажи это
- Не называй проект MSE, ERP или NestJS, если это не встречается в исходниках

В конце добавь блок метаданных:
\`\`\`
---
module: ${targetModule.name}
section: ${targetModule.section}
generated: ${new Date().toISOString().split('T')[0]}
files: ${files.length}
---
\`\`\``;
}

async function generateWikiPage(
    targetModule: ModuleTarget,
    files: FileContent[],
    provider: Provider,
): Promise<string> {
    const prompt = buildPrompt(targetModule, files);

    if (prompt.length > MAX_CONTEXT_SIZE) {
        console.warn(`  ⚠️  Контекст большой: ${prompt.length} символов`);
    }

    return callLLM(prompt, provider);
}

// ─── Генерация индексной страницы ────────────────────────────────────────────

function generateIndex(modules: ModuleTarget[]): string {
    const bySection = modules.reduce<Partial<Record<WikiSection, ModuleTarget[]>>>((acc, moduleTarget) => {
        if (!acc[moduleTarget.section]) acc[moduleTarget.section] = [];
        acc[moduleTarget.section]!.push(moduleTarget);
        return acc;
    }, {});

    const sectionTitles: Record<WikiSection, string> = {
        server: 'Server API и Nitro',
        client: 'Frontend Nuxt/Vue',
        shared: 'Shared-контракты',
        modules: 'Instruction Modules',
        data: 'Данные и Prisma',
    };

    const sectionOrder: WikiSection[] = ['server', 'client', 'shared', 'modules', 'data'];

    const lines = [
        '# ManualOnline Wiki — Индекс',
        '',
        `> Автоматически сгенерировано: ${new Date().toISOString().split('T')[0]}`,
        '',
        'Документация по основным зонам Nuxt 3 fullstack SaaS для интерактивных инструкций к товарам.',
        '',
    ];

    for (const section of sectionOrder) {
        const sectionModules = bySection[section];
        if (!sectionModules?.length) continue;

        lines.push(`## ${sectionTitles[section]}`);
        lines.push('');
        for (const moduleTarget of sectionModules.sort((a, b) => a.name.localeCompare(b.name))) {
            const relPath = path.relative(WIKI_DIR, moduleTarget.outputFile);
            const exists = fs.existsSync(moduleTarget.outputFile) ? '✅' : '⬜';
            lines.push(`- ${exists} [${moduleTarget.name}](./${relPath})`);
        }
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Как обновить wiki');
    lines.push('');
    lines.push('```bash');
    lines.push('# Все модули из корня проекта');
    lines.push('pnpm wiki:generate');
    lines.push('');
    lines.push('# Один модуль');
    lines.push('pnpm wiki:generate -- --module api-instructions');
    lines.push('');
    lines.push('# Только серверная часть');
    lines.push('pnpm wiki:generate -- --section server');
    lines.push('');
    lines.push('# Быстрая проверка списка модулей');
    lines.push('pnpm wiki:dry-run');
    lines.push('```');

    return lines.join('\n');
}

// ─── Главная функция ─────────────────────────────────────────────────────────

function isWikiSection(value: string): value is WikiSection {
    return ['server', 'client', 'shared', 'modules', 'data'].includes(value);
}

async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const moduleFilter = args.includes('--module')
        ? args[args.indexOf('--module') + 1]
        : null;
    const sectionArg = args.includes('--section')
        ? args[args.indexOf('--section') + 1]
        : null;
    const force = args.includes('--force');
    const dryRun = args.includes('--dry-run');

    if (sectionArg && !isWikiSection(sectionArg)) {
        console.error(`❌ Неизвестный раздел "${sectionArg}". Доступно: server, client, shared, modules, data`);
        process.exit(1);
    }

    // Определяем провайдера
    const providerArg = args.includes('--provider')
        ? args[args.indexOf('--provider') + 1]
        : undefined;

    let provider: Provider | null = null;
    if (!dryRun) {
        try {
            provider = detectProvider(providerArg);
            console.log(`🤖 Провайдер: ${provider === 'openai' ? `OpenAI (${getModel('openai')})` : `Anthropic (${getModel('anthropic')})`}`);
        } catch (err) {
            console.error(`❌ ${(err as Error).message}`);
            process.exit(1);
        }
    }

    // Сбор всех модулей
    let allModules: ModuleTarget[] = [
        ...collectServerModules(),
        ...collectClientModules(),
        ...collectSharedModules(),
        ...collectInstructionModules(),
        ...collectDataModules(),
    ];

    // Применяем фильтры
    if (sectionArg) {
        allModules = allModules.filter(moduleTarget => moduleTarget.section === sectionArg);
    }
    if (moduleFilter) {
        allModules = allModules.filter(moduleTarget =>
            moduleTarget.name === moduleFilter || moduleTarget.name.includes(moduleFilter),
        );
    }

    console.log(`\n🔍 Найдено модулей: ${allModules.length}`);

    if (dryRun) {
        console.log('\n📋 Список модулей (dry-run):');
        for (const moduleTarget of allModules) {
            const exists = fs.existsSync(moduleTarget.outputFile) ? '✅' : '⬜';
            const sourceRel = path.relative(ROOT, moduleTarget.sourcePath);
            console.log(`  ${exists} [${moduleTarget.section}] ${moduleTarget.name} → ${path.relative(ROOT, moduleTarget.outputFile)} (${sourceRel})`);
        }
        return;
    }

    // Создаём директории wiki
    for (const section of new Set(allModules.map(moduleTarget => moduleTarget.section))) {
        fs.mkdirSync(path.join(WIKI_DIR, section), { recursive: true });
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const moduleTarget of allModules) {
        const relOut = path.relative(ROOT, moduleTarget.outputFile);

        // Пропускаем уже сгенерированные (если нет --force)
        if (!force && fs.existsSync(moduleTarget.outputFile)) {
            console.log(`  ⏭️  Пропуск (уже есть): ${relOut}`);
            skipCount++;
            continue;
        }

        console.log(`\n⚙️  [${moduleTarget.section}] ${moduleTarget.name}`);

        // Читаем файлы модуля
        const files = readModuleFiles(moduleTarget.sourcePath);
        if (files.length === 0) {
            console.log('  ⚠️  Нет подходящих файлов, пропуск');
            skipCount++;
            continue;
        }

        console.log(`  📄 Файлов: ${files.length}`);

        try {
            const content = await generateWikiPage(moduleTarget, files, provider!);

            fs.mkdirSync(path.dirname(moduleTarget.outputFile), { recursive: true });
            fs.writeFileSync(moduleTarget.outputFile, content, 'utf-8');
            console.log(`  ✅ Сохранено: ${relOut}`);
            successCount++;
        } catch (err) {
            console.error(`  ❌ Ошибка: ${(err as Error).message}`);
            errorCount++;
        }

        // Пауза между запросами чтобы не превышать rate limit
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Генерируем индекс
    const indexContent = generateIndex(allModules);
    fs.mkdirSync(WIKI_DIR, { recursive: true });
    fs.writeFileSync(path.join(WIKI_DIR, 'README.md'), indexContent, 'utf-8');
    console.log('\n📑 Индекс обновлён: wiki/README.md');

    console.log(`\n✨ Готово! Успешно: ${successCount}, пропущено: ${skipCount}, ошибок: ${errorCount}`);
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
