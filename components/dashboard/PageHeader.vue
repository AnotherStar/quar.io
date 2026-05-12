<script setup lang="ts">
/**
 * Унифицированный header-row для dashboard-страниц.
 *
 * Высота 64px (min-h-16) — выравнивается по brand-row сайдбара. Содержит
 * полупрозрачную иконку слева (та же, что у пункта меню в сайдбаре) и
 * заголовок страницы. Справа — slot #actions для дополнительных кнопок
 * (например, переключателей вида или ссылок на детальный экран).
 *
 * Под header-row на странице принято оставлять mt-sm (12px) перед первой
 * рабочей строкой (табы / фильтры / контент).
 */
defineProps<{
  icon: string
  title: string
  /** Короткий вариант заголовка для мобильных экранов. Если не задан —
   * на мобиле показывается обычный `title`, но он может обрезаться по
   * ширине рядом с кнопкой действия. */
  titleMobile?: string
}>()
</script>

<template>
  <div class="flex min-h-16 items-center justify-between gap-2">
    <!-- pl-[52px] на мобиле освобождает место под fixed-кнопку гамбургера
         (24 left + 40 width — 12 grow toward icon). Остальной контент
         страницы остаётся выровненным по левому краю dashboard-content.

         Иконка скрыта на мобиле и заголовок ужимается до text-h4, чтобы
         длинные названия («Инструкции», «Аналитика», «QR-коды») не
         обрезались многоточием рядом с кнопкой действия. На md+ —
         канонический вид: иконка + h3 в navy. -->
    <div class="flex min-w-0 items-center gap-3 pl-[52px] md:pl-0">
      <Icon :name="icon" class="hidden h-6 w-6 shrink-0 text-navy opacity-50 md:block" />
      <h1 class="truncate text-h4 text-navy md:text-h3">
        <template v-if="titleMobile">
          <span class="md:hidden">{{ titleMobile }}</span>
          <span class="hidden md:inline">{{ title }}</span>
        </template>
        <template v-else>{{ title }}</template>
      </h1>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-md">
      <slot name="actions" />
    </div>
  </div>
</template>
