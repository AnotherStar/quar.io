<script setup lang="ts">
/**
 * Простой CSS-only tooltip. Тёмный pill с белым текстом, появляется над
 * элементом при hover/focus c небольшой задержкой.
 *
 * Использование:
 *   <UiTooltip text="Жирный (⌘B)">
 *     <button>...</button>
 *   </UiTooltip>
 *
 * Параметр `placement` пока всегда top — этого хватает для toolbar'а
 * редактора. При необходимости расширим.
 */
defineProps<{
  text: string
  /** Когда true — tooltip не отрисовывается. Используется, например, чтобы
   * скрыть подсказку у dropdown-trigger'а когда его меню открыто. */
  disabled?: boolean
}>()
</script>

<template>
  <span class="ui-tooltip">
    <slot />
    <span v-if="text && !disabled" class="ui-tooltip__bubble" role="tooltip">{{ text }}</span>
  </span>
</template>

<style scoped>
.ui-tooltip {
  position: relative;
  display: inline-flex;
}

.ui-tooltip__bubble {
  position: absolute;
  /* Tooltip снизу-под-target. */
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) translateY(-2px);
  white-space: nowrap;
  background: var(--color-charcoal);
  color: var(--color-on-dark);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  letter-spacing: 0.1px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease, transform 120ms ease;
  z-index: 100;
}

/* Маленький треугольник-«хвост» сверху пузыря, указывающий вверх на target. */
.ui-tooltip__bubble::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 4px solid transparent;
  border-bottom-color: var(--color-charcoal);
}

.ui-tooltip:hover .ui-tooltip__bubble,
.ui-tooltip:focus-within .ui-tooltip__bubble {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
  transition-delay: 250ms;
}
</style>
