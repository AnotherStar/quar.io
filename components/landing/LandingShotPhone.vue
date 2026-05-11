<script setup lang="ts">
withDefaults(
  defineProps<{
    wide?: boolean
  }>(),
  { wide: false }
)
</script>

<template>
  <div
    :class="[
      'rounded-[22px] border border-hairline bg-navy p-sm shadow-card',
      wide ? 'w-[168px]' : 'w-[148px]'
    ]"
  >
    <div class="mx-auto mb-sm h-1 w-11 rounded-full bg-white/24" />
    <slot />
  </div>
</template>
