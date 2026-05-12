<script setup lang="ts">
/**
 * Dashboard-таблица со скроллом по горизонтали внутри собственного контейнера.
 *
 * Стили шапки/рамок/отступов берёт из глобального класса `.ui-table`
 * (см. assets/css/global.css), чтобы все dashboard-списки выглядели
 * одинаково и не плодили копий классов в шаблонах. Cell-level
 * выравнивание (`text-left/right`), цвет, `whitespace-nowrap`,
 * `tabular-nums` страницы добавляют сами на конкретные `<th>/<td>`.
 *
 * `minWidth` задаёт порог, ниже которого включается горизонтальный
 * скролл внутри обёртки. Передавайте CSS-длину строкой ('960px').
 * Если `minWidth` не задан — таблица просто растягивается на ширину
 * родителя.
 *
 * Внутри обёртки `.dashboard-content` уже стоит `min-w-0`, поэтому
 * родительский layout не растягивается с таблицей и страница не
 * получает горизонтальный скролл целиком.
 */
defineProps<{
  minWidth?: string
}>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="ui-table" :style="minWidth ? { minWidth } : undefined">
      <slot />
    </table>
  </div>
</template>
