// Incremental JSON parser tailored to our AI response shape.
// Feeds raw OpenAI text deltas; emits each top-level object inside the
// `blocks` array as soon as its closing `}` arrives — server can stream
// blocks to the SSE client without waiting for the whole response.
//
// Also extracts top-level scalar fields (title/slug/description/language)
// once they're complete (when their closing `"` arrives at depth 0).
import type { AiBlock } from './aiInstructionGenerator'

export interface ExtractorOutput {
  newBlocks: any[]
  newMeta: Partial<{ title: string; slug: string; description: string; language: string }>
}

const META_KEYS = ['title', 'slug', 'description', 'language'] as const
type MetaKey = (typeof META_KEYS)[number]

export class StreamingBlockExtractor {
  private buffer = ''
  // Position from which array scanning continues
  private cursor = 0
  // Index where `[` of `"blocks":[` starts (inside-array scanning begins after it)
  private blocksArrayStart = -1
  // Inside-block tracking
  private braceDepth = 0
  private blockStartIdx = -1
  private inString = false
  private escape = false
  // Already-emitted meta keys (don't re-emit)
  private emittedMeta = new Set<MetaKey>()

  feed(delta: string): ExtractorOutput {
    this.buffer += delta
    const out: ExtractorOutput = { newBlocks: [], newMeta: {} }

    // Try meta extraction (cheap regex against full buffer; only fires
    // for keys we haven't emitted yet)
    for (const key of META_KEYS) {
      if (this.emittedMeta.has(key)) continue
      const re = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's')
      const m = re.exec(this.buffer)
      if (m) {
        try {
          const val = JSON.parse(`"${m[1]}"`)
          out.newMeta[key] = val
          this.emittedMeta.add(key)
        } catch {
          // String contains an as-yet-incomplete escape sequence; try later
        }
      }
    }

    // Detect when the blocks array begins
    if (this.blocksArrayStart < 0) {
      const idx = this.buffer.indexOf('"blocks"')
      if (idx >= 0) {
        const colon = this.buffer.indexOf(':', idx + 8)
        if (colon >= 0) {
          const bracket = this.buffer.indexOf('[', colon + 1)
          if (bracket >= 0) {
            this.blocksArrayStart = bracket
            this.cursor = bracket + 1
          }
        }
      }
    }
    if (this.blocksArrayStart < 0) return out

    // Walk the buffer looking for completed top-level blocks
    while (this.cursor < this.buffer.length) {
      const ch = this.buffer[this.cursor]
      if (this.inString) {
        if (this.escape) this.escape = false
        else if (ch === '\\') this.escape = true
        else if (ch === '"') this.inString = false
      } else {
        if (ch === '"') this.inString = true
        else if (ch === '{') {
          if (this.braceDepth === 0) this.blockStartIdx = this.cursor
          this.braceDepth++
        } else if (ch === '}') {
          this.braceDepth--
          if (this.braceDepth === 0 && this.blockStartIdx >= 0) {
            const json = this.buffer.slice(this.blockStartIdx, this.cursor + 1)
            try {
              out.newBlocks.push(JSON.parse(json))
            } catch {
              // shouldn't happen for closed objects, but be safe
            }
            this.blockStartIdx = -1
          }
        } else if (ch === ']' && this.braceDepth === 0) {
          // End of blocks array — stop scanning
          this.cursor = this.buffer.length
          break
        }
      }
      this.cursor++
    }
    return out
  }

  // Final attempt to fish out anything we missed (e.g. meta that needs full JSON)
  finalize(): { full: any | null } {
    try {
      return { full: JSON.parse(this.buffer) }
    } catch {
      return { full: null }
    }
  }
}

// Same normalization as aiInstructionGenerator.normalize but per-block.
export function normalizeBlock(raw: any): AiBlock | null {
  if (!raw || typeof raw !== 'object') return null
  const links = normalizeLinks(raw.links)
  switch (raw.type) {
    case 'heading':
      return { type: 'heading', level: normalizeHeadingLevel(raw.level), text: String(raw.text || ''), links }
    case 'paragraph':
      return { type: 'paragraph', text: String(raw.text || ''), links }
    case 'bullet_list':
      return { type: 'bullet_list', items: (raw.items || []).filter(Boolean), links }
    case 'numbered_list':
      return { type: 'numbered_list', items: (raw.items || []).filter(Boolean), links }
    case 'task_list':
      return {
        type: 'task_list',
        taskItems: Array.isArray(raw.taskItems)
          ? raw.taskItems
              .map((it: any) => ({ text: String(it?.text || ''), checked: Boolean(it?.checked) }))
              .filter((it: { text: string }) => it.text)
          : [],
        links
      }
    case 'quote':
      return { type: 'quote', text: String(raw.text || ''), links }
    case 'code_block':
      return {
        type: 'code_block',
        text: String(raw.text || ''),
        codeLanguage: String(raw.codeLanguage || ''),
        links
      }
    case 'table':
      return {
        type: 'table',
        rows: Array.isArray(raw.rows)
          ? raw.rows
              .filter((row: any) => Array.isArray(row))
              .map((row: any[]) => row.map((cell) => String(cell ?? '')))
              .filter((row: string[]) => row.some((cell) => cell.trim()))
          : [],
        hasHeaderRow: Boolean(raw.hasHeaderRow),
        links
      }
    case 'safety':
      return {
        type: 'safety',
        severity: ((raw.severity || 'warning') as 'info' | 'warning' | 'danger'),
        text: String(raw.text || ''),
        links
      }
    case 'image':
      if (!raw.url) return null
      return { type: 'image', url: String(raw.url), description: String(raw.description || ''), links }
    case 'image_placeholder':
      return {
        type: 'image_placeholder',
        description: String(raw.description || raw.text || 'Иллюстрация'),
        links
      }
    case 'youtube':
      if (!raw.url) return null
      return { type: 'youtube', url: String(raw.url), description: String(raw.description || ''), links }
    default:
      return null
  }
}

function normalizeHeadingLevel(level: unknown): 1 | 2 | 3 {
  return level === 1 || level === 2 || level === 3 ? level : 2
}

function normalizeLinks(raw: any) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((link) => ({
      text: String(link?.text || '').trim(),
      url: String(link?.url || '').trim()
    }))
    .filter((link) => link.text && link.url)
}
