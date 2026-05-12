<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { Highlight } from '~/components/editor/extensions/Highlight'
import type { TiptapDoc } from '~~/shared/types/instruction'

definePageMeta({
  layout: false
})

const demoInstructionId = 'cmp2io29m000emth5f6v2yhne'
const demoTitle = ref('Кресло Бруклин')
const loadedContent = shallowRef<TiptapDoc | null>(null)
const DemoImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const width = el.getAttribute('width') || el.style.width
          const value = width ? parseInt(width, 10) : NaN
          return Number.isFinite(value) ? value : null
        },
        renderHTML: (attrs) => attrs.width ? { style: `width: ${attrs.width}px; max-width: 100%; height: auto` } : {}
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
  }
})

const editor = useEditor({
  content: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Бруклин' }]
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Инструкция по сборке деревянного кресла. Текст можно редактировать прямо здесь.' }]
      },
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Разложите детали на ровной поверхности.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Закрепите боковые опоры шестигранным ключом.' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Проверьте устойчивость перед использованием.' }] }]
          }
        ]
      }
    ]
  },
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    DemoImage,
    Placeholder.configure({
      placeholder: 'Начните писать инструкцию...'
    }),
    Highlight,
    Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-link underline' } })
  ],
  editorProps: {
    attributes: {
      class: 'tiptap focus:outline-none'
    }
  }
})

async function loadDemoInstruction() {
  try {
    const response = await $fetch<{ instruction: { title: string, content: TiptapDoc } }>(
      `/api/landing-demo/instruction/${demoInstructionId}`
    )

    demoTitle.value = response.instruction.title
    loadedContent.value = response.instruction.content
    editor.value?.commands.setContent(response.instruction.content, false)
  } catch (error) {
    console.warn('Failed to load landing demo instruction', error)
  }
}

function setLink() {
  if (!editor.value) return
  const previous = editor.value.getAttributes('link').href
  const url = prompt('URL ссылки:', previous)
  if (url === null) return
  if (url === '') editor.value.chain().focus().unsetLink().run()
  else editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

function clearFormatting() {
  editor.value?.chain().focus().unsetAllMarks().clearNodes().run()
}

function toggleHighlight() {
  if (!editor.value) return
  const chain = editor.value.chain().focus() as any
  if (editor.value.isActive('highlight')) chain.unsetHighlight().run()
  else chain.setHighlight({ color: '#fef7d6' }).run()
}

function isActive(name: string, attrs?: Record<string, unknown>) {
  return editor.value ? editor.value.isActive(name, attrs) : false
}

function btnClass(active: boolean) {
  return [
    'inline-flex h-8 min-w-[32px] items-center justify-center gap-1 rounded-md px-1.5 text-body-sm transition-colors',
    active ? 'bg-canvas text-ink shadow-subtle' : 'text-charcoal hover:bg-hairline-soft'
  ]
}

watch(editor, (instance) => {
  if (instance && loadedContent.value) instance.commands.setContent(loadedContent.value, false)
})

onMounted(loadDemoInstruction)
onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <main class="min-h-screen bg-canvas text-ink">
    <div class="border-b border-hairline bg-canvas px-md py-sm">
      <div class="flex items-center justify-between gap-md">
        <div class="min-w-0">
          <p class="truncate text-caption-bold text-steel">Инструкция товара</p>
          <p class="truncate text-body-sm-md text-navy">{{ demoTitle }}</p>
        </div>
      </div>
    </div>

    <div class="p-md">
      <div v-if="editor" class="editor-toolbar-bar sticky z-10 flex flex-wrap items-center gap-2 pb-md">
        <div class="toolbar-group">
          <button
            type="button"
            :class="btnClass(isActive('paragraph') && !isActive('heading'))"
            @click="editor.chain().focus().setParagraph().run()"
          >
            <Icon name="lucide:pilcrow" class="h-4 w-4" />
          </button>
          <button
            type="button"
            :class="btnClass(isActive('heading', { level: 1 }))"
            @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
          >
            <Icon name="lucide:heading-1" class="h-4 w-4" />
          </button>
          <button
            type="button"
            :class="btnClass(isActive('heading', { level: 2 }))"
            @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          >
            <Icon name="lucide:heading-2" class="h-4 w-4" />
          </button>
          <button
            type="button"
            :class="btnClass(isActive('heading', { level: 3 }))"
            @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
          >
            <Icon name="lucide:heading-3" class="h-4 w-4" />
          </button>
        </div>

        <div class="toolbar-group">
          <button type="button" :class="btnClass(isActive('bold'))" @click="editor.chain().focus().toggleBold().run()">
            <Icon name="lucide:bold" class="h-4 w-4" />
          </button>
          <button type="button" :class="btnClass(isActive('italic'))" @click="editor.chain().focus().toggleItalic().run()">
            <Icon name="lucide:italic" class="h-4 w-4" />
          </button>
          <button type="button" :class="btnClass(isActive('strike'))" @click="editor.chain().focus().toggleStrike().run()">
            <Icon name="lucide:strikethrough" class="h-4 w-4" />
          </button>
          <button type="button" :class="btnClass(isActive('code'))" @click="editor.chain().focus().toggleCode().run()">
            <Icon name="lucide:code" class="h-4 w-4" />
          </button>
          <button type="button" :class="btnClass(isActive('link'))" @click="setLink">
            <Icon name="lucide:link" class="h-4 w-4" />
          </button>
          <button type="button" :class="btnClass(isActive('highlight'))" @click="toggleHighlight">
            <Icon name="lucide:highlighter" class="h-4 w-4" />
          </button>
          <button type="button" :class="btnClass(false)" @click="clearFormatting">
            <Icon name="lucide:remove-formatting" class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div class="bg-canvas">
        <ClientOnly>
          <EditorContent v-if="editor" class="mo-editor-canvas" :editor="editor" />
        </ClientOnly>
      </div>
    </div>
  </main>
</template>

<style>
html,
body {
  margin: 0;
  background: var(--color-canvas);
  max-width: 100%;
  overflow-x: clip;
}

* {
  box-sizing: border-box;
}

.editor-toolbar-bar {
  position: sticky;
  top: 16px;
  max-width: 100%;
  background: transparent;
}

.toolbar-group {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  overflow-x: auto;
  padding: 4px;
  border-radius: 12px;
  background: var(--color-surface);
  scrollbar-width: none;
}

.toolbar-group::-webkit-scrollbar {
  display: none;
}

.mo-editor-canvas {
  max-width: 100%;
  padding: 16px 18px 28px;
}

.mo-editor-canvas .tiptap {
  min-height: 520px;
  padding-bottom: 32px;
}

.tiptap {
  max-width: 100%;
  color: var(--color-ink);
  font-size: 16px;
  line-height: 1.55;
  outline: none;
}

.tiptap > * + * { margin-top: 0.75em; }
.tiptap h1 { margin: 2rem 0 0.5rem; color: var(--color-brand-navy); font-size: 36px; font-weight: 600; line-height: 1.2; letter-spacing: -0.5px; }
.tiptap h2 { margin: 1.75rem 0 0.5rem; color: var(--color-brand-navy); font-size: 28px; font-weight: 600; line-height: 1.25; }
.tiptap h3 { margin: 1.5rem 0 0.5rem; color: var(--color-brand-navy); font-size: 22px; font-weight: 600; line-height: 1.3; }
.tiptap p { line-height: 1.65; }
.tiptap ul { list-style: disc; padding-left: 1.5rem; }
.tiptap ol { list-style: decimal; padding-left: 1.5rem; }
.tiptap blockquote { border-left: 4px solid var(--color-hairline-strong); padding-left: 1rem; color: var(--color-charcoal); font-style: italic; }
.tiptap pre { overflow-x: auto; border-radius: 8px; background: var(--color-tint-gray); padding: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; }
.tiptap code { border-radius: 4px; background: var(--color-tint-gray); padding: 0.125rem 0.25rem; font-size: 14px; }
.tiptap pre code { background: transparent; padding: 0; }
.tiptap a { color: var(--color-link-blue); text-decoration: underline; }
.tiptap img {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 12px;
}
.tiptap [data-align="center"] {
  margin-right: auto;
  margin-left: auto;
}
.tiptap [data-align="right"] {
  margin-left: auto;
}
.tiptap p.is-empty::before {
  content: attr(data-placeholder);
  height: 0;
  float: left;
  color: var(--color-stone);
  opacity: 0.25;
  pointer-events: none;
}
.tiptap.is-editor-empty p:first-child::before,
.tiptap p.is-empty:first-child::before {
  opacity: 1;
}
</style>
