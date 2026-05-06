// Inline reference to a reusable Section. Stores only the section id;
// the actual content is resolved at render time (in editor: by the NodeView
// fetching from /api/sections/:id; in public render: server pre-resolves it).
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SectionRefView from './SectionRefView.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sectionRef: {
      insertSectionRef: (sectionId?: string | null) => ReturnType
    }
  }
}

export const SectionRef = Node.create({
  name: 'sectionRef',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      sectionId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-section-id'),
        renderHTML: (attrs) => (attrs.sectionId ? { 'data-section-id': attrs.sectionId } : {})
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="section-ref"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'section-ref' })]
  },

  addCommands() {
    return {
      insertSectionRef:
        (sectionId = null) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { sectionId } })
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(SectionRefView)
  }
})
