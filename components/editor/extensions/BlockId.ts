// Adds a stable `id` attribute to top-level block nodes.
// Required for analytics (BLOCK_VIEW), feedback widget targeting, and search anchors.
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { customAlphabet } from 'nanoid'

const newId = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 10)

const TYPES = ['paragraph', 'heading', 'bulletList', 'orderedList', 'taskList', 'blockquote', 'codeBlock', 'image', 'safetyBlock', 'youtube', 'sectionRef', 'moduleRef']

export const BlockId = Extension.create({
  name: 'blockId',
  addGlobalAttributes() {
    return [
      {
        types: TYPES,
        attributes: {
          id: {
            default: null,
            parseHTML: (el) => el.getAttribute('data-block-id'),
            renderHTML: (attrs) => (attrs.id ? { 'data-block-id': attrs.id } : {})
          }
        }
      }
    ]
  },
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('blockId'),
        appendTransaction: (_transactions, _oldState, newState) => {
          const tr = newState.tr
          let modified = false
          const seen = new Set<string>()
          newState.doc.descendants((node, pos) => {
            if (!TYPES.includes(node.type.name)) return
            const id = node.attrs.id as string | null
            if (!id || seen.has(id)) {
              const fresh = newId()
              seen.add(fresh)
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: fresh })
              modified = true
            } else {
              seen.add(id)
            }
          })
          return modified ? tr : null
        }
      })
    ]
  }
})
