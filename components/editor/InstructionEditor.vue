<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Youtube from '@tiptap/extension-youtube'
import TextAlign from '@tiptap/extension-text-align'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { BlockId } from './extensions/BlockId'
import { SafetyBlock } from './extensions/SafetyBlock'
import { SectionRef } from './extensions/SectionRef'
import { ModuleRef } from './extensions/ModuleRef'
import { ResizableImage } from './extensions/ResizableImage'
import { Columns, Column } from './extensions/Columns'
import { BlockDragHandle } from './extensions/BlockDragHandle'
import SlashMenu from './SlashMenu.vue'
import type { TiptapDoc } from '~~/shared/types/instruction'

const props = defineProps<{
  modelValue: TiptapDoc | object
  placeholder?: string
  // When true, the editor doesn't register SectionRef/ModuleRef extensions
  // and the UI doesn't expose them — used inside the Section editor to
  // prevent infinite recursion (section embedding section embedding...).
  disableSectionRefs?: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: object]
  'ready': [editor: any]
}>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Placeholder.configure({
      // Show ¶ on every empty paragraph (not only the first), and the
      // helpful hint only on the doc's very first empty line.
      includeChildren: true,
      showOnlyCurrent: false,
      placeholder: ({ node, pos }) => {
        if (node.type.name !== 'paragraph') return ''
        if (pos === 0) return props.placeholder ?? 'Введите «/» для команд...'
        return '¶'
      }
    }),
    ResizableImage,
    Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-link underline' } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Youtube.configure({ controls: true, nocookie: true, width: 720, height: 405 }),
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
    SafetyBlock,
    ...(props.disableSectionRefs ? [] : [SectionRef, ModuleRef]),
    Columns,
    Column,
    Table.configure({ resizable: true, HTMLAttributes: { class: 'mo-table' } }),
    TableRow,
    TableHeader,
    TableCell,
    BlockDragHandle,
    BlockId
  ],
  editorProps: {
    attributes: {
      class: 'tiptap focus:outline-none min-h-[400px]'
    }
  },
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getJSON())
  },
  onCreate({ editor }) {
    // Emit the live Editor instance to the parent. More reliable than
    // template refs through <ClientOnly> wrappers.
    emit('ready', editor)
  }
})

watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value) return
    if (JSON.stringify(val) === JSON.stringify(editor.value.getJSON())) return
    editor.value.commands.setContent(val as object, false)
  }
)

onBeforeUnmount(() => editor.value?.destroy())

defineExpose({
  editor,
  getEditor: () => editor.value
})
</script>

<template>
  <div class="relative space-y-lg">
    <EditorToolbar v-if="editor" :editor="editor" :disable-section-refs="disableSectionRefs" />
    <EditorContent class="mo-editor-canvas" :editor="editor" />
    <SlashMenu v-if="editor" :editor="editor" :disable-section-refs="disableSectionRefs" />
  </div>
</template>

<style>
.mo-editor-canvas {
  @apply px-1 sm:px-lg;
}
.mo-editor-canvas .tiptap {
  @apply min-h-[560px] pb-2xl;
}
.tiptap {
  @apply text-body text-ink;
}
.tiptap > * + * { margin-top: 0.75em; }
.tiptap h1 { @apply text-h2 mt-8 mb-2; }
.tiptap h2 { @apply text-h3 mt-7 mb-2; }
.tiptap h3 { @apply text-h4 mt-6 mb-2; }
.tiptap p { @apply leading-relaxed; }
.tiptap ul { @apply list-disc pl-6; }
.tiptap ol { @apply list-decimal pl-6; }
.tiptap blockquote { @apply border-l-4 border-hairline-strong pl-4 text-charcoal italic; }
.tiptap pre { @apply rounded-md bg-tint-gray p-md font-mono text-body-sm overflow-x-auto; }
.tiptap code { @apply rounded-sm bg-tint-gray px-1 py-0.5 text-body-sm; }
.tiptap pre code { @apply bg-transparent p-0; }
.tiptap img { @apply rounded-md max-w-full; }
.tiptap a { @apply text-link underline; }
/* Empty paragraphs anywhere in the doc — show ¶ at 20% opacity */
.tiptap p.is-empty::before {
  content: attr(data-placeholder);
  color: var(--color-stone);
  opacity: 0.2;
  float: left;
  height: 0;
  pointer-events: none;
}
/* Doc-level hint on the first empty line — slightly more readable */
.tiptap p.is-editor-empty:first-child::before {
  opacity: 0.5;
}

/* ProseMirror gap-cursor: shown between atom blocks (image, sectionRef,
 * moduleRef) where a regular text cursor can't go. Default styling is a
 * thin near-invisible horizontal line that looks like a rendering glitch.
 * Make it a clear primary-colored caret-line so the user can see where
 * a new block will be inserted on Enter / typing. */
.ProseMirror-gapcursor::after {
  border-top: 2px solid var(--color-primary) !important;
  width: 80px !important;
  margin-top: -1px;
  animation: mo-gapcursor-blink 1s steps(2, start) infinite;
}
@keyframes mo-gapcursor-blink {
  to { opacity: 0; }
}
/* Task-list styles live in global.css — the editor and public renderer
 * share the same DOM and need identical look. */
.tiptap iframe { @apply rounded-md max-w-full; }

/* Block drag-handle (Notion-style). Mounted on <body> with position: fixed
 * so the offset is computed against the viewport — independent of any
 * transformed/scrolled ancestor. */
.mo-block-handle {
  position: fixed;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 6px;
  background: transparent;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s ease;
  z-index: 50;
}
.mo-block-handle--visible { opacity: 1; pointer-events: auto; }
.mo-block-handle__btn {
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 22px;
  border-radius: 3px;
  color: var(--color-stone);
  background: transparent;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.mo-block-handle__btn:hover {
  background: var(--color-surface);
  color: var(--color-charcoal);
}
.mo-block-handle__grip { cursor: grab; }
.mo-block-handle__grip:active { cursor: grabbing; }

.mo-block-droppos {
  position: fixed;
  display: none;
  height: 3px;
  background: var(--color-primary);
  border-radius: 2px;
  pointer-events: none;
  z-index: 49;
  box-shadow: 0 0 0 1px rgba(86, 69, 212, 0.2);
}

body.mo-dragging-block { cursor: grabbing !important; }
body.mo-dragging-block * { cursor: grabbing !important; }

/* Columns layout — actual grid template + alignment is set inline by the
 * NodeView from columnWidths / verticalAlign. CSS in global.css covers the
 * shared bits (gap, mobile collapse, resize handle). No padding/outline on
 * .mo-column — keep them visually transparent inside the editor. */
</style>
