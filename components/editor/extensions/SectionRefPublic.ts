// Public-page (read-only) variant of SectionRef. Same data shape, different
// NodeView — displays the actual resolved section content inline.
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import SectionRefPublicView from './SectionRefPublicView.vue'

export const SectionRefPublic = Node.create({
  name: 'sectionRef',
  group: 'block',
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      sectionId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-section-id'),
        renderHTML: (attrs) => (attrs.sectionId ? { 'data-section-id': attrs.sectionId } : {})
      }
    }
  },
  parseHTML() { return [{ tag: 'div[data-type="section-ref"]' }] },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'section-ref' })] },
  addNodeView() { return VueNodeViewRenderer(SectionRefPublicView) }
})
