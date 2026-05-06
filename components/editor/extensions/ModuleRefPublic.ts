import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ModuleRefPublicView from './ModuleRefPublicView.vue'

export const ModuleRefPublic = Node.create({
  name: 'moduleRef',
  group: 'block',
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      tenantModuleConfigId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-config-id'),
        renderHTML: (attrs) =>
          attrs.tenantModuleConfigId ? { 'data-config-id': attrs.tenantModuleConfigId } : {}
      },
      configOverride: {
        default: {},
        parseHTML: (el) => {
          try { return JSON.parse(el.getAttribute('data-override') || '{}') } catch { return {} }
        },
        renderHTML: (attrs) => ({ 'data-override': JSON.stringify(attrs.configOverride || {}) })
      }
    }
  },
  parseHTML() { return [{ tag: 'div[data-type="module-ref"]' }] },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'module-ref' })] },
  addNodeView() { return VueNodeViewRenderer(ModuleRefPublicView) }
})
