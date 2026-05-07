<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'

const props = defineProps<{
  editor: Editor
  disableSectionRefs?: boolean
}>()
const open = ref(false)
const position = ref({ top: 0, left: 0 })
const search = ref('')
const selectedIndex = ref(0)

interface Cmd {
  id: string
  title: string
  hint: string
  icon: string
  run: (e: Editor) => void
}

const COMMANDS: Cmd[] = [
  { id: 'h1', title: 'Заголовок 1', hint: 'Большой заголовок', icon: 'lucide:heading-1', run: (e) => e.chain().focus().deleteRange(currentRange.value!).setHeading({ level: 1 }).run() },
  { id: 'h2', title: 'Заголовок 2', hint: 'Средний заголовок', icon: 'lucide:heading-2', run: (e) => e.chain().focus().deleteRange(currentRange.value!).setHeading({ level: 2 }).run() },
  { id: 'h3', title: 'Заголовок 3', hint: 'Маленький заголовок', icon: 'lucide:heading-3', run: (e) => e.chain().focus().deleteRange(currentRange.value!).setHeading({ level: 3 }).run() },
  { id: 'p', title: 'Текст', hint: 'Обычный абзац', icon: 'lucide:pilcrow', run: (e) => e.chain().focus().deleteRange(currentRange.value!).setParagraph().run() },
  { id: 'ul', title: 'Список', hint: 'Маркированный список', icon: 'lucide:list', run: (e) => e.chain().focus().deleteRange(currentRange.value!).toggleBulletList().run() },
  { id: 'ol', title: 'Нумерованный', hint: '1. 2. 3.', icon: 'lucide:list-ordered', run: (e) => e.chain().focus().deleteRange(currentRange.value!).toggleOrderedList().run() },
  { id: 'todo', title: 'Чек-лист', hint: 'Список задач', icon: 'lucide:list-checks', run: (e) => e.chain().focus().deleteRange(currentRange.value!).toggleTaskList().run() },
  { id: 'quote', title: 'Цитата', hint: 'Выделенный блок', icon: 'lucide:quote', run: (e) => e.chain().focus().deleteRange(currentRange.value!).toggleBlockquote().run() },
  { id: 'code', title: 'Код', hint: 'Блок кода', icon: 'lucide:square-code', run: (e) => e.chain().focus().deleteRange(currentRange.value!).toggleCodeBlock().run() },
  { id: 'safety-info', title: 'Блок: Информация', hint: 'Информационный блок', icon: 'lucide:info', run: (e) => e.chain().focus().deleteRange(currentRange.value!).setSafetyBlock('info').run() },
  { id: 'safety-warn', title: 'Блок: Внимание', hint: 'Предупреждение', icon: 'lucide:triangle-alert', run: (e) => e.chain().focus().deleteRange(currentRange.value!).setSafetyBlock('warning').run() },
  { id: 'safety-danger', title: 'Блок: Опасно', hint: 'Критическая опасность', icon: 'lucide:octagon-x', run: (e) => e.chain().focus().deleteRange(currentRange.value!).setSafetyBlock('danger').run() },
  { id: 'section-ref', title: 'Секция', hint: 'Вставить переиспользуемую секцию', icon: 'lucide:blocks', run: (e) => e.chain().focus().deleteRange(currentRange.value!).insertSectionRef().run() },
  { id: 'module-ref', title: 'Модуль', hint: 'Вставить модуль (гарантия, чат...)', icon: 'lucide:puzzle', run: (e) => e.chain().focus().deleteRange(currentRange.value!).insertModuleRef().run() },
  { id: 'table', title: 'Таблица', hint: 'Таблица 3×3 с шапкой', icon: 'lucide:table', run: (e) => e.chain().focus().deleteRange(currentRange.value!).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: 'image', title: 'Изображение', hint: 'Загрузить картинку', icon: 'lucide:image', run: () => triggerImageUpload() },
  { id: 'youtube', title: 'YouTube', hint: 'Встроить видео', icon: 'lucide:youtube', run: (e) => {
    const url = prompt('Ссылка на YouTube:')
    if (url) e.chain().focus().deleteRange(currentRange.value!).setYoutubeVideo({ src: url }).run()
  } }
]

const filtered = computed(() => {
  const q = search.value.toLowerCase()
  const base = props.disableSectionRefs
    ? COMMANDS.filter((c) => c.id !== 'section-ref' && c.id !== 'module-ref')
    : COMMANDS
  if (!q) return base
  return base.filter((c) => c.title.toLowerCase().includes(q) || c.hint.toLowerCase().includes(q))
})

const currentRange = ref<{ from: number; to: number } | null>(null)

function detectSlash() {
  const { state } = props.editor
  const { from } = state.selection
  const lineStart = state.doc.resolve(from).start()
  const text = state.doc.textBetween(lineStart, from, '\n', '\0')
  const match = text.match(/(?:^|\s)\/([^\s/]*)$/)
  if (match) {
    search.value = match[1]
    selectedIndex.value = 0
    currentRange.value = { from: from - match[0].length + (match[0].startsWith(' ') ? 1 : 0), to: from }
    open.value = true
    nextTick(updatePosition)
  } else {
    open.value = false
  }
}

function updatePosition() {
  const { from } = props.editor.state.selection
  const coords = props.editor.view.coordsAtPos(from)
  position.value = { top: coords.bottom + 6, left: coords.left }
}

function pick(cmd: Cmd) {
  cmd.run(props.editor)
  open.value = false
}

function triggerImageUpload() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const { url } = await uploadFile(file)
      props.editor.chain().focus().deleteRange(currentRange.value!).setImage({ src: url }).run()
    } catch (e) {
      alert('Не удалось загрузить: ' + (e as Error).message)
    }
  }
  input.click()
}

function onKeyDown(e: KeyboardEvent) {
  if (!open.value) return
  if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex.value = (selectedIndex.value + 1) % filtered.value.length }
  else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex.value = (selectedIndex.value - 1 + filtered.value.length) % filtered.value.length }
  else if (e.key === 'Enter') { e.preventDefault(); const cmd = filtered.value[selectedIndex.value]; if (cmd) pick(cmd) }
  else if (e.key === 'Escape') { open.value = false }
}

onMounted(() => {
  props.editor.on('update', detectSlash)
  props.editor.on('selectionUpdate', detectSlash)
  document.addEventListener('keydown', onKeyDown, true)
})
onBeforeUnmount(() => {
  props.editor.off('update', detectSlash)
  props.editor.off('selectionUpdate', detectSlash)
  document.removeEventListener('keydown', onKeyDown, true)
})
</script>

<template>
  <div
    v-if="open && filtered.length"
    class="fixed z-50 w-[260px] overflow-hidden rounded-md border border-hairline bg-canvas shadow-modal"
    :style="{ top: position.top + 'px', left: position.left + 'px' }"
  >
    <ul class="max-h-[280px] overflow-y-auto py-1">
      <li
        v-for="(cmd, i) in filtered"
        :key="cmd.id"
        :class="['flex cursor-pointer items-center gap-3 px-3 py-2', selectedIndex === i ? 'bg-surface' : '']"
        @mousedown.prevent="pick(cmd)"
        @mouseenter="selectedIndex = i"
      >
        <span class="grid h-7 w-7 place-items-center rounded-sm bg-surface text-charcoal">
          <Icon :name="cmd.icon" class="h-4 w-4" />
        </span>
        <div class="flex-1 min-w-0">
          <p class="text-body-sm-md text-ink truncate">{{ cmd.title }}</p>
          <p class="text-caption text-steel truncate">{{ cmd.hint }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>
