<script setup lang="ts">
// Columns NodeView: renders the grid layout AND draggable resize handles
// between columns. Widths are stored as percentages on `columnWidths` attr.
//
// On drag, we redistribute width between the two adjacent columns: the one
// to the left grows by Δ%, the one to the right shrinks by the same.
// Other columns keep their widths. Min width per column = 8%.
//
// Vertical alignment toolbar (top/center/bottom) sits at the top of the
// columns wrapper, visible on hover/selection.
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const childCount = computed(() => props.node.childCount)
const editable = computed(() => props.editor?.isEditable !== false)
const isHovered = ref(false)

const widths = computed<number[]>(() => {
  const w = props.node.attrs.columnWidths as number[] | null
  const n = childCount.value
  if (w && w.length === n) return w
  return Array.from({ length: n }, () => 100 / n)
})

const valign = computed<'top' | 'center' | 'bottom'>(
  () => (props.node.attrs.verticalAlign as any) || 'top'
)
const alignItems = computed(() =>
  valign.value === 'center' ? 'center' : valign.value === 'bottom' ? 'end' : 'start'
)

const gridStyle = computed(() => ({
  gridTemplateColumns: widths.value.map((w) => `${w}fr`).join(' '),
  alignItems: alignItems.value
}))

const MIN_WIDTH_PCT = 8

function setValign(v: 'top' | 'center' | 'bottom') {
  props.updateAttributes({ verticalAlign: v })
}

function startResize(handleIdx: number, e: PointerEvent) {
  if (!editable.value) return
  const handleEl = e.currentTarget as HTMLElement
  const wrapperEl = handleEl.parentElement
  if (!wrapperEl) return
  const containerWidth = wrapperEl.getBoundingClientRect().width
  if (!containerWidth) return

  e.preventDefault()
  e.stopPropagation()
  try { handleEl.setPointerCapture(e.pointerId) } catch {}

  const startWidths = [...widths.value]
  const startX = e.clientX

  const onMove = (ev: PointerEvent) => {
    const dxPx = ev.clientX - startX
    const dxPct = (dxPx / containerWidth) * 100
    const left = startWidths[handleIdx]
    const right = startWidths[handleIdx + 1]
    let nextLeft = left + dxPct
    let nextRight = right - dxPct
    if (nextLeft < MIN_WIDTH_PCT) {
      nextLeft = MIN_WIDTH_PCT
      nextRight = left + right - MIN_WIDTH_PCT
    }
    if (nextRight < MIN_WIDTH_PCT) {
      nextRight = MIN_WIDTH_PCT
      nextLeft = left + right - MIN_WIDTH_PCT
    }
    const next = [...startWidths]
    next[handleIdx] = Math.round(nextLeft * 100) / 100
    next[handleIdx + 1] = Math.round(nextRight * 100) / 100
    props.updateAttributes({ columnWidths: next })
  }

  const onUp = (ev: PointerEvent) => {
    try { handleEl.releasePointerCapture(ev.pointerId) } catch {}
    handleEl.removeEventListener('pointermove', onMove)
    handleEl.removeEventListener('pointerup', onUp)
    handleEl.removeEventListener('pointercancel', onUp)
  }
  handleEl.addEventListener('pointermove', onMove)
  handleEl.addEventListener('pointerup', onUp)
  handleEl.addEventListener('pointercancel', onUp)
}

const tbBtn = 'inline-flex h-6 w-6 items-center justify-center rounded-sm transition-colors'
const tbIdle = 'text-charcoal hover:bg-surface'
const tbActive = 'bg-ink text-white'
</script>

<template>
  <NodeViewWrapper
    class="mo-columns relative"
    data-type="columns"
    :style="gridStyle"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <NodeViewContent class="contents" />

    <!-- Resize handles between adjacent columns -->
    <template v-if="editable">
      <button
        v-for="i in childCount - 1"
        :key="`r-${i}`"
        type="button"
        contenteditable="false"
        class="mo-column-resizer"
        :style="{ left: `calc(${widths.slice(0, i).reduce((a, b) => a + b, 0)}% - 4px)` }"
        :aria-label="`Изменить ширину колонки ${i}`"
        @pointerdown="startResize(i - 1, $event)"
        @mousedown.prevent.stop
      />
    </template>

    <!-- Vertical alignment toolbar — sits above the columns wrapper, visible
         on hover. Floating with position: absolute so it doesn't push grid. -->
    <div
      v-if="editable && isHovered"
      contenteditable="false"
      class="mo-columns-valign"
      @mousedown.prevent.stop
    >
      <button type="button" :class="[tbBtn, valign === 'top' ? tbActive : tbIdle]" title="По верху" @click="setValign('top')">
        <Icon name="lucide:align-start-horizontal" class="h-3.5 w-3.5" />
      </button>
      <button type="button" :class="[tbBtn, valign === 'center' ? tbActive : tbIdle]" title="По центру" @click="setValign('center')">
        <Icon name="lucide:align-center-horizontal" class="h-3.5 w-3.5" />
      </button>
      <button type="button" :class="[tbBtn, valign === 'bottom' ? tbActive : tbIdle]" title="По низу" @click="setValign('bottom')">
        <Icon name="lucide:align-end-horizontal" class="h-3.5 w-3.5" />
      </button>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
.mo-columns-valign {
  position: absolute;
  /* Sits half above / half overlapping the wrapper top edge so the cursor
   * never crosses an empty gap when moving from columns up to the toolbar.
   * Without this overlap, mouseleave fires on .mo-columns and the toolbar
   * disappears mid-reach. */
  top: -22px;
  right: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border-radius: 6px;
  border: 1px solid var(--color-hairline);
  background: var(--color-canvas);
  box-shadow: rgba(15, 15, 15, 0.08) 0 4px 12px 0;
  z-index: 5;
}
</style>
