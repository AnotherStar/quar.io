<script setup lang="ts">
withDefaults(
  defineProps<{
    kind?: 'info' | 'success' | 'warning' | 'error'
    title?: string
  }>(),
  { kind: 'info' }
)

const kindClass = {
  info: 'bg-tint-sky text-charcoal',
  success: 'bg-tint-mint text-charcoal',
  warning: 'bg-tint-peach text-charcoal',
  error: 'bg-[#fde0e0] text-[#8a1212]'
} as const
</script>

<template>
  <div :class="['rounded-md p-md', kindClass[kind]]">
    <p v-if="title" class="text-body-md mb-1">{{ title }}</p>
    <div class="text-body-sm">
      <slot />
    </div>
  </div>
</template>
