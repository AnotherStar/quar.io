# server-routes

## Назначение

Модуль `server-routes` содержит кастомный Nitro route для отдачи загруженных файлов из локального хранилища. В ManualOnline он используется только при `STORAGE_DRIVER=local`; в production-сценарии с S3/MinIO публичные URL должны указывать напрямую на объектное хранилище, и данный маршрут не задействуется.

## Ключевые возможности

- Отдача файлов из локальной директории загрузок через HTTP.
- Поддержка catch-all пути для вложенных файлов: `/uploads/...`.
- Проверка активного storage-драйвера через runtime config.
- Защита от path traversal за счёт нормализации и проверки пути.
- Автоматическая установка `Content-Type` по расширению файла.
- Установка долгосрочного HTTP-кэширования для статичных медиафайлов.
- Возврат корректных HTTP-ошибок: `400`, `404`.

## Архитектура

Модуль представлен одним Nitro route-файлом:

```text
server/
└── routes/
    └── uploads/
        └── [...path].get.ts
```

### `server/routes/uploads/[...path].get.ts`

Это серверный обработчик Nuxt/Nitro, объявленный через:

```ts
export default defineEventHandler(async (event) => {
  // ...
})
```

Файл реализует публичный `GET`-маршрут для чтения файлов, записанных локальным storage-драйвером.

Основной поток выполнения:

1. Получает runtime-конфигурацию через `useRuntimeConfig()`.
2. Проверяет, что активен локальный storage-драйвер:

   ```ts
   if (cfg.storage.driver !== 'local') throw createError({ statusCode: 404 })
   ```

3. Получает catch-all параметр маршрута `path`.
4. Строит абсолютный путь к файлу относительно локальной директории `cfg.storage.localDir`.
5. Проверяет, что итоговый путь остаётся внутри базовой директории.
6. Читает файл через `readFile`.
7. Устанавливает HTTP-заголовки:
   - `Content-Type`
   - `Cache-Control`
8. Возвращает содержимое файла как буфер.

## API / Интерфейс

### `GET /uploads/[...path]`

Файл:

```text
server/routes/uploads/[...path].get.ts
```

Nitro route:

```http
GET /uploads/{path}
```

Где `{path}` — произвольный вложенный путь до файла внутри локальной директории загрузок.

Примеры URL:

```http
GET /uploads/manuals/abc/image.png
GET /uploads/products/123/photo.webp
GET /uploads/editor/assets/file.pdf
```

### Параметры

| Параметр | Источник | Тип | Описание |
|---|---|---|---|
| `path` | Router param | `string` | Catch-all путь до файла внутри директории `cfg.storage.localDir` |

Параметр извлекается так:

```ts
const path = getRouterParam(event, 'path')
```

Если параметр отсутствует, возвращается ошибка:

```http
400 Bad Request
```

### Ответы

#### Успешный ответ

При успешном чтении файла маршрут возвращает бинарное содержимое файла.

Пример заголовков:

```http
Content-Type: image/png
Cache-Control: public, max-age=31536000, immutable
```

`Content-Type` определяется с помощью пакета `mime-types`:

```ts
lookup(fullPath) || 'application/octet-stream'
```

Если MIME-тип не удалось определить, используется:

```http
application/octet-stream
```

#### Ошибки

| Статус | Причина |
|---|---|
| `400` | Не передан параметр `path` |
| `400` | Итоговый путь не прошёл проверку path traversal |
| `404` | Storage-драйвер не равен `local` |
| `404` | Файл не найден или не может быть прочитан |

## Бизнес-логика

### Использование только для локального storage

Маршрут работает исключительно при локальном storage-драйвере:

```ts
if (cfg.storage.driver !== 'local') throw createError({ statusCode: 404 })
```

Это означает:

- при `STORAGE_DRIVER=local` файлы доступны через `/uploads/...`;
- при `STORAGE_DRIVER=s3` маршрут намеренно не используется;
- в S3/MinIO-сценарии URL должны вести напрямую в объектное хранилище или на соответствующий CDN/endpoint.

Такое поведение явно зафиксировано в комментарии к файлу:

```ts
// Serves files written by the "local" storage driver.
// In production with STORAGE_DRIVER=s3 this route is unused (URLs point at S3).
```

### Проверка обязательного пути

Если catch-all параметр отсутствует, обработчик возвращает `400`:

```ts
if (!path) throw createError({ statusCode: 400 })
```

Это предотвращает попытку прочитать базовую директорию uploads как файл.

### Защита от path traversal

Перед чтением файла маршрут строит абсолютные пути:

```ts
const baseDir = resolve(process.cwd(), cfg.storage.localDir)
const fullPath = resolve(baseDir, path)
```

Затем проверяет, что итоговый путь находится внутри `baseDir`:

```ts
if (!normalize(fullPath).startsWith(baseDir)) {
  throw createError({ statusCode: 400 })
}
```

Цель проверки — запретить обращения вида:

```http
GET /uploads/../../.env
GET /uploads/../../../etc/passwd
```

### Чтение файла

Файл читается через Node.js API:

```ts
const buf = await readFile(fullPath)
```

Если чтение завершилось ошибкой — например, файл отсутствует, нет прав доступа или путь указывает на директорию — маршрут возвращает `404`:

```ts
catch {
  throw createError({ statusCode: 404 })
}
```

### Кэширование

Для успешно найденных файлов устанавливается долгосрочное кэширование:

```ts
setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
```

Это означает:

- файл может кэшироваться публичными кэшами;
- срок кэширования — 1 год;
- файл считается неизменяемым.

Такой режим подходит для файлов с уникальными именами или content-hash в URL. Если файл по тому же URL может быть перезаписан, кэширование может привести к показу устаревшей версии.

## Зависимости

### Внутренние зависимости ManualOnline

Маршрут зависит от runtime-конфигурации проекта:

```ts
const cfg = useRuntimeConfig()
```

Ожидаемые поля конфигурации:

```ts
cfg.storage.driver
cfg.storage.localDir
```

По коду видно, что поддерживается как минимум значение:

```ts
cfg.storage.driver === 'local'
```

Также в комментарии упоминается production-режим с:

```ts
STORAGE_DRIVER=s3
```

Однако логика S3/MinIO в данном файле не реализована.

### Nuxt / Nitro / h3

Используются серверные утилиты Nuxt/Nitro:

- `defineEventHandler`
- `useRuntimeConfig`
- `getRouterParam`
- `createError`
- `setHeader`

### Node.js

Используются стандартные модули Node.js:

```ts
import { readFile } from 'node:fs/promises'
import { resolve, normalize } from 'node:path'
```

Назначение:

- `readFile` — чтение файла с диска;
- `resolve` — построение абсолютных путей;
- `normalize` — нормализация пути перед проверкой.

### Внешние npm-зависимости

Используется пакет:

```ts
import { lookup } from 'mime-types'
```

Он нужен для определения MIME-типа файла по пути/расширению.

## Примеры использования

### 1. Получение локально загруженного изображения

При конфигурации:

```env
STORAGE_DRIVER=local
```

и наличии файла в локальной директории загрузок, например:

```text
{cfg.storage.localDir}/products/123/photo.png
```

его можно получить по URL:

```http
GET /uploads/products/123/photo.png
```

Ожидаемый ответ:

```http
HTTP/1.1 200 OK
Content-Type: image/png
Cache-Control: public, max-age=31536000, immutable
```

Тело ответа — бинарное содержимое файла.

### 2. Поведение при S3-драйвере

Если runtime config содержит:

```ts
cfg.storage.driver !== 'local'
```

например, используется S3/MinIO, маршрут не отдаёт файлы:

```http
GET /uploads/products/123/photo.png
```

Ответ:

```http
HTTP/1.1 404 Not Found
```

В этом режиме клиентские или публичные URL должны указывать не на `/uploads/...`, а на URL объектного хранилища.

## Замечания

- Модуль содержит только один route-файл. Другие server routes в предоставленном исходном коде отсутствуют.
- Маршрут предназначен для локального storage и не реализ��ет работу с S3/MinIO.
- Установлено агрессивное кэширование `immutable` на 1 год. Это безопасно только при условии, что URL файла меняется при изменении содержимого.
- Проверка path traversal использует:

  ```ts
  normalize(fullPath).startsWith(baseDir)
  ```

  В общем случае более строгой практикой является проверка с учётом разделителя пути или использование `relative`, чтобы исключить пограничные случаи с похожими префиксами директорий. В текущем коде дополнительной проверки нет.
- Ошибки чтения файла не различаются: отсутствие файла, ошибка прав доступа и другие проблемы возвращают одинаковый `404`.

---
module: server-routes
section: server
generated: 2026-05-08
files: 1
---