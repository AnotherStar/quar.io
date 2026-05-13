// Inline AI-prompt block. Author types a request right in the editor and
// clicks "Сгенерировать"; the response (text blocks or an image) replaces
// this node. Atom + non-content node — the NodeView owns its own <textarea>
// for the prompt text, stored in the `prompt` attribute.
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import AiPromptView from './AiPromptView.vue'

export type AiPromptMode = 'text' | 'image'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiPrompt: {
      insertAiPrompt: (mode?: AiPromptMode) => ReturnType
    }
  }
}

export const AiPrompt = Node.create({
  name: 'aiPrompt',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      prompt: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-prompt') ?? '',
        renderHTML: (attrs) => (attrs.prompt ? { 'data-prompt': attrs.prompt } : {})
      },
      mode: {
        default: 'text' as AiPromptMode,
        parseHTML: (el) => (el.getAttribute('data-mode') as AiPromptMode) ?? 'text',
        renderHTML: (attrs) => ({ 'data-mode': attrs.mode })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="ai-prompt"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'ai-prompt' })]
  },

  addCommands() {
    return {
      insertAiPrompt:
        (mode: AiPromptMode = 'text') =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { mode, prompt: '' } })
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(AiPromptView)
  }
})
