<script setup lang="ts">
type Variant = 'primary' | 'dark' | 'secondary' | 'on-dark' | 'secondary-on-dark' | 'ghost' | 'link'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    type?: 'button' | 'submit' | 'reset'
    to?: string
    href?: string
    disabled?: boolean
    loading?: boolean
    block?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button' }
)

const variantClass: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-pressed disabled:bg-hairline disabled:text-muted',
  dark: 'bg-ink-deep text-white hover:bg-ink',
  // Secondary — soft pill, no border. Same rounded/height as primary so the
  // two stack visually in the same row. Background is the dashboard surface
  // grey, text is charcoal. Hover deepens to tint-gray.
  secondary: 'bg-surface text-charcoal hover:bg-tint-gray disabled:text-muted',
  'on-dark': 'bg-white text-ink hover:bg-surface',
  'secondary-on-dark': 'bg-transparent text-white border border-stone hover:bg-white/10',
  ghost: 'bg-transparent text-ink hover:bg-surface',
  link: 'bg-transparent text-link hover:underline px-0 py-0'
}

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-sm text-btn rounded-md',
  md: 'h-10 px-[18px] text-btn rounded-lg',
  lg: 'h-12 px-md text-body-sm-md rounded-lg'
}

const Tag = computed(() => (props.to ? resolveComponent('NuxtLink') : props.href ? 'a' : 'button'))
</script>

<template>
  <component
    :is="Tag"
    :to="to"
    :href="href"
    :type="!to && !href ? type : undefined"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150',
      'disabled:cursor-not-allowed select-none',
      variant !== 'link' && sizeClass[size],
      variantClass[variant],
      block && 'w-full'
    ]"
  >
    <span v-if="loading" class="i-loading inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
    <slot />
  </component>
</template>
