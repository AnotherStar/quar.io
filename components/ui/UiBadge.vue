<script setup lang="ts">
type Variant = 'purple' | 'pink' | 'orange' | 'tag-purple' | 'tag-orange' | 'tag-green' | 'popular'

withDefaults(defineProps<{ variant?: Variant }>(), { variant: 'purple' })

const variantClass: Record<Variant, string> = {
  purple: 'bg-primary text-white rounded-full px-[10px] py-[4px] text-caption-bold',
  pink: 'bg-brand-pink text-white rounded-full px-[10px] py-[4px] text-caption-bold',
  orange: 'bg-brand-orange text-white rounded-full px-[10px] py-[4px] text-caption-bold',
  'tag-purple': 'bg-tint-lavender text-[var(--color-brand-purple-800)] rounded-sm px-[8px] py-[2px] text-caption-bold',
  'tag-orange': 'bg-tint-peach text-[var(--color-brand-orange-deep)] rounded-sm px-[8px] py-[2px] text-caption-bold',
  'tag-green': 'bg-tint-mint text-brand-green rounded-sm px-[8px] py-[2px] text-caption-bold',
  popular: 'bg-primary text-white rounded-full px-[10px] py-[4px] text-caption-bold'
}
</script>

<template>
  <span :class="['inline-flex items-center gap-1', variantClass[variant]]">
    <slot />
  </span>
</template>
