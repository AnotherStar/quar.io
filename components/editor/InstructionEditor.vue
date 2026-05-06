<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Youtube from '@tiptap/extension-youtube'
import { BlockId } from './extensions/BlockId'
import { SafetyBlock } from './extensions/SafetyBlock'
import { SectionRef } from './extensions/SectionRef'
import { ModuleRef } from './extensions/ModuleRef'
import { ResizableImage } from './extensions/ResizableImage'
import { Columns, Column } from './extensions/Columns'
import SlashMenu from './SlashMenu.vue'
import type { TiptapDoc } from '~~/shared/types/instruction'

const props = defineProps<{
  modelValue: TiptapDoc | object
  placeholder?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: object] }>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Placeholder.configure({ placeholder: props.placeholder ?? 'Введите «/» для команд...' }),
    ResizableImage,
    Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-link underline' } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Youtube.configure({ controls: true, nocookie: true, width: 720, height: 405 }),
    SafetyBlock,
    SectionRef,
    ModuleRef,
    Columns,
    Column,
    BlockId
  ],
  editorProps: {
    attributes: {
      class: 'tiptap focus:outline-none min-h-[400px]'
    }
  },
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getJSON())
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

defineExpose({ editor })
</script>

<template>
  <div class="relative">
    <EditorToolbar v-if="editor" :editor="editor" />
    <EditorContent :editor="editor" />
    <SlashMenu v-if="editor" :editor="editor" />
  </div>
</template>

<style>
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
.tiptap p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  @apply text-stone float-left h-0 pointer-events-none;
}
.tiptap ul[data-type='taskList'] { @apply list-none pl-0; }
.tiptap ul[data-type='taskList'] li { @apply flex items-start gap-2; }
.tiptap ul[data-type='taskList'] li > label { @apply mt-1; }
.tiptap iframe { @apply rounded-md max-w-full; }

.tiptap .mo-columns,
.mo-columns {
  display: grid;
  grid-template-columns: repeat(var(--mo-cols, 2), minmax(0, 1fr));
  gap: 16px;
  margin: 0.75em 0;
}
.tiptap .mo-column,
.mo-column { min-width: 0; }
/* Editor: visualize column boundaries subtly */
.tiptap .mo-column {
  border-radius: 6px;
  padding: 6px 8px;
  outline: 1px dashed var(--color-hairline);
  outline-offset: -2px;
}
@media (max-width: 640px) {
  .tiptap .mo-columns,
  .mo-columns { grid-template-columns: 1fr; }
}
</style>
