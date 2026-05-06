<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{ editor: Editor }>()

const showHeadings = ref(false)
const showSafety = ref(false)

function uploadImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const { url } = await uploadFile(file)
      props.editor.chain().focus().setImage({ src: url }).run()
    } catch (e) {
      alert('Не удалось загрузить: ' + (e as Error).message)
    }
  }
  input.click()
}

function uploadVideo() {
  const url = prompt('Ссылка на YouTube:')
  if (url) props.editor.chain().focus().setYoutubeVideo({ src: url }).run()
}

function setLink() {
  const url = prompt('URL ссылки:', props.editor.getAttributes('link').href)
  if (url === null) return
  if (url === '') props.editor.chain().focus().unsetLink().run()
  else props.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}

const isActive = (name: string, attrs?: Record<string, unknown>) =>
  props.editor.isActive(name, attrs)

function btnClass(active: boolean) {
  return [
    'grid h-8 min-w-[32px] place-items-center rounded-sm px-2 text-body-sm-md transition-colors',
    active ? 'bg-ink-deep text-white' : 'text-charcoal hover:bg-surface'
  ]
}
</script>

<template>
  <div class="sticky top-0 z-10 -mx-lg -mt-lg mb-md flex flex-wrap items-center gap-1 border-b border-hairline bg-canvas/95 px-lg py-2 backdrop-blur">
    <!-- Heading -->
    <div class="relative">
      <button type="button" :class="btnClass(isActive('heading'))" @click="showHeadings = !showHeadings; showSafety = false">
        H ▾
      </button>
      <div v-if="showHeadings" class="absolute left-0 top-full mt-1 w-40 overflow-hidden rounded-md border border-hairline bg-canvas shadow-card">
        <button type="button" class="block w-full px-3 py-2 text-left text-body-sm hover:bg-surface" @click="editor.chain().focus().setParagraph().run(); showHeadings = false">¶ Текст</button>
        <button type="button" class="block w-full px-3 py-2 text-left text-h5 hover:bg-surface" @click="editor.chain().focus().setHeading({ level: 1 }).run(); showHeadings = false">Заголовок 1</button>
        <button type="button" class="block w-full px-3 py-2 text-left text-body-md hover:bg-surface" @click="editor.chain().focus().setHeading({ level: 2 }).run(); showHeadings = false">Заголовок 2</button>
        <button type="button" class="block w-full px-3 py-2 text-left text-body-sm hover:bg-surface" @click="editor.chain().focus().setHeading({ level: 3 }).run(); showHeadings = false">Заголовок 3</button>
      </div>
    </div>

    <span class="mx-1 h-5 w-px bg-hairline" />

    <button type="button" :class="btnClass(isActive('bold'))" title="Жирный (⌘B)" @click="editor.chain().focus().toggleBold().run()"><strong>B</strong></button>
    <button type="button" :class="btnClass(isActive('italic'))" title="Курсив (⌘I)" @click="editor.chain().focus().toggleItalic().run()"><em>I</em></button>
    <button type="button" :class="btnClass(isActive('strike'))" title="Зачёркнутый" @click="editor.chain().focus().toggleStrike().run()"><s>S</s></button>
    <button type="button" :class="btnClass(isActive('code'))" title="Inline код" @click="editor.chain().focus().toggleCode().run()">{'<>'}</button>
    <button type="button" :class="btnClass(isActive('link'))" title="Ссылка" @click="setLink">🔗</button>

    <span class="mx-1 h-5 w-px bg-hairline" />

    <button type="button" :class="btnClass(isActive('bulletList'))" title="Маркированный список" @click="editor.chain().focus().toggleBulletList().run()">•</button>
    <button type="button" :class="btnClass(isActive('orderedList'))" title="Нумерованный список" @click="editor.chain().focus().toggleOrderedList().run()">1.</button>
    <button type="button" :class="btnClass(isActive('taskList'))" title="Чек-лист" @click="editor.chain().focus().toggleTaskList().run()">☐</button>
    <button type="button" :class="btnClass(isActive('blockquote'))" title="Цитата" @click="editor.chain().focus().toggleBlockquote().run()">❝</button>
    <button type="button" :class="btnClass(isActive('codeBlock'))" title="Блок кода" @click="editor.chain().focus().toggleCodeBlock().run()">{ }</button>

    <span class="mx-1 h-5 w-px bg-hairline" />

    <button type="button" :class="btnClass(false)" title="Загрузить картинку" @click="uploadImage">🖼</button>
    <button type="button" :class="btnClass(false)" title="YouTube" @click="uploadVideo">▶</button>

    <!-- Safety blocks -->
    <div class="relative">
      <button type="button" :class="btnClass(isActive('safetyBlock'))" @click="showSafety = !showSafety; showHeadings = false">
        ⚠ ▾
      </button>
      <div v-if="showSafety" class="absolute left-0 top-full mt-1 w-44 overflow-hidden rounded-md border border-hairline bg-canvas shadow-card">
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface" @click="editor.chain().focus().setSafetyBlock('info').run(); showSafety = false">ℹ️ Информация</button>
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface" @click="editor.chain().focus().setSafetyBlock('warning').run(); showSafety = false">⚠️ Внимание</button>
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface" @click="editor.chain().focus().setSafetyBlock('danger').run(); showSafety = false">⛔ Опасно</button>
      </div>
    </div>

    <span class="mx-1 h-5 w-px bg-hairline" />

    <button type="button" :class="btnClass(false)" title="Отменить (⌘Z)" @click="editor.chain().focus().undo().run()">↶</button>
    <button type="button" :class="btnClass(false)" title="Повторить" @click="editor.chain().focus().redo().run()">↷</button>

    <span class="ml-auto text-caption text-steel">или нажмите <kbd class="rounded-sm border border-hairline bg-surface px-1">/</kbd> для меню</span>
  </div>
</template>
