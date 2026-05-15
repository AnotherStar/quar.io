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

// Системные промпты вынесены в shared/aiSettings.ts и управляются из админки.
// Runtime читает их через getAiSetting('instruction.generate.fromFiles') и
// getAiSetting('instruction.generate.fromPrompt'). См. также instruction.import
// и instruction.inlinePrompt.*.

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
