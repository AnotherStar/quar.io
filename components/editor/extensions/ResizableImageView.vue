<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const src = computed(() => props.node.attrs.src as string)
const alt = computed(() => (props.node.attrs.alt as string) || '')
const widthPx = computed(() => (props.node.attrs.width as number | null) ?? null)
const intrinsicWidth = computed(() => (props.node.attrs.intrinsicWidth as number | null) ?? null)
const intrinsicHeight = computed(() => (props.node.attrs.intrinsicHeight as number | null) ?? null)
const align = computed(() => (props.node.attrs.align as 'left' | 'center' | 'right') || 'center')

const wrapperRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const isDragging = ref(false)
const isHovered = ref(false)
const editable = computed(() => props.editor?.isEditable !== false)

const alignClass = computed(() =>
  align.value === 'left' ? 'mr-auto' : align.value === 'right' ? 'ml-auto' : 'mx-auto'
)

const showToolbar = computed(() => editable.value && (isHovered.value || isDragging.value))
const aspectRatio = computed(() => {
  if (!intrinsicWidth.value || !intrinsicHeight.value) return null
  return `${intrinsicWidth.value} / ${intrinsicHeight.value}`
})
const wrapperStyle = computed(() => ({
  ...(widthPx.value
    ? { width: `${widthPx.value}px` }
    : intrinsicWidth.value
      ? { width: `${intrinsicWidth.value}px` }
      : {}),
  ...(aspectRatio.value ? { aspectRatio: aspectRatio.value } : {})
}))
const imageStyle = computed(() => {
  if (widthPx.value || aspectRatio.value) return { width: '100%', height: 'auto' }
  return { width: 'auto' }
})

function startResize(e: PointerEvent) {
  if (!editable.value || !imgRef.value) return
  e.preventDefault()
  e.stopPropagation()
  isDragging.value = true
  const startX = e.clientX
  const startWidth = imgRef.value.getBoundingClientRect().width
  const containerWidth = wrapperRef.value?.parentElement?.getBoundingClientRect().width ?? Infinity

  const onMove = (ev: PointerEvent) => {
    const dx = ev.clientX - startX
    const next = Math.max(80, Math.min(containerWidth, startWidth + dx))
    props.updateAttributes({ width: Math.round(next) })
  }
  const onUp = () => {
    isDragging.value = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function setAlign(a: 'left' | 'center' | 'right') { props.updateAttributes({ align: a }) }
function setPreset(percent: number) {
  if (!wrapperRef.value) return
  const containerWidth = wrapperRef.value.parentElement?.getBoundingClientRect().width ?? 800
  props.updateAttributes({ width: Math.round((containerWidth * percent) / 100) })
}
function resetWidth() { props.updateAttributes({ width: null }) }

// Tailwind classes for toolbar buttons
const tbBtn = 'inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors'
const tbBtnIdle = 'text-charcoal hover:bg-surface'
const tbBtnActive = 'bg-ink-deep text-white'
const tbDivider = 'mx-0.5 h-4 w-px bg-hairline'
</script>

<template>
  <NodeViewWrapper
    class="my-4 not-prose flex"
    :class="[alignClass]"
    data-type="resizable-image"
  >
    <div
      ref="wrapperRef"
      class="relative inline-block max-w-full overflow-hidden rounded-md bg-surface"
      :style="wrapperStyle"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <!-- Floating toolbar — sits ABOVE the image (no overlap), centered horizontally -->
      <div
        v-if="showToolbar"
        contenteditable="false"
        class="absolute bottom-full left-1/2 z-10 mb-1 flex -translate-x-1/2 items-center gap-0.5 rounded-md border border-hairline bg-canvas px-1 py-1 shadow-card whitespace-nowrap"
        @mousedown.prevent
      >
        <button type="button" :class="[tbBtn, align === 'left' ? tbBtnActive : tbBtnIdle]" title="Слева" @click="setAlign('left')">
          <Icon name="lucide:align-left" class="h-4 w-4" />
        </button>
        <button type="button" :class="[tbBtn, align === 'center' ? tbBtnActive : tbBtnIdle]" title="По центру" @click="setAlign('center')">
          <Icon name="lucide:align-center" class="h-4 w-4" />
        </button>
        <button type="button" :class="[tbBtn, align === 'right' ? tbBtnActive : tbBtnIdle]" title="Справа" @click="setAlign('right')">
          <Icon name="lucide:align-right" class="h-4 w-4" />
        </button>
        <span :class="tbDivider" />
        <button type="button" :class="[tbBtn, tbBtnIdle, 'text-caption']" title="25% ширины" @click="setPreset(25)">¼</button>
        <button type="button" :class="[tbBtn, tbBtnIdle, 'text-caption']" title="50% ширины" @click="setPreset(50)">½</button>
        <button type="button" :class="[tbBtn, tbBtnIdle, 'text-caption']" title="100% ширины" @click="setPreset(100)">1×</button>
        <span :class="tbDivider" />
        <button type="button" :class="[tbBtn, tbBtnIdle]" title="Сбросить размер" @click="resetWidth">
          <Icon name="lucide:rotate-ccw" class="h-4 w-4" />
        </button>
      </div>

      <img
        ref="imgRef"
        :src="src"
        :alt="alt"
        :width="intrinsicWidth || undefined"
        :height="intrinsicHeight || undefined"
        class="block h-auto max-w-full rounded-md select-none"
        :style="imageStyle"
        draggable="false"
      >

      <!-- Resize handle in bottom-right corner -->
      <span
        v-if="editable && (isHovered || isDragging)"
        contenteditable="false"
        class="absolute -bottom-1 -right-1 grid h-6 w-6 cursor-se-resize place-items-center rounded-sm border border-hairline bg-canvas text-steel shadow-subtle hover:text-ink"
        title="Перетащить, чтобы изменить размер"
        @pointerdown="startResize"
      >
        <Icon name="lucide:move-diagonal-2" class="h-3.5 w-3.5" />
      </span>

      <!-- Subtle frame when selected -->
      <div
        v-if="editable && selected"
        contenteditable="false"
        class="pointer-events-none absolute inset-0 rounded-md ring-2 ring-primary/60"
      />
    </div>
  </NodeViewWrapper>
</template>
