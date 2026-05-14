<script setup lang="ts">
/**
 * Section mini-header — единый паттерн для заголовков подсекций внутри
 * dashboard-страниц. Lucide-иконка navy/50% opacity + h4 navy.
 *
 * Используется внутри info-card и над списками: «Последние инструкции» на
 * overview, «Сообщения» на feedback, каждая подсекция settings и т.п.
 * Раньше в 15+ местах паттерн воспроизводился вручную и местами разъезжался.
 *
 * Канон зафиксирован в DESIGN-notion.md (section-mini-header).
 */
defineProps<{
  icon: string
  title: string
}>()
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <div class="flex min-w-0 items-center gap-3">
      <Icon :name="icon" class="h-5 w-5 shrink-0 text-navy opacity-50" />
      <h3 class="truncate text-h4 text-navy">{{ title }}</h3>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-sm">
      <slot name="actions" />
    </div>
  </div>
</template>
