// Notion-style column layout. A `columns` node contains 2-4 `column` nodes,
// each of which can hold any block content. Renders as CSS grid with equal
// widths; on mobile collapses to single column via media query in global.css.
import { Node, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      insertColumns: (count?: number) => ReturnType
    }
  }
}

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,4}',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const count = Math.max(2, node.childCount)
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'columns',
        class: 'mo-columns',
        style: `--mo-cols: ${count}`
      }),
      0
    ]
  },

  addCommands() {
    return {
      insertColumns:
        (count = 2) =>
        ({ commands }) => {
          const n = Math.max(2, Math.min(4, count))
          const columns = Array.from({ length: n }, () => ({
            type: 'column',
            content: [{ type: 'paragraph' }]
          }))
          return commands.insertContent({ type: this.name, content: columns })
        }
    }
  }
})

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'mo-column' }),
      0
    ]
  }
})
