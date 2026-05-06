// Notion-style resizable image. Extends the basic TipTap Image with `width`
// attribute and an `align` attribute. NodeView shows a corner drag handle
// when the editor is editable. On public pages the same node renders as a
// plain image with the saved width applied.
import Image from '@tiptap/extension-image'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import ResizableImageView from './ResizableImageView.vue'

export const ResizableImage = Image.extend({
  name: 'image',
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute('width') || el.style.width
          if (!w) return null
          const num = parseInt(w, 10)
          return Number.isFinite(num) ? num : null
        },
        renderHTML: (attrs) => (attrs.width ? { style: `width: ${attrs.width}px; max-width: 100%; height: auto` } : {})
      },
      align: {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') || 'center',
        renderHTML: (attrs) => ({ 'data-align': attrs.align })
      }
    }
  },
  addNodeView() {
    return VueNodeViewRenderer(ResizableImageView)
  }
})
