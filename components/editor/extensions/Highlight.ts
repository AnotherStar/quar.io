// Inline mark «акцент» — заливает выделенный текст фоновым цветом.
// Цвет сохраняется как CSS-переменная (любой valid color), поэтому
// при необходимости тенант может расширить палитру под бренд.
import { Mark, mergeAttributes } from '@tiptap/core'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlight: {
      setHighlight: (attrs: { color: string }) => ReturnType
      toggleHighlight: (attrs: { color: string }) => ReturnType
      unsetHighlight: () => ReturnType
    }
  }
}

export const Highlight = Mark.create({
  name: 'highlight',

  addAttributes() {
    return {
      color: {
        default: null as string | null,
        parseHTML: (el: HTMLElement) =>
          el.getAttribute('data-color') || el.style.backgroundColor || null,
        renderHTML: (attrs: { color?: string | null }) => {
          if (!attrs.color) return {}
          return {
            'data-color': attrs.color,
            style: `background-color: ${attrs.color}; padding: 0 0.18em; border-radius: 3px`
          }
        }
      }
    }
  },

  parseHTML() {
    return [{ tag: 'mark' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setHighlight:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      toggleHighlight:
        (attrs) =>
        ({ commands }) =>
          commands.toggleMark(this.name, attrs),
      unsetHighlight:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name)
    }
  }
})
