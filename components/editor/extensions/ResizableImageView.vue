<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import ImageMagicModal from './ImageMagicModal.vue'

const props = defineProps(nodeViewProps)

const src = computed(() => props.node.attrs.src as string)
const alt = computed(() => (props.node.attrs.alt as string) || '')
const widthPx = computed(() => (props.node.attrs.width as number | null) ?? null)
const intrinsicWidth = computed(() => (props.node.attrs.intrinsicWidth as number | null) ?? null)
const intrinsicHeight = computed(() => (props.node.attrs.intrinsicHeight as number | null) ?? null)
const align = computed(() => (props.node.attrs.align as 'left' | 'center' | 'right') || 'left')

const wrapperRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const isDragging = ref(false)
const isHovered = ref(false)
const isToolbarHovered = ref(false)
const editable = computed(() => props.editor?.isEditable !== false)

// Loading state — пока браузер тянет картинку по src, показываем плейсхолдер
// поверх <img>. Срабатывает и при первом монтировании, и когда src меняется
// (например, ИИ-замена через ImageMagicModal).
const loaded = ref(false)
const errored = ref(false)
function onImgLoad() { loaded.value = true; errored.value = false }
function onImgError() { errored.value = true; loaded.value = false }
watch(src, () => {
  loaded.value = false
  errored.value = false
  // Если браузер уже закэшировал картинку и onload не сработает, дёрнем
  // вручную через nextTick — у <img> может быть выставлен `complete` сразу.
  nextTick(() => {
    if (imgRef.value?.complete && imgRef.value.naturalWidth > 0) loaded.value = true
  })
})
onMounted(() => {
  if (imgRef.value?.complete && imgRef.value.naturalWidth > 0) loaded.value = true
})

// NodeViewWrapper — block с text-align, inner wrapperRef — inline-block.
// Так выравнивание левее/центр/правее работает без flex-конфликтов.
const alignClass = computed(() =>
  align.value === 'left' ? 'text-left' : align.value === 'right' ? 'text-right' : 'text-center'
)

// Hover-triggered тулбар. Учитываем hover как на изображении, так и на
// самом тулбаре — иначе зазор 4px между ними «съедает» hover-state и
// меню пропадает при переходе курсора с image на toolbar.
const showToolbar = computed(
  () => editable.value && (isHovered.value || isToolbarHovered.value || isDragging.value)
)

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

// Когда нет ни intrinsic-размеров, ни выставленной ширины, плейсхолдеру
// нужна какая-то высота, чтобы он был видим до загрузки.
const placeholderHasAspect = computed(() => Boolean(aspectRatio.value || widthPx.value))

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

// ИИ-палочка: открывает модалку, в которой можно сгенерировать варианты
// картинки по промпту и выбрать один — он заменит src текущего узла.
const magicOpen = ref(false)
function openMagic() {
  magicOpen.value = true
}
function applyMagic(url: string) {
  // Сбрасываем width / intrinsic dimensions — у нового изображения они
  // другие, иначе оно будет растянуто/обрезано.
  props.updateAttributes({
    src: url,
    width: null,
    intrinsicWidth: null,
    intrinsicHeight: null
  })
}

// Стили кнопок тулбара картинки — единые с EditorToolbar:
// active = белая плашка + subtle shadow, idle = charcoal + hairline-soft hover.
function btnClass(active: boolean) {
  return [
    'inline-flex h-8 min-w-[32px] items-center justify-center gap-1 rounded-md px-1.5 text-body-sm-md transition-colors',
    active ? 'bg-canvas text-ink shadow-subtle' : 'text-charcoal hover:bg-hairline-soft'
  ]
}
</script>

<template>
  <NodeViewWrapper
    class="my-4 not-prose"
    :class="alignClass"
    data-type="resizable-image"
  >
    <div
      ref="wrapperRef"
      class="relative inline-block max-w-full rounded-md text-left align-top"
      :style="wrapperStyle"
      @mouseenter="isHovered = true"
      @mouseleave="isHovered = false"
    >
      <!-- Floating toolbar — над картинкой, центр по горизонтали.
           Геометрия и поведение совпадают с .toolbar-group в EditorToolbar:
           bg-surface, rounded-lg, p-1, h-8 кнопки с rounded-md. -->
      <div
        v-if="showToolbar"
        contenteditable="false"
        class="absolute bottom-full left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg bg-surface p-1 whitespace-nowrap"
        @mousedown.prevent
        @mouseenter="isToolbarHovered = true"
        @mouseleave="isToolbarHovered = false"
      >
        <UiTooltip text="По левому краю">
          <button type="button" :class="btnClass(align === 'left')" @click="setAlign('left')">
            <Icon name="lucide:align-left" class="h-4 w-4" />
          </button>
        </UiTooltip>
        <UiTooltip text="По центру">
          <button type="button" :class="btnClass(align === 'center')" @click="setAlign('center')">
            <Icon name="lucide:align-center" class="h-4 w-4" />
          </button>
        </UiTooltip>
        <UiTooltip text="По правому краю">
          <button type="button" :class="btnClass(align === 'right')" @click="setAlign('right')">
            <Icon name="lucide:align-right" class="h-4 w-4" />
          </button>
        </UiTooltip>

        <span class="mx-1 h-5 w-px bg-hairline" />

        <UiTooltip text="25% ширины">
          <button type="button" :class="btnClass(false)" @click="setPreset(25)">
            <span class="text-caption-bold">25%</span>
          </button>
        </UiTooltip>
        <UiTooltip text="50% ширины">
          <button type="button" :class="btnClass(false)" @click="setPreset(50)">
            <span class="text-caption-bold">50%</span>
          </button>
        </UiTooltip>
        <UiTooltip text="100% ширины">
          <button type="button" :class="btnClass(false)" @click="setPreset(100)">
            <span class="text-caption-bold">100%</span>
          </button>
        </UiTooltip>

        <span class="mx-1 h-5 w-px bg-hairline" />

        <UiTooltip text="Сбросить размер">
          <button type="button" :class="btnClass(false)" @click="resetWidth">
            <Icon name="lucide:rotate-ccw" class="h-4 w-4" />
          </button>
        </UiTooltip>

        <span class="mx-1 h-5 w-px bg-hairline" />

        <UiTooltip text="ИИ-редактирование">
          <button type="button" :class="btnClass(false)" @click="openMagic">
            <Icon name="lucide:wand-2" class="h-4 w-4" />
          </button>
        </UiTooltip>
      </div>

      <img
        ref="imgRef"
        :src="src"
        :alt="alt"
        :width="intrinsicWidth || undefined"
        :height="intrinsicHeight || undefined"
        class="block h-auto max-w-full rounded-md select-none transition-opacity duration-200"
        :class="[
          loaded ? 'opacity-100' : 'opacity-0',
          // Если intrinsic-размеров нет, оставшийся <img> с opacity-0 всё равно
          // занял бы место (0×0 в большинстве браузеров до момента load).
          // Прячем его из layout, пока плейсхолдер задаёт собственный размер.
          !loaded && !placeholderHasAspect && 'hidden'
        ]"
        :style="imageStyle"
        draggable="false"
        @load="onImgLoad"
        @error="onImgError"
      >

      <!-- Loading placeholder — рисуется поверх <img>, когда размер задан
           wrapper'ом (intrinsic/width), и в самом потоке c min-размером,
           если размер заранее неизвестен. Так картинка не "прыгает" на месте,
           но плейсхолдер всё равно виден до подгрузки. -->
      <div
        v-if="!loaded && !errored"
        contenteditable="false"
        class="pointer-events-none flex flex-col items-center justify-center gap-2 overflow-hidden rounded-md"
        :class="placeholderHasAspect
          ? 'absolute inset-0'
          : 'flex h-[180px] w-[260px] max-w-full'"
      >
        <div class="absolute inset-0 animate-pulse bg-gradient-to-br from-hairline-soft via-surface to-hairline-soft" />
        <div class="relative flex flex-col items-center gap-1.5 text-steel">
          <Icon name="lucide:image" class="h-5 w-5" />
          <span class="text-caption">Загружаю изображение…</span>
        </div>
      </div>

      <!-- Error fallback — отдельный, чтобы не выглядеть как "вечная загрузка". -->
      <div
        v-else-if="errored"
        contenteditable="false"
        class="pointer-events-none flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-hairline bg-surface text-steel"
        :class="placeholderHasAspect
          ? 'absolute inset-0'
          : 'h-[180px] w-[260px] max-w-full'"
      >
        <Icon name="lucide:image-off" class="h-5 w-5" />
        <span class="text-caption">Не удалось загрузить картинку</span>
      </div>

      <!-- Resize handle: при наведении или перетаскивании. -->
      <span
        v-if="editable && (isHovered || isDragging)"
        contenteditable="false"
        class="absolute -bottom-1 -right-1 grid h-6 w-6 cursor-se-resize place-items-center rounded-sm border border-hairline bg-canvas text-steel shadow-subtle hover:text-ink"
        @pointerdown="startResize"
      >
        <Icon name="lucide:move-diagonal-2" class="h-3.5 w-3.5" />
      </span>
    </div>

    <ImageMagicModal
      v-model:open="magicOpen"
      :source-url="src"
      @pick="applyMagic"
    />
  </NodeViewWrapper>
</template>
