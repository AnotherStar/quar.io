<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const src = computed(() => props.node.attrs.src as string)
const alt = computed(() => (props.node.attrs.alt as string) || '')
const widthPx = computed(() => (props.node.attrs.width as number | null) ?? null)
const align = computed(() => (props.node.attrs.align as 'left' | 'center' | 'right') || 'center')

const wrapperRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const isDragging = ref(false)
const isHovered = ref(false)
const editable = computed(() => props.editor?.isEditable !== false)

const alignClass = computed(() =>
  align.value === 'left' ? 'mr-auto' : align.value === 'right' ? 'ml-auto' : 'mx-auto'
)

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

function setAlign(a: 'left' | 'center' | 'right') {
  props.updateAttributes({ align: a })
}
function setPreset(percent: number) {
  if (!wrapperRef.value) return
  const containerWidth = wrapperRef.value.parentElement?.getBoundingClientRect().width ?? 800
  props.updateAttributes({ width: Math.round((containerWidth * percent) / 100) })
}
function resetWidth() {
  props.updateAttributes({ width: null })
}
</script>

<template>
  <NodeViewWrapper
    class="my-3 not-prose flex"
    :class="[alignClass]"
    data-type="resizable-image"
  >
    <div
      ref="wrapperRef"
      class="relative inline-block group"
      :style="widthPx ? { width: widthPx + 'px' } : undefined"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <img
        ref="imgRef"
        :src="src"
        :alt="alt"
        class="block h-auto max-w-full rounded-md select-none"
        :style="widthPx ? { width: '100%' } : { width: 'auto' }"
        draggable="false"
      >

      <!-- Toolbar over the image when hovering or selected (editor only) -->
      <div
        v-if="editable && (isHovered || selected || isDragging)"
        contenteditable="false"
        class="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-md border border-hairline bg-canvas px-1 py-0.5 shadow-card text-caption"
      >
        <button type="button" :class="['rounded-sm px-1.5', align === 'left' ? 'bg-ink-deep text-white' : 'hover:bg-surface']" @click="setAlign('left')">⇤</button>
        <button type="button" :class="['rounded-sm px-1.5', align === 'center' ? 'bg-ink-deep text-white' : 'hover:bg-surface']" @click="setAlign('center')">⇔</button>
        <button type="button" :class="['rounded-sm px-1.5', align === 'right' ? 'bg-ink-deep text-white' : 'hover:bg-surface']" @click="setAlign('right')">⇥</button>
        <span class="mx-1 h-3 w-px bg-hairline" />
        <button type="button" class="rounded-sm px-1.5 hover:bg-surface" title="25% ширины" @click="setPreset(25)">¼</button>
        <button type="button" class="rounded-sm px-1.5 hover:bg-surface" title="50% ширины" @click="setPreset(50)">½</button>
        <button type="button" class="rounded-sm px-1.5 hover:bg-surface" title="100% ширины" @click="setPreset(100)">1</button>
        <span class="mx-1 h-3 w-px bg-hairline" />
        <button type="button" class="rounded-sm px-1.5 hover:bg-surface" title="Авто" @click="resetWidth">↺</button>
      </div>

      <!-- Resize handles, only in editor mode -->
      <span
        v-if="editable"
        contenteditable="false"
        class="absolute bottom-1 right-1 grid h-4 w-4 cursor-se-resize place-items-center rounded-sm border border-hairline bg-canvas/90 text-[10px] text-steel opacity-0 group-hover:opacity-100 transition-opacity"
        :class="{ 'opacity-100': isDragging || selected }"
        title="Перетащить, чтобы изменить размер"
        @pointerdown="startResize"
      >⇲</span>

      <!-- Subtle frame when selected -->
      <div
        v-if="editable && selected"
        contenteditable="false"
        class="pointer-events-none absolute inset-0 rounded-md ring-2 ring-primary"
      />
    </div>
  </NodeViewWrapper>
</template>
