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
        default: 'left',
        parseHTML: (el) => el.getAttribute('data-align') || 'left',
        renderHTML: (attrs) => ({ 'data-align': attrs.align })
      },
      intrinsicWidth: {
        default: null,
        parseHTML: (el) => {
          const value = el.getAttribute('data-intrinsic-width')
          const num = value ? parseInt(value, 10) : NaN
          return Number.isFinite(num) ? num : null
        },
        renderHTML: (attrs) => attrs.intrinsicWidth ? { 'data-intrinsic-width': attrs.intrinsicWidth } : {}
      },
      intrinsicHeight: {
        default: null,
        parseHTML: (el) => {
          const value = el.getAttribute('data-intrinsic-height')
          const num = value ? parseInt(value, 10) : NaN
          return Number.isFinite(num) ? num : null
        },
        renderHTML: (attrs) => attrs.intrinsicHeight ? { 'data-intrinsic-height': attrs.intrinsicHeight } : {}
      }
    }
  },
  addNodeView() {
    return VueNodeViewRenderer(ResizableImageView)
  }
})
