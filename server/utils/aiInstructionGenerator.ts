// AI instruction generator.
// Sends a user-uploaded file (PDF or image) to OpenAI and asks it to produce
// a structured instruction (title, description, ordered list of typed blocks).
// We then transform those blocks into a TipTap doc on the server side.
//
// Notes:
// - Image extraction from PDFs is not implemented in v1. The model is
//   instructed to insert {type:'image_placeholder', description} markers at
//   appropriate spots; we render those as info SafetyBlocks so the editor
//   user sees clearly where to add real images later.
// - Output is constrained via OpenAI Structured Outputs (json_schema strict)
//   so we always get a valid shape.
import OpenAI from 'openai'
import type { TiptapDoc, TiptapNode } from '~~/shared/types/instruction'

export type AiBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bullet_list'; items: string[] }
  | { type: 'numbered_list'; items: string[] }
  | { type: 'safety'; severity: 'info' | 'warning' | 'danger'; text: string }
  | { type: 'image'; url: string; description: string }
  | { type: 'image_placeholder'; description: string }

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
4. Если в источнике есть упоминания изображений или явно подразумеваются иллюстрации — вставь image_placeholder с осмысленным описанием

Правила вывода (строго JSON):
- title — Название товара из заголовка инструкции или описания товара
- slug — латиница + цифры + дефис, например "f-16" или "vacuum-cleaner-x500"
- description — 1-2 предложения про товар (для SEO)
- language — ISO-код языка инструкции ("ru", "en", ...)
- blocks — упорядоченный массив блоков:
  - heading с level 1-3 для разделов ("Подготовка", "Сборка", "Уход")
  - paragraph для обычного текста
  - bullet_list / numbered_list для шагов и списков
  - safety с severity "info" (полезный совет), "warning" (важно соблюдать), "danger" (опасность для жизни/здоровья)
  - image_placeholder там, где нужна иллюстрация — пиши конкретное описание ("Изображение: вид сверху на корпус")

Никогда не выдумывай характеристики, которых нет в источнике. Текст пиши на том же языке, что и источник, по умолчанию русский.`

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
        required: ['type', 'level', 'text', 'items', 'severity', 'description', 'url'],
        properties: {
          type: {
            type: 'string',
            enum: ['heading', 'paragraph', 'bullet_list', 'numbered_list', 'safety', 'image', 'image_placeholder']
          },
          level: { type: 'integer', enum: [0, 1, 2, 3] },
          text: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
          severity: { type: 'string', enum: ['', 'info', 'warning', 'danger'] },
          description: { type: 'string' },
          url: { type: 'string' }
        }
      }
    }
  }
} as const

// OpenAI strict schemas don't support per-type-discriminated objects without
// `oneOf`, which has limited support. We use a flat schema with all fields,
// then normalize on our side based on `type`.

interface RawBlock {
  type: AiBlock['type']
  level: 0 | 1 | 2 | 3
  text: string
  items: string[]
  severity: '' | 'info' | 'warning' | 'danger'
  description: string
  url: string
}

interface RawAiInstruction {
  title: string
  slug: string
  description: string
  language: string
  blocks: RawBlock[]
}

function normalize(raw: RawAiInstruction): AiInstruction {
  return {
    title: raw.title.trim(),
    slug: raw.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'instruction',
    description: raw.description.trim(),
    language: raw.language.trim() || 'ru',
    blocks: raw.blocks.map((b): AiBlock => {
      switch (b.type) {
        case 'heading':
          return { type: 'heading', level: ((b.level || 2) as 1 | 2 | 3), text: b.text }
        case 'paragraph':
          return { type: 'paragraph', text: b.text }
        case 'bullet_list':
          return { type: 'bullet_list', items: b.items.filter(Boolean) }
        case 'numbered_list':
          return { type: 'numbered_list', items: b.items.filter(Boolean) }
        case 'safety':
          return { type: 'safety', severity: (b.severity || 'warning') as 'info' | 'warning' | 'danger', text: b.text }
        case 'image':
          return { type: 'image', url: b.url, description: b.description || '' }
        case 'image_placeholder':
          return { type: 'image_placeholder', description: b.description || b.text || 'Иллюстрация' }
      }
    }).filter(Boolean) as AiBlock[]
  }
}

export async function generateInstructionFromFile(
  file: { buffer: Buffer; filename: string; mimeType: string }
): Promise<AiInstruction> {
  const cfg = useRuntimeConfig()
  if (!cfg.openai.apiKey) {
    throw createError({ statusCode: 500, statusMessage: 'OPENAI_API_KEY не настроен' })
  }
  const client = new OpenAI({ apiKey: cfg.openai.apiKey })

  const isImage = file.mimeType.startsWith('image/')
  const isPdf = file.mimeType === 'application/pdf' || file.filename.toLowerCase().endsWith('.pdf')
  if (!isImage && !isPdf) {
    throw createError({ statusCode: 400, statusMessage: 'Поддерживаются только PDF и изображения (на этом этапе)' })
  }

  const base64 = file.buffer.toString('base64')
  const dataUrl = `data:${file.mimeType};base64,${base64}`

  const userContent: any[] = [
    { type: 'input_text', text: 'Сгенерируй инструкцию по этому файлу.' }
  ]
  if (isImage) {
    userContent.push({ type: 'input_image', image_url: dataUrl })
  } else {
    userContent.push({
      type: 'input_file',
      filename: file.filename || 'document.pdf',
      file_data: dataUrl
    })
  }

  const response = await client.responses.create({
    model: cfg.openai.model,
    input: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'instruction',
        schema: RESPONSE_SCHEMA as any,
        strict: true
      }
    }
  })

  const raw = response.output_text
  if (!raw) throw createError({ statusCode: 502, statusMessage: 'Пустой ответ от OpenAI' })
  let parsed: RawAiInstruction
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'OpenAI вернул не-JSON' })
  }
  return normalize(parsed)
}

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
          content: [{ type: 'text', text: b.text }]
        })
        break
      case 'paragraph':
        content.push({
          type: 'paragraph',
          content: b.text ? [{ type: 'text', text: b.text }] : []
        })
        break
      case 'bullet_list':
        content.push({
          type: 'bulletList',
          content: b.items.map((it) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: it }] }]
          }))
        })
        break
      case 'numbered_list':
        content.push({
          type: 'orderedList',
          content: b.items.map((it) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: it }] }]
          }))
        })
        break
      case 'safety':
        content.push({
          type: 'safetyBlock',
          attrs: { severity: b.severity },
          content: [{ type: 'text', text: b.text }]
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
    }
  }
  return { type: 'doc', content }
}
