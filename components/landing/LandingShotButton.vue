<script setup lang="ts">
withDefaults(
  defineProps<{
    to?: string
    size?: 'md' | 'lg'
    variant?: 'primary' | 'secondary' | 'outline-on-dark'
  }>(),
  { to: '/auth/register', size: 'lg', variant: 'primary' }
)

const sizeClass = {
  md: 'h-12 px-lg text-h5',
  lg: 'h-14 px-xl text-h5 md:h-16 md:px-2xl md:text-h4'
} as const

const variantClass = {
  primary: 'border-primary bg-primary text-white hover:border-primary-pressed hover:bg-primary-pressed',
  secondary: 'border-transparent bg-surface text-charcoal hover:bg-tint-gray',
  'outline-on-dark': 'border-white/22 bg-transparent text-white hover:border-white/36 hover:bg-white/10'
} as const
</script>

<template>
  <NuxtLink
    :to="to"
    :class="[
      'inline-flex items-center justify-center gap-3 rounded-lg border font-semibold leading-none transition-colors',
      sizeClass[size],
      variantClass[variant]
    ]"
  >
    <slot />
  </NuxtLink>
</template>
