// Shared AI instruction generation contract.
// Streaming endpoints send uploaded files to OpenAI using this prompt/schema,
// then transform emitted blocks into a TipTap doc on the server side.
//
// Notes:
// - Output is constrained via OpenAI Structured Outputs (json_schema strict)
//   so we always get a valid shape.
import type { TiptapDoc, TiptapNode } from '~~/shared/types/instruction'

export type AiLink = { text: string; url: string }
type AiBlockBase = { links?: AiLink[] }

export type AiBlock =
  | (AiBlockBase & { type: 'heading'; level: 1 | 2 | 3; text: string })
  | (AiBlockBase & { type: 'paragraph'; text: string })
  | (AiBlockBase & { type: 'bullet_list'; items: string[] })
  | (AiBlockBase & { type: 'numbered_list'; items: string[] })
  | (AiBlockBase & { type: 'task_list'; taskItems: Array<{ text: string; checked: boolean }> })
  | (AiBlockBase & { type: 'quote'; text: string })
  | (AiBlockBase & { type: 'code_block'; text: string; codeLanguage: string })
  | (AiBlockBase & { type: 'table'; rows: string[][]; hasHeaderRow: boolean })
  | (AiBlockBase & { type: 'safety'; severity: 'info' | 'warning' | 'danger'; text: string })
  | (AiBlockBase & { type: 'toggle'; summary: string; text: string })
  | (AiBlockBase & { type: 'image'; url: string; description: string })
  | (AiBlockBase & { type: 'image_placeholder'; description: string })
  | (AiBlockBase & { type: 'youtube'; url: string; description: string })

export interface AiInstruction {
  title: string
  slug: string
  description: string
  language: string
  blocks: AiBlock[]
}

export const SYSTEM_PROMPT = `Ты помогаешь продавцам создавать инструкции к товарам. На вход получаешь PDF или изображение существующей инструкции / описания товара. Тебе нужно:

1. Прочитать содержимое и понять что это за товар
2. Перенести содержимое в структурированный формат, не изменяя текст, восстанавливая оригинальную структуру
3. Не добавлять новые блоки, не удалять существующие
4. Если в источнике есть изображения или явно подразумеваются иллюстрации — вставь image или image_placeholder по правилам ниже
5. Сохранять таблицы, чек-листы, цитаты, блоки кода, предупреждения, обычные ссылки и ссылки на YouTube как структурные элементы, если они есть в источнике

Правила вывода (строго JSON):
- title — Название товара из заголовка инструкции или описания товара
- slug — латиница + цифры + дефис, например "f-16" или "vacuum-cleaner-x500"
- description — 1-2 предложения про товар (для SEO)
- language — ISO-код языка инструкции ("ru", "en", ...)
- blocks — упорядоченный массив блоков:
  - heading с level 1-3 для заголовков из источника. Не превращай заголовки в paragraph.
    * level=1: главный заголовок инструкции, крупные разделы верхнего уровня ("Техника безопасности", "Использование", "Очистка")
    * level=2: подразделы внутри крупного раздела ("Перед первым использованием", "Функция Smooth", "Поиск неисправностей")
    * level=3: локальные подпункты, подписи групп, небольшие вложенные темы
  - paragraph для обычного текста
  - bullet_list / numbered_list для шагов и списков
  - task_list для чек-листов с отметками выполнения или там где пользователь должен что-то проверить по составу или по шагам
  - table для таблиц: rows — все строки таблицы, hasHeaderRow=true если первая строка является шапкой
  - quote для цитат, примечаний из источника, которые оформлены как цитата/выноска
  - code_block для команд, кодов ошибок, конфигураций, технических фрагментов моноширинным текстом
  - youtube только если в источнике есть явная ссылка на YouTube-видео
  - safety для всех блоков "Внимание", "Важно", "Осторожно", "Предупреждение", "Опасно", "Не допускайте", "Запрещается", "Примечание", "Note", "Warning", "Danger", "Caution". Не оставляй такие фрагменты обычными paragraph.
    * severity="info": примечание, полезный совет, заметка без риска
    * severity="warning": важное правило эксплуатации, риск поломки, ожога, повреждения имущества
    * severity="danger": риск травмы, поражения током, пожара, смерти, контакт с острыми/движущимися частями
  - toggle — сворачиваемая секция: summary всегда видна, text раскрывается по клику. Используй для FAQ-стиля «вопрос → ответ», для длинных объяснений, которые мешают сканировать инструкцию, а также для опциональных деталей («Подробнее о…», «Если что-то пошло не так», «Технические характеристики»). summary — короткая строка-заголовок (вопрос или название раздела), text — раскрываемое содержимое одним абзацем.
  - image с url из переданного списка доступных изображений, если такой список есть
  - image_placeholder там, где нужна иллюстрация — пиши конкретное описание ("Изображение: вид сверху на корпус")

Правила для ссылок:
- Если в источнике есть URL, сайт, QR-ссылка, e-mail, ссылка на регистрацию, поддержку, видео или скачивание — сохрани её как кликабельную ссылку.
- Для обычных ссылок используй поле links внутри ближайшего paragraph / heading / safety / quote / list-блока.
- links — массив объектов { "text": "...", "url": "..." }. text должен быть точной подстрокой текста блока или элемента списка.
- Если URL сам является видимым текстом, продублируй его в text и url.
- YouTube-ссылку дополнительно можно вынести отдельным блоком youtube, если это самостоятельное видео из источника.

Контроль качества перед ответом:
- Документ должен использовать все подходящие возможности редактора: h1/h2/h3 для структуры, safety для предупреждений, table для таблиц, links для URL.
- Не отдавай длинную инструкцию как поток paragraph, если в источнике есть разделы, предупреждения, списки или ссылки.

Техническое правило JSON: из-за строгой схемы каждый объект block содержит все поля. Для неиспользуемых полей ставь пустые значения: level=0, text="", summary="", items=[], taskItems=[], rows=[], hasHeaderRow=false, severity="", description="", url="", codeLanguage="", links=[].
Не создавай section/module refs и не пытайся сохранять декоративную многоколоночную верстку: переноси контент в логическом порядке чтения.
Никогда не выдумывай характеристики, которых нет в источнике. Текст пиши на том же языке, что и источник, по умолчанию русский.`

// Используется, когда пользователь не прикрепил ни одного файла и просит
// сгенерировать инструкцию только по своему текстовому запросу. Output schema
// и набор блоков те же, что и в основном промпте, но без ограничений «не
// добавляй того, чего нет в источнике» — источника здесь просто нет.
export const SYSTEM_PROMPT_FROM_PROMPT = `Ты помогаешь продавцам создавать инструкции к товарам. Сейчас исходных файлов нет — есть только запрос пользователя. Тебе нужно:

1. Понять, какую инструкцию хочет получить пользователь (что за товар, какая задача)
2. Составить полноценную, структурированную инструкцию, опираясь на запрос и общедоступные знания о товарах подобного класса
3. Если в запросе чего-то не хватает — заполни разумными значениями, типичными для такого товара, но не выдумывай уникальные характеристики (серийные номера, артикулы, цены и т.п.)
4. Используй image_placeholder там, где иллюстрация была бы уместна (image не используй — у тебя нет URL картинок)

Правила вывода (строго JSON):
- title — короткое название товара / инструкции
- slug — латиница + цифры + дефис, например "f-16" или "vacuum-cleaner-x500"
- description — 1-2 предложения про товар (для SEO)
- language — ISO-код языка ("ru" по умолчанию, если пользователь явно не просит другой)
- blocks — упорядоченный массив блоков:
  - heading с level 1-3 для структуры
    * level=1: главный заголовок и крупные разделы ("Техника безопасности", "Использование", "Очистка")
    * level=2: подразделы внутри раздела
    * level=3: локальные подпункты
  - paragraph для обычного текста
  - bullet_list / numbered_list для шагов и списков
  - task_list для чек-листов
  - table для табличных данных
  - quote для примечаний и выносок
  - code_block для команд, кодов ошибок, конфигураций
  - youtube только если в запросе пользователя явно фигурирует ссылка на YouTube-видео
  - safety для предупреждений
    * severity="info": заметка, совет без риска
    * severity="warning": риск поломки, ожога, повреждения имущества
    * severity="danger": риск травмы, поражения током, пожара, контакт с острыми/движущимися частями
  - toggle — сворачиваемая секция: summary всегда видна, text раскрывается по клику. Используй для FAQ-стиля «вопрос → ответ», для опциональных подробностей и для длинных пояснений, которые засоряют основной поток инструкции.
  - image_placeholder с описанием того, что должно быть на иллюстрации (URL картинок нет)
  - image не используй — у тебя нет ни одного готового URL

Контроль качества:
- Не отдавай инструкцию как поток paragraph — используй заголовки, списки, safety-блоки, таблицы там, где это уместно.
- Если запрос пользователя короткий — раскрой его в полноценную инструкцию с разумной структурой (что это, как использовать, безопасность, уход, FAQ при необходимости).

Техническое правило JSON: из-за строгой схемы каждый объект block содержит все поля. Для неиспользуемых полей ставь пустые значения: level=0, text="", summary="", items=[], taskItems=[], rows=[], hasHeaderRow=false, severity="", description="", url="", codeLanguage="", links=[].
Не создавай section/module refs. Текст пиши на русском, если пользователь явно не попросил другой язык.`

export const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'slug', 'description', 'language', 'blocks'],
  properties: {
    title: { type: 'string' },
    slug: { type: 'string' },
    description: { type: 'string' },
    language: { type: 'string' },
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        // strict mode requires all properties listed in `required`; we allow
        // unused fields to be empty strings/arrays per block type.
        required: [
          'type',
          'level',
          'text',
          'summary',
          'items',
          'taskItems',
          'rows',
          'hasHeaderRow',
          'severity',
          'description',
          'url',
          'codeLanguage',
          'links'
        ],
        properties: {
          type: {
            type: 'string',
            enum: [
              'heading',
              'paragraph',
              'bullet_list',
              'numbered_list',
              'task_list',
              'quote',
              'code_block',
              'table',
              'safety',
              'toggle',
              'image',
              'image_placeholder',
              'youtube'
            ]
          },
          level: { type: 'integer', enum: [0, 1, 2, 3] },
          text: { type: 'string' },
          summary: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
          taskItems: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['text', 'checked'],
              properties: {
                text: { type: 'string' },
                checked: { type: 'boolean' }
              }
            }
          },
          rows: {
            type: 'array',
            items: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          hasHeaderRow: { type: 'boolean' },
          severity: { type: 'string', enum: ['', 'info', 'warning', 'danger'] },
          description: { type: 'string' },
          url: { type: 'string' },
          codeLanguage: { type: 'string' },
          links: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['text', 'url'],
              properties: {
                text: { type: 'string' },
                url: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
} as const

// Convert AI block list to a TipTap doc.
// Image placeholders become safety-info blocks marked with 📷 prefix —
// the editor user can replace them with actual images.
export function aiBlocksToTipTap(ai: AiInstruction): TiptapDoc {
  const content: TiptapNode[] = []

  for (const b of ai.blocks) {
    switch (b.type) {
      case 'heading':
        content.push({
          type: 'heading',
          attrs: { level: b.level },
          content: textToTipTapContent(b.text, b.links)
        })
        break
      case 'paragraph':
        content.push({
          type: 'paragraph',
          content: textToTipTapContent(b.text, b.links)
        })
        break
      case 'bullet_list':
        content.push({
          type: 'bulletList',
          content: b.items.map((it) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: textToTipTapContent(it, b.links) }]
          }))
        })
        break
      case 'numbered_list':
        content.push({
          type: 'orderedList',
          content: b.items.map((it) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: textToTipTapContent(it, b.links) }]
          }))
        })
        break
      case 'task_list':
        content.push({
          type: 'taskList',
          content: b.taskItems.map((it) => ({
            type: 'taskItem',
            attrs: { checked: it.checked },
            content: [{ type: 'paragraph', content: textToTipTapContent(it.text, b.links) }]
          }))
        })
        break
      case 'quote':
        content.push({
          type: 'blockquote',
          content: [{ type: 'paragraph', content: textToTipTapContent(b.text, b.links) }]
        })
        break
      case 'code_block':
        content.push({
          type: 'codeBlock',
          attrs: b.codeLanguage ? { language: b.codeLanguage } : {},
          content: b.text ? [{ type: 'text', text: b.text }] : []
        })
        break
      case 'table':
        content.push(tableBlockToTipTap(b.rows, b.hasHeaderRow))
        break
      case 'safety':
        content.push({
          type: 'safetyBlock',
          attrs: { severity: b.severity },
          content: textToTipTapContent(b.text, b.links)
        })
        break
      case 'toggle':
        content.push({
          type: 'toggle',
          attrs: { open: false },
          content: [
            {
              type: 'toggleSummary',
              content: textToTipTapContent(b.summary, b.links)
            },
            {
              type: 'toggleContent',
              content: [
                {
                  type: 'paragraph',
                  content: textToTipTapContent(b.text, b.links)
                }
              ]
            }
          ]
        })
        break
      case 'image':
        content.push({
          type: 'image',
          attrs: { src: b.url, alt: b.description || '' }
        })
        break
      case 'image_placeholder':
        // Highlighted "needs image" marker — user replaces in editor.
        content.push({
          type: 'safetyBlock',
          attrs: { severity: 'info' },
          content: [{ type: 'text', text: `📷 ${b.description}` }]
        })
        break
      case 'youtube':
        content.push({
          type: 'youtube',
          attrs: { src: b.url }
        })
        break
    }
  }
  return { type: 'doc', content }
}

function tableBlockToTipTap(rows: string[][], hasHeaderRow: boolean): TiptapNode {
  const width = Math.max(1, ...rows.map((row) => row.length))
  const normalizedRows = rows.length ? rows : [['']]

  return {
    type: 'table',
    content: normalizedRows.map((row, rowIndex) => ({
      type: 'tableRow',
      content: Array.from({ length: width }, (_, colIndex) => ({
        type: hasHeaderRow && rowIndex === 0 ? 'tableHeader' : 'tableCell',
        content: [
          {
            type: 'paragraph',
            content: row[colIndex] ? [{ type: 'text', text: row[colIndex] }] : []
          }
        ]
      }))
    }))
  }
}

function textToTipTapContent(text: string, links: AiLink[] = []): TiptapNode[] {
  if (!text) return []

  const ranges = collectLinkRanges(text, links)
  const content: TiptapNode[] = []
  let cursor = 0

  for (const range of ranges) {
    if (range.start > cursor) {
      content.push({ type: 'text', text: text.slice(cursor, range.start) })
    }
    content.push({
      type: 'text',
      text: text.slice(range.start, range.end),
      marks: [{ type: 'link', attrs: { href: range.url } }]
    })
    cursor = range.end
  }

  if (cursor < text.length) {
    content.push({ type: 'text', text: text.slice(cursor) })
  }

  return content
}

function collectLinkRanges(text: string, links: AiLink[]) {
  const ranges: Array<{ start: number; end: number; url: string }> = []

  for (const link of links) {
    const label = link.text.trim()
    const url = normalizeHref(link.url)
    if (!label || !url) continue

    const start = text.indexOf(label)
    if (start < 0) continue
    ranges.push({ start, end: start + label.length, url })
  }

  const urlRe = /\bhttps?:\/\/[^\s<>"')]+/gi
  for (const match of text.matchAll(urlRe)) {
    const rawUrl = match[0]
    const start = match.index ?? 0
    const end = start + rawUrl.length
    if (ranges.some((range) => overlaps(start, end, range.start, range.end))) continue
    ranges.push({ start, end, url: rawUrl })
  }

  return ranges
    .sort((a, b) => a.start - b.start)
    .filter((range, index, sorted) => index === 0 || range.start >= sorted[index - 1].end)
}

function normalizeHref(url: string) {
  const value = url.trim()
  if (!value) return ''
  if (/^(https?:|mailto:)/i.test(value)) return value
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`
  return value
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd
}
