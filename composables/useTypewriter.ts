// Convert AiBlock list into TipTap node JSON and animate insertion into a
// TipTap editor with a "typing" delay between blocks. Each block is inserted
// atomically (single block per tick); within a long paragraph or list, the
// items appear progressively.
import type { Editor } from '@tiptap/vue-3'
import type { AiBlock } from '~~/server/utils/aiInstructionGenerator'

function aiBlockToNode(b: AiBlock): any {
  switch (b.type) {
    case 'heading':
      return { type: 'heading', attrs: { level: b.level }, content: [{ type: 'text', text: b.text }] }
    case 'paragraph':
      return { type: 'paragraph', content: b.text ? [{ type: 'text', text: b.text }] : [] }
    case 'bullet_list':
      return {
        type: 'bulletList',
        content: b.items.map((it) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: it }] }]
        }))
      }
    case 'numbered_list':
      return {
        type: 'orderedList',
        content: b.items.map((it) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: it }] }]
        }))
      }
    case 'safety':
      return { type: 'safetyBlock', attrs: { severity: b.severity }, content: [{ type: 'text', text: b.text }] }
    case 'image_placeholder':
      return { type: 'safetyBlock', attrs: { severity: 'info' }, content: [{ type: 'text', text: `📷 ${b.description}` }] }
  }
}

const DELAY_MS = 180

export async function typewriteBlocks(
  editor: Editor,
  blocks: AiBlock[],
  opts: { delayMs?: number; signal?: AbortSignal } = {}
): Promise<void> {
  const delay = opts.delayMs ?? DELAY_MS
  // Reset to empty doc — we're replaying from scratch.
  editor.commands.setContent({ type: 'doc', content: [] }, false)

  for (const b of blocks) {
    if (opts.signal?.aborted) return
    const node = aiBlockToNode(b)
    editor.commands.insertContent(node)
    // Scroll into view: TipTap does this on cursor; force focus to end.
    editor.commands.focus('end')
    await new Promise((res) => setTimeout(res, delay))
  }
  editor.commands.focus('end')
}
