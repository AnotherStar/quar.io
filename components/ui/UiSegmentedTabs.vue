<script setup lang="ts" generic="T extends string">
/**
 * Сегментированный контрол на 2+ табов с «ездящей» плашкой-индикатором.
 *
 * Используется в dashboard-страницах как левая часть working-row
 * (рядом с поиском и actions). Активный таб выделяется белой плашкой
 * `bg-canvas + shadow-subtle`, которая плавно (200 ms) едет между
 * позициями через `translateX`.
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

const activeIndex = computed(() =>
  Math.max(0, props.tabs.findIndex((t) => t.value === props.modelValue))
)
</script>

<template>
  <div
    class="relative inline-grid h-10 rounded-lg bg-surface p-1"
    role="tablist"
    :style="{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }"
  >
    <!-- Floating indicator: translateX(N * 100%) переносит плашку на
         ширину одной колонки — совпадает с шириной одного таба, потому
         что grid делит ширину поровну на N колонок. -->
    <span
      aria-hidden="true"
      class="absolute inset-y-1 left-1 rounded-md bg-canvas shadow-sm transition-transform duration-500 ease-out"
      :style="{
        width: `calc((100% - 8px) / ${tabs.length})`,
        transform: `translateX(${activeIndex * 100}%)`
      }"
    />
    <button
      v-for="t in tabs"
      :key="t.value"
      type="button"
      role="tab"
      :aria-selected="t.value === modelValue"
      :class="['relative z-10 flex items-center justify-center gap-1 rounded-md px-md text-body-sm-md transition-colors',
        t.value === modelValue ? 'text-ink' : 'text-stone hover:text-ink']"
      @click="emit('update:modelValue', t.value)"
    >
      <span>{{ t.label }}</span>
      <span v-if="t.count !== undefined" class="text-stone font-bold">·&nbsp;{{ t.count }}</span>
    </button>
  </div>
</template>
