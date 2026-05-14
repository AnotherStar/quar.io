// Notion-style toggleable section. Renders as `<details>`-like block with
// a clickable caret: summary line is always visible, body collapses.
//
// Schema: a `toggle` node contains exactly two children — `toggleSummary`
// (inline content, becomes the always-visible header) and `toggleContent`
// (block content, the collapsible body). `open` attribute on the parent
// controls default state for the public viewer and visibility in the editor.
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ToggleView from './ToggleView.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    toggleBlock: {
      insertToggle: () => ReturnType
    }
  }
}

export const ToggleSummary = Node.create({
  name: 'toggleSummary',
  content: 'inline*',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="toggle-summary"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle-summary' }), 0]
  }
})

export const ToggleContent = Node.create({
  name: 'toggleContent',
  content: 'block+',
  defining: true,
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="toggle-content"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle-content' }), 0]
  }
})

export const Toggle = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'toggleSummary toggleContent',
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      // `open` — состояние «по умолчанию» при первом открытии публичной
      // инструкции. В редакторе он же определяет, развёрнут ли блок прямо
      // сейчас. По умолчанию свёрнут — иначе toggle теряет смысл.
      open: {
        default: false,
        parseHTML: (el) => el.getAttribute('data-open') === 'true',
        renderHTML: (attrs) => ({ 'data-open': attrs.open ? 'true' : 'false' })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="toggle"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'toggle' }), 0]
  },

  addCommands() {
    return {
      insertToggle:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { open: true },
            content: [
              { type: 'toggleSummary' },
              { type: 'toggleContent', content: [{ type: 'paragraph' }] }
            ]
          })
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ToggleView)
  }
})
