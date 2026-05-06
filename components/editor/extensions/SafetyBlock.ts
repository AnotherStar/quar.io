// Custom block for safety / warning / regulatory content.
// Three severity levels — info / warning / danger — affect color and icon on render.
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SafetyBlockView from './SafetyBlockView.vue'

export type SafetySeverity = 'info' | 'warning' | 'danger'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    safetyBlock: {
      setSafetyBlock: (severity?: SafetySeverity) => ReturnType
    }
  }
}

export const SafetyBlock = Node.create({
  name: 'safetyBlock',
  group: 'block',
  content: 'inline*',
  defining: true,

  addAttributes() {
    return {
      severity: {
        default: 'warning' as SafetySeverity,
        parseHTML: (el) => (el.getAttribute('data-severity') as SafetySeverity) ?? 'warning',
        renderHTML: (attrs) => ({ 'data-severity': attrs.severity })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="safety-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'safety-block' }), 0]
  },

  addCommands() {
    return {
      setSafetyBlock:
        (severity = 'warning') =>
        ({ commands }) =>
          commands.setNode(this.name, { severity })
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(SafetyBlockView)
  }
})
