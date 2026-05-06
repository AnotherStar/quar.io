<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor: Editor
  disableSectionRefs?: boolean
}>()

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

// Overload signatures: pass node name + attrs, or just attrs object (no name).
function isActive(name: string, attrs?: Record<string, unknown>): boolean
function isActive(attrs: Record<string, unknown>): boolean
function isActive(a: any, b?: any) {
  return typeof a === 'string' ? props.editor.isActive(a, b) : props.editor.isActive(a)
}

function btnClass(active: boolean) {
  return [
    'inline-flex h-8 min-w-[32px] items-center justify-center gap-1 rounded-sm px-1.5 text-body-sm transition-colors',
    active ? 'bg-ink-deep text-white' : 'text-charcoal hover:bg-surface'
  ]
}
</script>

<template>
  <div class="sticky top-0 z-10 -mx-lg -mt-lg mb-md flex flex-wrap items-center gap-1 border-b border-hairline bg-canvas/95 px-lg py-2 backdrop-blur">
    <!-- Heading -->
    <div class="relative">
      <button type="button" :class="btnClass(isActive('heading'))" title="Заголовок" @click="showHeadings = !showHeadings; showSafety = false">
        <Icon name="lucide:heading" class="h-4 w-4" />
        <Icon name="lucide:chevron-down" class="h-3 w-3" />
      </button>
      <div v-if="showHeadings" class="absolute left-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-md border border-hairline bg-canvas shadow-modal">
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface" @click="editor.chain().focus().setParagraph().run(); showHeadings = false">
          <Icon name="lucide:pilcrow" class="h-4 w-4 text-steel" /> Текст
        </button>
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface" @click="editor.chain().focus().setHeading({ level: 1 }).run(); showHeadings = false">
          <Icon name="lucide:heading-1" class="h-4 w-4 text-steel" /> Заголовок 1
        </button>
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface" @click="editor.chain().focus().setHeading({ level: 2 }).run(); showHeadings = false">
          <Icon name="lucide:heading-2" class="h-4 w-4 text-steel" /> Заголовок 2
        </button>
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface" @click="editor.chain().focus().setHeading({ level: 3 }).run(); showHeadings = false">
          <Icon name="lucide:heading-3" class="h-4 w-4 text-steel" /> Заголовок 3
        </button>
      </div>
    </div>

    <span class="mx-1 h-5 w-px bg-hairline" />

    <button type="button" :class="btnClass(isActive('bold'))" title="Жирный (⌘B)" @click="editor.chain().focus().toggleBold().run()"><Icon name="lucide:bold" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(isActive('italic'))" title="Курсив (⌘I)" @click="editor.chain().focus().toggleItalic().run()"><Icon name="lucide:italic" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(isActive('strike'))" title="Зачёркнутый" @click="editor.chain().focus().toggleStrike().run()"><Icon name="lucide:strikethrough" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(isActive('code'))" title="Inline код" @click="editor.chain().focus().toggleCode().run()"><Icon name="lucide:code" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(isActive('link'))" title="Ссылка" @click="setLink"><Icon name="lucide:link" class="h-4 w-4" /></button>

    <span class="mx-1 h-5 w-px bg-hairline" />

    <button type="button" :class="btnClass(isActive('bulletList'))" title="Маркированный список" @click="editor.chain().focus().toggleBulletList().run()"><Icon name="lucide:list" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(isActive('orderedList'))" title="Нумерованный список" @click="editor.chain().focus().toggleOrderedList().run()"><Icon name="lucide:list-ordered" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(isActive('taskList'))" title="Чек-лист" @click="editor.chain().focus().toggleTaskList().run()"><Icon name="lucide:list-checks" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(isActive('blockquote'))" title="Цитата" @click="editor.chain().focus().toggleBlockquote().run()"><Icon name="lucide:quote" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(isActive('codeBlock'))" title="Блок кода" @click="editor.chain().focus().toggleCodeBlock().run()"><Icon name="lucide:square-code" class="h-4 w-4" /></button>

    <span class="mx-1 h-5 w-px bg-hairline" />

    <button type="button" :class="btnClass(isActive({ textAlign: 'left' }))" title="По левому краю" @click="editor.chain().focus().setTextAlign('left').run()"><Icon name="lucide:align-left" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(isActive({ textAlign: 'center' }))" title="По центру" @click="editor.chain().focus().setTextAlign('center').run()"><Icon name="lucide:align-center" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(isActive({ textAlign: 'right' }))" title="По правому краю" @click="editor.chain().focus().setTextAlign('right').run()"><Icon name="lucide:align-right" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(isActive({ textAlign: 'justify' }))" title="По ширине" @click="editor.chain().focus().setTextAlign('justify').run()"><Icon name="lucide:align-justify" class="h-4 w-4" /></button>

    <span class="mx-1 h-5 w-px bg-hairline" />

    <button type="button" :class="btnClass(false)" title="Загрузить картинку" @click="uploadImage"><Icon name="lucide:image" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(false)" title="YouTube" @click="uploadVideo"><Icon name="lucide:youtube" class="h-4 w-4" /></button>

    <!-- Safety blocks -->
    <div class="relative">
      <button type="button" :class="btnClass(isActive('safetyBlock'))" title="Блок безопасности" @click="showSafety = !showSafety; showHeadings = false">
        <Icon name="lucide:triangle-alert" class="h-4 w-4" />
        <Icon name="lucide:chevron-down" class="h-3 w-3" />
      </button>
      <div v-if="showSafety" class="absolute left-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-md border border-hairline bg-canvas shadow-modal">
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface" @click="editor.chain().focus().setSafetyBlock('info').run(); showSafety = false">
          <Icon name="lucide:info" class="h-4 w-4 text-link" /> Информация
        </button>
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface" @click="editor.chain().focus().setSafetyBlock('warning').run(); showSafety = false">
          <Icon name="lucide:triangle-alert" class="h-4 w-4 text-warning" /> Внимание
        </button>
        <button type="button" class="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm hover:bg-surface" @click="editor.chain().focus().setSafetyBlock('danger').run(); showSafety = false">
          <Icon name="lucide:octagon-x" class="h-4 w-4 text-error" /> Опасно
        </button>
      </div>
    </div>

    <span class="mx-1 h-5 w-px bg-hairline" />

    <template v-if="!disableSectionRefs">
      <button type="button" :class="[btnClass(false), 'px-2 gap-1.5']" title="Вставить секцию" @click="editor.chain().focus().insertSectionRef().run()">
        <Icon name="lucide:blocks" class="h-4 w-4" />
        <span class="text-body-sm">Секция</span>
      </button>
      <button type="button" :class="[btnClass(false), 'px-2 gap-1.5']" title="Вставить модуль" @click="editor.chain().focus().insertModuleRef().run()">
        <Icon name="lucide:puzzle" class="h-4 w-4" />
        <span class="text-body-sm">Модуль</span>
      </button>
    </template>

    <span class="mx-1 h-5 w-px bg-hairline" />

    <button type="button" :class="btnClass(false)" title="Отменить (⌘Z)" @click="editor.chain().focus().undo().run()"><Icon name="lucide:undo-2" class="h-4 w-4" /></button>
    <button type="button" :class="btnClass(false)" title="Повторить (⌘⇧Z)" @click="editor.chain().focus().redo().run()"><Icon name="lucide:redo-2" class="h-4 w-4" /></button>
  </div>
</template>
