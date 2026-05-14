<script setup lang="ts">
import type { Editor } from '@tiptap/vue-3'
import { onClickOutside } from '@vueuse/core'

const props = defineProps<{
  editor: Editor
  disableSectionRefs?: boolean
}>()

const showHeadings = ref(false)
const showSafety = ref(false)
const showTable = ref(false)
const showSectionsMenu = ref(false)
const showModulesMenu = ref(false)
const showHighlight = ref(false)

function closeMenus() {
  showHeadings.value = false
  showSafety.value = false
  showTable.value = false
  showSectionsMenu.value = false
  showModulesMenu.value = false
  showHighlight.value = false
}

const HIGHLIGHT_COLORS: Array<{ key: string; label: string; color: string }> = [
  { key: 'yellow',   label: 'Жёлтый',    color: '#fef7d6' },
  { key: 'mint',     label: 'Мятный',    color: '#d9f3e1' },
  { key: 'sky',      label: 'Голубой',   color: '#dcecfa' },
  { key: 'peach',    label: 'Персик',    color: '#ffe8d4' },
  { key: 'rose',     label: 'Розовый',   color: '#fde0ec' },
  { key: 'lavender', label: 'Лавандовый', color: '#e6e0f5' }
]

function applyHighlight(color: string) {
  props.editor.chain().focus().setHighlight({ color }).run()
  closeMenus()
}

function removeHighlight() {
  props.editor.chain().focus().unsetHighlight().run()
  closeMenus()
}

/** Очистка форматирования у выделения: убирает inline-marks (B/I/S/code/
 * link/highlight) и приводит блочные ноды обратно к paragraph. */
function clearFormatting() {
  props.editor.chain().focus().unsetAllMarks().clearNodes().run()
}

interface SectionRow { id: string; name: string }
interface ModuleRow {
  id: string
  code: string
  name: string
  allowedByPlan: boolean
  tenantConfig: { id: string; enabled: boolean; config?: Record<string, unknown> } | null
}

const sectionsList = ref<SectionRow[]>([])
const modulesList = ref<ModuleRow[]>([])

const api = useApi()

onMounted(async () => {
  // Грузим списки секций и модулей сразу — popover с picker'ами должен
  // открываться без задержки. В случае ошибки молча оставляем пустой список,
  // у picker'а есть свой empty-state.
  try {
    const [s, m] = await Promise.all([
      api<{ sections: SectionRow[] }>('/api/sections').catch(() => ({ sections: [] })),
      api<{ modules: ModuleRow[] }>('/api/modules').catch(() => ({ modules: [] }))
    ])
    sectionsList.value = s.sections ?? []
    modulesList.value = (m.modules ?? []).filter((mod) => mod.allowedByPlan)
  } catch {
    // noop
  }
})

function insertSection(id: string) {
  props.editor.chain().focus().insertSectionRef(id).run()
  closeMenus()
}

async function ensureModuleEnabled(module: ModuleRow) {
  if (module.tenantConfig?.enabled && module.tenantConfig.id) return module.tenantConfig.id
  const res = await api<{ tenantConfig: { id: string; enabled: boolean; config?: Record<string, unknown> } }>(
    `/api/modules/${module.code}`,
    { method: 'PUT', body: { enabled: true, config: module.tenantConfig?.config ?? {} } }
  )
  module.tenantConfig = res.tenantConfig
  return res.tenantConfig.id
}

async function insertModule(module: ModuleRow) {
  const tenantConfigId = await ensureModuleEnabled(module)
  props.editor.chain().focus().insertModuleRef(tenantConfigId).run()
  closeMenus()
}

/** Открыть один popover, попутно закрыв остальные. Повторный клик по тому
 * же trigger'у — закрывает. Используется во всех dropdown-кнопках тулбара,
 * чтобы клик по соседнему trigger'у автоматически закрыл предыдущий. */
function togglePopover(name: 'table' | 'safety' | 'headings' | 'sections' | 'modules' | 'highlight') {
  const wasOpen
    = (name === 'table' && showTable.value)
    || (name === 'safety' && showSafety.value)
    || (name === 'headings' && showHeadings.value)
    || (name === 'sections' && showSectionsMenu.value)
    || (name === 'modules' && showModulesMenu.value)
    || (name === 'highlight' && showHighlight.value)
  closeMenus()
  if (wasOpen) return
  if (name === 'table') showTable.value = true
  if (name === 'safety') showSafety.value = true
  if (name === 'headings') showHeadings.value = true
  if (name === 'sections') showSectionsMenu.value = true
  if (name === 'modules') showModulesMenu.value = true
  if (name === 'highlight') showHighlight.value = true
}

/** Закрытие dropdown'ов при клике снаружи тулбара. Проверяем ВСЕ
 * флаги попап'ов — если добавляешь новый, не забудь дописать сюда (или
 * перепиши условие как `if (anyMenuOpen())`). */
const toolbarRef = ref<HTMLElement | null>(null)
onClickOutside(toolbarRef, () => {
  if (
    showHeadings.value
    || showSafety.value
    || showTable.value
    || showSectionsMenu.value
    || showModulesMenu.value
    || showHighlight.value
  ) closeMenus()
})

function insertTable() {
  props.editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  showTable.value = false
}

/** Word-style picker размера таблицы: сетка 8×8 ячеек, при наведении
 * подсвечивает прямоугольник от верхнего-левого угла до cell под курсором,
 * по клику вставляет таблицу с этим размером. */
const TABLE_GRID_ROWS = 8
const TABLE_GRID_COLS = 8
const tableHover = ref({ row: -1, col: -1 })

const tableGridCells = computed(() => {
  const cells: Array<{ row: number; col: number }> = []
  for (let r = 0; r < TABLE_GRID_ROWS; r++) {
    for (let c = 0; c < TABLE_GRID_COLS; c++) cells.push({ row: r, col: c })
  }
  return cells
})

const tableHoverSize = computed(() => {
  const { row, col } = tableHover.value
  return row < 0 || col < 0 ? 'Размер таблицы' : `${row + 1} × ${col + 1}`
})

function isCellHighlighted(r: number, c: number) {
  return r <= tableHover.value.row && c <= tableHover.value.col
}

function setTableHover(r: number, c: number) {
  tableHover.value = { row: r, col: c }
}

function clearTableHover() {
  tableHover.value = { row: -1, col: -1 }
}

function insertTableSized(rows: number, cols: number) {
  props.editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
  closeMenus()
  clearTableHover()
}

function uploadImage() {
  const { track } = useTrackGoal()
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return

    // Optimistic placeholder — мгновенно вставляем картинку с локальным blob
    // URL, чтобы пользователь видел её положение и размер ещё до завершения
    // upload'а. После ответа сервера меняем src на постоянный URL.
    const blobUrl = URL.createObjectURL(file)
    props.editor.chain().focus().setImage({ src: blobUrl }).run()

    try {
      const { url } = await uploadFile(file)
      // Заменить src placeholder'а на финальный URL.
      props.editor.commands.command(({ tr, state }) => {
        let replaced = false
        state.doc.descendants((node, pos) => {
          if (replaced) return false
          if (node.type.name === 'image' && node.attrs.src === blobUrl) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: url })
            replaced = true
            return false
          }
        })
        return replaced
      })
      track('editor_image_uploaded', { source: 'toolbar' })
    } catch (e) {
      // Откат — удалить placeholder'а с blob URL.
      props.editor.commands.command(({ tr, state }) => {
        let removed = false
        state.doc.descendants((node, pos) => {
          if (removed) return false
          if (node.type.name === 'image' && node.attrs.src === blobUrl) {
            tr.delete(pos, pos + node.nodeSize)
            removed = true
            return false
          }
        })
        return true
      })
      alert('Не удалось загрузить: ' + (e as Error).message)
    } finally {
      // Освободить blob URL — он либо уже заменён, либо узел удалён.
      URL.revokeObjectURL(blobUrl)
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
    'inline-flex h-8 min-w-[32px] items-center justify-center gap-1 rounded-md px-1.5 text-body-sm transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
    active ? 'bg-canvas text-ink shadow-subtle' : 'text-charcoal hover:bg-hairline'
  ]
}

/** Возвращает chain, на которой можно проверить доступность команды без
 * её выполнения: `chainCan().toggleBold().run()` вернёт true/false. */
function chainCan() {
  return props.editor.can().chain().focus()
}
function canUndo() {
  return props.editor.can().undo()
}
function canRedo() {
  return props.editor.can().redo()
}
function canInsertTable() {
  return props.editor.can().insertTable({ rows: 1, cols: 1, withHeaderRow: false })
}
</script>

<template>
  <div ref="toolbarRef" class="editor-toolbar-bar sticky top-[24px] z-10 flex flex-wrap items-center gap-2">
    <!-- Группа 1: Текст / H1 / H2 / H3 -->
    <div class="toolbar-group">
      <UiTooltip text="Обычный текст">
        <button
          type="button"
          :class="btnClass(isActive('paragraph') && !isActive('heading'))"
          :disabled="!chainCan().setParagraph().run()"
          @click="editor.chain().focus().setParagraph().run()"
        >
          <Icon name="lucide:pilcrow" class="h-4 w-4" />
        </button>
      </UiTooltip>
      <UiTooltip text="Заголовок 1">
        <button
          type="button"
          :class="btnClass(isActive('heading', { level: 1 }))"
          :disabled="!chainCan().toggleHeading({ level: 1 }).run()"
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
        >
          <Icon name="lucide:heading-1" class="h-4 w-4" />
        </button>
      </UiTooltip>
      <UiTooltip text="Заголовок 2">
        <button
          type="button"
          :class="btnClass(isActive('heading', { level: 2 }))"
          :disabled="!chainCan().toggleHeading({ level: 2 }).run()"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        >
          <Icon name="lucide:heading-2" class="h-4 w-4" />
        </button>
      </UiTooltip>
      <UiTooltip text="Заголовок 3">
        <button
          type="button"
          :class="btnClass(isActive('heading', { level: 3 }))"
          :disabled="!chainCan().toggleHeading({ level: 3 }).run()"
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        >
          <Icon name="lucide:heading-3" class="h-4 w-4" />
        </button>
      </UiTooltip>
    </div>

    <!-- Группа 2: inline-стили -->
    <div class="toolbar-group">
      <UiTooltip text="Жирный (⌘B)"><button type="button" :class="btnClass(isActive('bold'))" :disabled="!chainCan().toggleBold().run()" @click="editor.chain().focus().toggleBold().run()"><Icon name="lucide:bold" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="Курсив (⌘I)"><button type="button" :class="btnClass(isActive('italic'))" :disabled="!chainCan().toggleItalic().run()" @click="editor.chain().focus().toggleItalic().run()"><Icon name="lucide:italic" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="Зачёркнутый"><button type="button" :class="btnClass(isActive('strike'))" :disabled="!chainCan().toggleStrike().run()" @click="editor.chain().focus().toggleStrike().run()"><Icon name="lucide:strikethrough" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="Inline код"><button type="button" :class="btnClass(isActive('code'))" :disabled="!chainCan().toggleCode().run()" @click="editor.chain().focus().toggleCode().run()"><Icon name="lucide:code" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="Ссылка"><button type="button" :class="btnClass(isActive('link'))" :disabled="!chainCan().setLink({ href: '' }).run()" @click="setLink"><Icon name="lucide:link" class="h-4 w-4" /></button></UiTooltip>

      <!-- Акцент: подменю с палитрой цветов. -->
      <div class="relative">
        <UiTooltip text="Выделить цветом" :disabled="showHighlight">
          <button
            type="button"
            :class="btnClass(isActive('highlight'))"
            :disabled="!chainCan().setHighlight({ color: HIGHLIGHT_COLORS[0].color }).run()"
            @click="togglePopover('highlight')"
          >
            <Icon name="lucide:highlighter" class="h-4 w-4" />
            <Icon name="lucide:chevron-down" class="h-3 w-3" />
          </button>
        </UiTooltip>
        <div v-if="showHighlight" v-keep-in-viewport class="popover-menu absolute left-0 top-full z-50 mt-2 w-48 rounded-lg p-1">
          <button
            v-for="c in HIGHLIGHT_COLORS"
            :key="c.key"
            type="button"
            class="popover-item"
            @click="applyHighlight(c.color)"
          >
            <span class="h-4 w-4 shrink-0 rounded-sm border border-hairline" :style="{ backgroundColor: c.color }" />
            <span class="truncate">{{ c.label }}</span>
          </button>
          <div class="my-1 h-px bg-hairline" />
          <button
            type="button"
            class="popover-item"
            @click="removeHighlight"
          >
            <Icon name="lucide:eraser" class="h-4 w-4 text-steel" />
            <span>Убрать акцент</span>
          </button>
        </div>
      </div>

      <UiTooltip text="Очистить форматирование">
        <button type="button" :class="btnClass(false)" @click="clearFormatting">
          <Icon name="lucide:remove-formatting" class="h-4 w-4" />
        </button>
      </UiTooltip>
    </div>

    <!-- Группа 3: списки и блоки текста -->
    <div class="toolbar-group">
      <UiTooltip text="Маркированный список"><button type="button" :class="btnClass(isActive('bulletList'))" :disabled="!chainCan().toggleBulletList().run()" @click="editor.chain().focus().toggleBulletList().run()"><Icon name="lucide:list" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="Нумерованный список"><button type="button" :class="btnClass(isActive('orderedList'))" :disabled="!chainCan().toggleOrderedList().run()" @click="editor.chain().focus().toggleOrderedList().run()"><Icon name="lucide:list-ordered" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="Чек-лист"><button type="button" :class="btnClass(isActive('taskList'))" :disabled="!chainCan().toggleTaskList().run()" @click="editor.chain().focus().toggleTaskList().run()"><Icon name="lucide:list-checks" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="Цитата"><button type="button" :class="btnClass(isActive('blockquote'))" :disabled="!chainCan().toggleBlockquote().run()" @click="editor.chain().focus().toggleBlockquote().run()"><Icon name="lucide:quote" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="Блок кода"><button type="button" :class="btnClass(isActive('codeBlock'))" :disabled="!chainCan().toggleCodeBlock().run()" @click="editor.chain().focus().toggleCodeBlock().run()"><Icon name="lucide:square-code" class="h-4 w-4" /></button></UiTooltip>
    </div>

    <!-- Группа 4: выравнивание. Активный по умолчанию — left
         (isActive({ textAlign: 'left' }) учитывает default alignment). -->
    <div class="toolbar-group">
      <UiTooltip text="По левому краю"><button type="button" :class="btnClass(isActive({ textAlign: 'left' }))" :disabled="!chainCan().setTextAlign('left').run()" @click="editor.chain().focus().setTextAlign('left').run()"><Icon name="lucide:align-left" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="По центру"><button type="button" :class="btnClass(isActive({ textAlign: 'center' }))" :disabled="!chainCan().setTextAlign('center').run()" @click="editor.chain().focus().setTextAlign('center').run()"><Icon name="lucide:align-center" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="По правому краю"><button type="button" :class="btnClass(isActive({ textAlign: 'right' }))" :disabled="!chainCan().setTextAlign('right').run()" @click="editor.chain().focus().setTextAlign('right').run()"><Icon name="lucide:align-right" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="По ширине"><button type="button" :class="btnClass(isActive({ textAlign: 'justify' }))" :disabled="!chainCan().setTextAlign('justify').run()" @click="editor.chain().focus().setTextAlign('justify').run()"><Icon name="lucide:align-justify" class="h-4 w-4" /></button></UiTooltip>
    </div>

    <!-- Группа 5: вставка (картинка / видео / таблица / блок безопасности /
         секция / модуль). Самая большая, всё что добавляет новый блок. -->
    <div class="toolbar-group">
      <UiTooltip text="Загрузить картинку"><button type="button" :class="btnClass(false)" @click="uploadImage"><Icon name="lucide:image" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="YouTube"><button type="button" :class="btnClass(false)" @click="uploadVideo"><Icon name="lucide:youtube" class="h-4 w-4" /></button></UiTooltip>

      <!-- Table -->
    <div class="relative">
      <UiTooltip text="Таблица" :disabled="showTable">
        <button
          type="button"
          :class="btnClass(isActive('table'))"
          :disabled="!isActive('table') && !canInsertTable()"
          @click="togglePopover('table')"
        >
          <Icon name="lucide:table" class="h-4 w-4" />
          <Icon name="lucide:chevron-down" class="h-3 w-3" />
        </button>
      </UiTooltip>
      <div v-if="showTable" v-keep-in-viewport class="popover-menu absolute left-0 top-full z-50 mt-2 rounded-lg p-2">
        <!-- Размер-picker для вставки новой таблицы (только если не внутри). -->
        <div v-if="!isActive('table')" class="p-1" @mouseleave="clearTableHover">
          <div class="mb-2 px-1 text-caption-bold uppercase tracking-wide text-steel">
            {{ tableHoverSize }}
          </div>
          <div
            class="grid gap-[2px]"
            :style="{ gridTemplateColumns: `repeat(${TABLE_GRID_COLS}, 18px)` }"
          >
            <button
              v-for="cell in tableGridCells"
              :key="`${cell.row}-${cell.col}`"
              type="button"
              :class="['h-[18px] w-[18px] rounded-[3px] border transition-colors',
                isCellHighlighted(cell.row, cell.col)
                  ? 'border-primary bg-primary/25'
                  : 'border-hairline bg-canvas hover:border-hairline-strong']"
              @mouseenter="setTableHover(cell.row, cell.col)"
              @click="insertTableSized(cell.row + 1, cell.col + 1)"
            />
          </div>
        </div>
        <template v-if="isActive('table')">
          <button type="button" class="popover-item" @click="editor.chain().focus().addRowBefore().run(); closeMenus()">
            <Icon name="lucide:arrow-up" class="h-4 w-4 text-steel" /> Строка выше
          </button>
          <button type="button" class="popover-item" @click="editor.chain().focus().addRowAfter().run(); closeMenus()">
            <Icon name="lucide:arrow-down" class="h-4 w-4 text-steel" /> Строка ниже
          </button>
          <button type="button" class="popover-item" @click="editor.chain().focus().deleteRow().run(); closeMenus()">
            <Icon name="lucide:trash-2" class="h-4 w-4 text-error" /> Удалить строку
          </button>
          <div class="my-1 h-px bg-hairline" />
          <button type="button" class="popover-item" @click="editor.chain().focus().addColumnBefore().run(); closeMenus()">
            <Icon name="lucide:arrow-left" class="h-4 w-4 text-steel" /> Столбец слева
          </button>
          <button type="button" class="popover-item" @click="editor.chain().focus().addColumnAfter().run(); closeMenus()">
            <Icon name="lucide:arrow-right" class="h-4 w-4 text-steel" /> Столбец справа
          </button>
          <button type="button" class="popover-item" @click="editor.chain().focus().deleteColumn().run(); closeMenus()">
            <Icon name="lucide:trash-2" class="h-4 w-4 text-error" /> Удалить столбец
          </button>
          <div class="my-1 h-px bg-hairline" />
          <button type="button" class="popover-item" @click="editor.chain().focus().toggleHeaderRow().run(); closeMenus()">
            <Icon name="lucide:heading" class="h-4 w-4 text-steel" /> Шапка строки
          </button>
          <button type="button" class="popover-item" @click="editor.chain().focus().mergeOrSplit().run(); closeMenus()">
            <Icon name="lucide:merge" class="h-4 w-4 text-steel" /> Объединить / разделить
          </button>
          <button type="button" class="popover-item" @click="editor.chain().focus().deleteTable().run(); closeMenus()">
            <Icon name="lucide:trash-2" class="h-4 w-4 text-error" /> Удалить таблицу
          </button>
        </template>
      </div>
    </div>

    <!-- Safety blocks -->
    <div class="relative">
      <UiTooltip text="Блок безопасности" :disabled="showSafety">
        <button type="button" :class="btnClass(isActive('safetyBlock'))" @click="togglePopover('safety')">
          <Icon name="lucide:triangle-alert" class="h-4 w-4" />
          <Icon name="lucide:chevron-down" class="h-3 w-3" />
        </button>
      </UiTooltip>
      <div v-if="showSafety" v-keep-in-viewport class="popover-menu absolute left-0 top-full z-50 mt-2 w-44 rounded-lg p-1">
        <button type="button" class="popover-item" @click="editor.chain().focus().setSafetyBlock('info').run(); showSafety = false">
          <Icon name="lucide:info" class="h-4 w-4 text-link" /> Информация
        </button>
        <button type="button" class="popover-item" @click="editor.chain().focus().setSafetyBlock('warning').run(); showSafety = false">
          <Icon name="lucide:triangle-alert" class="h-4 w-4 text-warning" /> Внимание
        </button>
        <button type="button" class="popover-item" @click="editor.chain().focus().setSafetyBlock('danger').run(); showSafety = false">
          <Icon name="lucide:octagon-x" class="h-4 w-4 text-error" /> Опасно
        </button>
      </div>
    </div>

      <template v-if="!disableSectionRefs">
      <!-- Секция: подменю со списком переиспользуемых секций, при клике
           вставляется сразу с указанным sectionId. -->
      <div class="relative">
        <UiTooltip text="Вставить секцию" :disabled="showSectionsMenu">
          <button type="button" :class="[btnClass(false), 'px-2 gap-1.5']" @click="togglePopover('sections')">
            <Icon name="lucide:blocks" class="h-4 w-4" />
            <span class="text-body-sm">Секция</span>
            <Icon name="lucide:chevron-down" class="h-3 w-3" />
          </button>
        </UiTooltip>
        <div v-if="showSectionsMenu" v-keep-in-viewport class="popover-menu absolute left-0 top-full z-50 mt-2 w-64 max-h-[320px] overflow-y-auto rounded-lg p-1">
          <button
            v-for="s in sectionsList"
            :key="s.id"
            type="button"
            class="popover-item"
            @click="insertSection(s.id)"
          >
            <Icon name="lucide:blocks" class="h-4 w-4 text-steel" />
            <span class="truncate">{{ s.name }}</span>
          </button>
          <p v-if="!sectionsList.length" class="px-3 py-2 text-body-sm text-steel">
            Пока нет секций.
            <NuxtLink to="/dashboard/sections/new" class="text-link hover:underline">Создать</NuxtLink>
          </p>
        </div>
      </div>

      <!-- Модуль: подменю со списком доступных на тарифе модулей. Если модуль
           ещё не включён, первый клик включает tenantConfig и сразу вставляет
           moduleRef в документ. -->
      <div class="relative">
        <UiTooltip text="Вставить модуль" :disabled="showModulesMenu">
          <button type="button" :class="[btnClass(false), 'px-2 gap-1.5']" @click="togglePopover('modules')">
            <Icon name="lucide:puzzle" class="h-4 w-4" />
            <span class="text-body-sm">Модуль</span>
            <Icon name="lucide:chevron-down" class="h-3 w-3" />
          </button>
        </UiTooltip>
        <div v-if="showModulesMenu" v-keep-in-viewport class="popover-menu absolute left-0 top-full z-50 mt-2 w-64 max-h-[320px] overflow-y-auto rounded-lg p-1">
          <button
            v-for="m in modulesList"
            :key="m.id"
            type="button"
            class="popover-item"
            @click="insertModule(m)"
          >
            <Icon name="lucide:puzzle" class="h-4 w-4 text-steel" />
            <span class="truncate">{{ m.name }}</span>
            <span v-if="!m.tenantConfig?.enabled" class="ml-auto text-caption text-steel">включить</span>
          </button>
          <p v-if="!modulesList.length" class="px-3 py-2 text-body-sm text-steel">
            Нет подключённых модулей.
            <NuxtLink to="/dashboard/modules" class="text-link hover:underline">Подключить</NuxtLink>
          </p>
        </div>
      </div>
      </template>
    </div>

    <!-- Группа 6: история -->
    <div class="toolbar-group">
      <UiTooltip text="Отменить (⌘Z)"><button type="button" :class="btnClass(false)" :disabled="!canUndo()" @click="editor.chain().focus().undo().run()"><Icon name="lucide:undo-2" class="h-4 w-4" /></button></UiTooltip>
      <UiTooltip text="Повторить (⌘⇧Z)"><button type="button" :class="btnClass(false)" :disabled="!canRedo()" @click="editor.chain().focus().redo().run()"><Icon name="lucide:redo-2" class="h-4 w-4" /></button></UiTooltip>
    </div>

    <!-- Группа 7: ИИ-помощник. Вставляет inline prompt-блок в текущее
         место курсора — пользователь пишет промпт прямо в редакторе, выбирает
         режим (текст / изображение) и жмёт «Сгенерировать». -->
    <div class="toolbar-group toolbar-group--ai">
      <UiTooltip text="ИИ-помощник: написать или нарисовать">
        <button
          type="button"
          class="mo-toolbar-ai-btn"
          @click="editor.chain().focus().insertAiPrompt('text').run()"
        >
          <Icon name="lucide:sparkles" class="h-4 w-4" />
          <span class="text-body-sm">ИИ</span>
        </button>
      </UiTooltip>
    </div>
  </div>
</template>

<style scoped>
/* Тулбар: solid surface без backdrop-filter — backdrop на parent создаёт
 * containing block и блокирует backdrop у child popover-меню. Эффект «матового
 * стекла» теперь только на popover'ах (где он критичен). */
/* Сам тулбар-контейнер — flex без фона. Каждая группа сама по себе
 * бежевая «плашка» (см. .toolbar-group ниже). */
.editor-toolbar-bar {
  background: transparent;
}

/* Группа кнопок тулбара — атомарный flex-item родительского flex-wrap'а.
 * Бежевая «пилюля» с тем же surface-фоном и rounded-lg, что и у других
 * пилюль интерфейса (segmented-tabs, search). flex-wrap: nowrap внутри
 * держит кнопки в одной строке; parent flex-wrap переносит ВСЮ группу
 * целиком, если не хватает ширины. */
.toolbar-group {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: var(--color-surface);
}

/* .popover-menu / .popover-item — общий стиль popover'ов dashboard'а
 * (вынесены в assets/css/global.css, потому что используются вне этого
 * компонента — Share popover на странице edit и т.д.). */

/* AI-кнопка в тулбаре — фиолетовый акцент, выделяет ИИ-помощника на фоне
 * остальных нейтральных групп. */
.mo-toolbar-ai-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  color: #fff;
  font-weight: 500;
  transition: filter 0.12s;
  box-shadow: 0 1px 4px -1px rgba(124, 58, 237, 0.35);
}
.mo-toolbar-ai-btn:hover {
  filter: brightness(1.08);
}
</style>
