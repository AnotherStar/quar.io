<script setup lang="ts">
type Tint = 'canvas' | 'peach' | 'rose' | 'mint' | 'lavender' | 'sky' | 'yellow' | 'yellow-bold' | 'cream' | 'gray'

withDefaults(
  defineProps<{
    tint?: Tint
    padded?: 'sm' | 'md' | 'lg'
    bordered?: boolean
  }>(),
  { tint: 'canvas', padded: 'md', bordered: true }
)

const tintClass: Record<Tint, string> = {
  canvas: 'bg-canvas',
  peach: 'bg-tint-peach',
  rose: 'bg-tint-rose',
  mint: 'bg-tint-mint',
  lavender: 'bg-tint-lavender',
  sky: 'bg-tint-sky',
  yellow: 'bg-tint-yellow',
  'yellow-bold': 'bg-tint-yellow-bold',
  cream: 'bg-tint-cream',
  gray: 'bg-tint-gray'
}

const padClass = { sm: 'p-lg', md: 'p-xl', lg: 'p-2xl' } as const
</script>

<template>
  <div
    :class="[
      'rounded-lg',
      tintClass[tint],
      padClass[padded],
      bordered && tint === 'canvas' && 'border border-hairline'
    ]"
  >
    <slot />
  </div>
</template>
