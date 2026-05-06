<script setup lang="ts">
// Read-only renderer for a published TipTap doc.
// Uses the same TipTap setup as the editor but in non-editable mode,
// preserves block ids (data-block-id) for analytics + feedback widget targeting.
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Youtube from '@tiptap/extension-youtube'
import { BlockId } from '~/components/editor/extensions/BlockId'
import { SafetyBlock } from '~/components/editor/extensions/SafetyBlock'
import { SectionRefPublic } from '~/components/editor/extensions/SectionRefPublic'
import { ModuleRefPublic } from '~/components/editor/extensions/ModuleRefPublic'
import { ResizableImage } from '~/components/editor/extensions/ResizableImage'
import { Columns, Column } from '~/components/editor/extensions/Columns'

const props = defineProps<{ content: object }>()

const editor = useEditor({
  content: props.content,
  editable: false,
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    ResizableImage,
    Link.configure({ openOnClick: true }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Youtube.configure({ controls: true, nocookie: true, width: 720, height: 405 }),
    SafetyBlock,
    SectionRefPublic,
    ModuleRefPublic,
    Columns,
    Column,
    BlockId
  ]
})

watch(() => props.content, (val) => {
  if (editor.value && val) editor.value.commands.setContent(val as object, false)
})

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <EditorContent :editor="editor" />
</template>
