// Inline reference to a configured tenant module (e.g. warranty form, chat).
// Stores the TenantModuleConfig id; per-instance config override is optional.
import { Node, mergeAttributes } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ModuleRefView from './ModuleRefView.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    moduleRef: {
      insertModuleRef: (tenantModuleConfigId?: string | null) => ReturnType
    }
  }
}

export const ModuleRef = Node.create({
  name: 'moduleRef',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

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

  parseHTML() {
    return [{ tag: 'div[data-type="module-ref"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'module-ref' })]
  },

  addCommands() {
    return {
      insertModuleRef:
        (tenantModuleConfigId = null) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { tenantModuleConfigId, configOverride: {} }
          })
    }
  },

  addNodeView() {
    return VueNodeViewRenderer(ModuleRefView)
  }
})
