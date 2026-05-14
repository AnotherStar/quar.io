<script setup lang="ts" generic="T extends string">
/**
 * Сегментированный контрол на 2+ табов с «ездящей» плашкой-индикатором.
 *
 * Используется в dashboard-страницах как левая часть working-row
 * (рядом с поиском и actions). Активный таб выделяется белой плашкой
 * `bg-canvas + shadow-subtle`, которая плавно (500 ms) едет между
 * позициями.
 *
 * Размеры табов берутся из их содержимого (whitespace-nowrap), поэтому
 * длинные надписи вроде «Напечатанные» не переносятся на вторую строку.
 * Индикатор позиционируется по offsetLeft/offsetWidth активной кнопки —
 * измерения пересчитываются через ResizeObserver, при изменении modelValue
 * и при изменении набора tabs.
 *
 * Если общая ширина не помещается в parent — контейнер скроллится по X
 * (полоса прокрутки скрыта), индикатор всё равно остаётся под активным
 * табом.
 *
 * Generic <T extends string> привязывает modelValue к union'у значений
 * табов, чтобы вызывающая страница имела типовую безопасность вида
 * `tab.value === 'submissions' | 'settings'`.
 */
interface TabItem {
  value: T
  label: string
  /** Опциональный счётчик — показывается справа от label через `·`. */
  count?: number
}

const props = defineProps<{
  modelValue: T
  tabs: TabItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

const containerRef = ref<HTMLElement | null>(null)
const buttonRefs = ref<HTMLButtonElement[]>([])

interface Indicator { left: number; width: number; ready: boolean }
const indicator = reactive<Indicator>({ left: 0, width: 0, ready: false })

function setButtonRef(el: Element | ComponentPublicInstance | null, index: number) {
  if (el instanceof HTMLButtonElement) buttonRefs.value[index] = el
}

function measure() {
  if (!containerRef.value) return
  const activeIndex = props.tabs.findIndex((t) => t.value === props.modelValue)
  const button = buttonRefs.value[activeIndex < 0 ? 0 : activeIndex]
  if (!button) return
  indicator.left = button.offsetLeft
  indicator.width = button.offsetWidth
  indicator.ready = true
}

let ro: ResizeObserver | null = null

onMounted(() => {
  measure()
  // Пересчитываем при изменении геометрии (resize окна, font-load,
  // изменение ширины кнопок при обновлении counts).
  if (typeof ResizeObserver !== 'undefined' && containerRef.value) {
    ro = new ResizeObserver(measure)
    ro.observe(containerRef.value)
    for (const btn of buttonRefs.value) if (btn) ro.observe(btn)
  }
})

onBeforeUnmount(() => {
  ro?.disconnect()
  ro = null
})

watch(
  [() => props.modelValue, () => props.tabs.length],
  async () => {
    await nextTick()
    measure()
  }
)
</script>

<template>
  <div
    ref="containerRef"
    role="tablist"
    class="ui-segmented-tabs relative inline-flex h-10 max-w-full items-stretch overflow-x-auto rounded-lg bg-surface p-1"
  >
    <!-- Floating indicator. left/width читаются из активной <button>;
         transition даёт «езду» между позициями. opacity скрывает индикатор
         до первого замера (избегаем скачка от 0,0 к реальной позиции). -->
    <span
      aria-hidden="true"
      class="pointer-events-none absolute top-1 bottom-1 rounded-md bg-canvas shadow-sm transition-all duration-500 ease-out"
      :style="{
        left: `${indicator.left}px`,
        width: `${indicator.width}px`,
        opacity: indicator.ready ? 1 : 0
      }"
    />
    <button
      v-for="(t, i) in tabs"
      :key="t.value"
      :ref="(el) => setButtonRef(el, i)"
      type="button"
      role="tab"
      :aria-selected="t.value === modelValue"
      :class="[
        'relative z-10 inline-flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-md text-body-sm-md transition-colors',
        t.value === modelValue ? 'text-ink' : 'text-hairline-strong hover:text-ink'
      ]"
      @click="emit('update:modelValue', t.value)"
    >
      <span>{{ t.label }}</span>
      <span v-if="t.count !== undefined" class="font-bold text-hairline-strong">·&nbsp;{{ t.count }}</span>
    </button>
  </div>
</template>

<style scoped>
/* Скрываем полосу прокрутки, оставляя возможность скроллить горизонтально
 * на мобильных, если все табы не помещаются. */
.ui-segmented-tabs {
  scrollbar-width: none;
}
.ui-segmented-tabs::-webkit-scrollbar {
  display: none;
}
</style>
