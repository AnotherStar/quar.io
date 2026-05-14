<script setup lang="ts">
/**
 * Бинарный switch (on/off). Используем там, где нужен мгновенный toggle
 * без отдельной кнопки «Сохранить» — настройки, фичефлаги, тогглы внутри
 * info-card. Для группы зависимых опций по-прежнему предпочтительнее
 * checkbox + кнопка «Сохранить».
 *
 * Реализация: track — <button> с явным `padding: 0` (убираем user-agent
 * `1px 6px`), thumb — `position: absolute` c фиксированными `top/left: 2px`
 * и `transform: translateX(...)` для движения. Раньше пробовал flex с
 * `items-center` — но `<button>` рендерит контент как inline-block независимо
 * от display, и thumb прижимался к верху track'а. Абсолютная геометрия
 * предсказуема и не зависит от Tailwind JIT.
 */
// Off-стейт — `surface`: ровно тот тёплый бежевый, на котором стоят info-cards
// и сайдбар. Чтобы трек оставался видимым на info-card (которая тоже surface),
// добавляем 1px inset-бордер `hairline` — это как у macOS settings.
const TRACK_ON = 'var(--color-primary)'
const TRACK_OFF = 'var(--color-surface)'
const TRACK_DISABLED = 'var(--color-hairline)'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    disabled?: boolean
    ariaLabel?: string
  }>(),
  { disabled: false }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const trackBg = computed(() => {
  if (props.disabled) return TRACK_DISABLED
  return props.modelValue ? TRACK_ON : TRACK_OFF
})

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :aria-label="ariaLabel"
    :disabled="disabled"
    :class="[
      'relative inline-block shrink-0 rounded-full border-0 transition-colors duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      disabled ? 'cursor-not-allowed' : 'cursor-pointer'
    ]"
    :style="{
      width: '40px',
      height: '24px',
      padding: 0,
      backgroundColor: trackBg,
      // 1px inset hairline на off-стейте — чтобы surface-трек был виден
      // и на surface-фоне карточки. В on/disabled бордер не нужен — там
      // фон уже контрастный.
      boxShadow: !disabled && !modelValue ? 'inset 0 0 0 1px var(--color-hairline)' : 'none'
    }"
    @click="toggle"
  >
    <span
      :class="[
        'absolute rounded-full bg-canvas transition-transform duration-200',
        disabled ? '' : 'shadow-subtle'
      ]"
      :style="{
        top: '2px',
        left: '2px',
        width: '20px',
        height: '20px',
        transform: `translateX(${modelValue ? 16 : 0}px)`
      }"
    />
  </button>
</template>
