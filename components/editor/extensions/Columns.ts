// Notion-style column layout. A `columns` node contains 2-4 `column` nodes,
// each of which can hold any block content. Renders as CSS grid.
//
// `columnWidths`: array of numbers (percent units, sum ≈ 100). When unset or
// length-mismatched with child count, columns fall back to equal widths.
// In the editor a NodeView (ColumnsView.vue) renders draggable resize
// handles between columns.
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ColumnsView from './ColumnsView.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columns: {
      insertColumns: (count?: number) => ReturnType
    }
  }
}

function gridTemplate(widths: number[] | null, count: number): string {
  if (widths && widths.length === count) {
    return widths.map((w) => `${w}fr`).join(' ')
  }
  return `repeat(${count}, minmax(0, 1fr))`
}

export const Columns = Node.create({
  name: 'columns',
  group: 'block',
  content: 'column{2,4}',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      columnWidths: {
        default: null as number[] | null,
        parseHTML: (el) => {
          const raw = el.getAttribute('data-column-widths')
          if (!raw) return null
          try {
            const arr = JSON.parse(raw)
            return Array.isArray(arr) && arr.every((n) => typeof n === 'number') ? arr : null
          } catch { return null }
        },
        renderHTML: (attrs) =>
          attrs.columnWidths ? { 'data-column-widths': JSON.stringify(attrs.columnWidths) } : {}
      },
      verticalAlign: {
        default: 'top' as 'top' | 'center' | 'bottom',
        parseHTML: (el) => (el.getAttribute('data-valign') as any) || 'top',
        renderHTML: (attrs) => ({ 'data-valign': attrs.verticalAlign || 'top' })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="columns"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const count = Math.max(2, node.childCount)
    const widths = (node.attrs.columnWidths as number[] | null) ?? null
    const valign = (node.attrs.verticalAlign as string) || 'top'
    const alignItems = valign === 'center' ? 'center' : valign === 'bottom' ? 'end' : 'start'
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'columns',
        class: 'mo-columns',
        style: `grid-template-columns: ${gridTemplate(widths, count)}; align-items: ${alignItems}`
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
          const widths = Array.from({ length: n }, () => Math.round((100 / n) * 100) / 100)
          return commands.insertContent({ type: this.name, attrs: { columnWidths: widths }, content: columns })
        }
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ColumnsView)
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
