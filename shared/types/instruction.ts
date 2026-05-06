// TipTap document JSON — minimal surface used across server/client.
// Matches ProseMirror doc shape; structural validation is loose by design
// because TipTap extensions evolve.
export interface TiptapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

export interface TiptapDoc {
  type: 'doc'
  content?: TiptapNode[]
}

export const EMPTY_DOC: TiptapDoc = { type: 'doc', content: [] }

// Walk a TipTap doc collecting nodes that have an `id` attribute (block ids).
// We use this for analytics (BLOCK_VIEW) + feedback widget targeting.
export function collectBlockIds(doc: TiptapDoc): string[] {
  const ids: string[] = []
  const walk = (n: TiptapNode) => {
    if (n.attrs && typeof n.attrs.id === 'string') ids.push(n.attrs.id)
    if (n.content) n.content.forEach(walk)
  }
  doc.content?.forEach(walk)
  return ids
}

// Plain text extraction — used for in-instruction search index.
export function extractText(doc: TiptapDoc): string {
  const out: string[] = []
  const walk = (n: TiptapNode) => {
    if (n.text) out.push(n.text)
    if (n.content) n.content.forEach(walk)
  }
  doc.content?.forEach(walk)
  return out.join(' ')
}
