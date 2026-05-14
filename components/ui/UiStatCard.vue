<script setup lang="ts">
/**
 * Stat-card — узкий info-card для одной метрики.
 *
 * Геометрия: `rounded-lg bg-surface p-xl`. Лейбл — caption-bold uppercase
 * steel, цифра — h2 (или h3 для компактных рядов) в navy, опциональный
 * подзаголовок — caption steel снизу.
 *
 * Используется в /dashboard, /dashboard/admin, /dashboard/admin/ai-usage,
 * /dashboard/settings и т.п. Раньше каждая страница лепила это руками — 20+
 * копий разъезжались по типографике и отступам.
 */
withDefaults(
  defineProps<{
    label: string
    /** Размер цифры. h2 (по умолчанию) — для основной сетки 4-up. h3 — для
     *  более плотных рядов 5-up (QR-codes, ai-usage). */
    size?: 'h2' | 'h3'
    /** Подзаголовок под цифрой — caption steel. Например, «+12 за 30 дней». */
    hint?: string
  }>(),
  { size: 'h2' }
)
</script>

<template>
  <div class="rounded-lg bg-surface p-xl">
    <p class="text-caption-bold text-steel uppercase tracking-wide">{{ label }}</p>
    <p :class="['mt-2 text-navy', size === 'h2' ? 'text-h2' : 'text-h3']">
      <slot></slot>
    </p>
    <p v-if="hint" class="mt-1 text-caption text-steel">{{ hint }}</p>
  </div>
</template>
