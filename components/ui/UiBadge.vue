<script setup lang="ts">
type Variant = 'purple' | 'pink' | 'orange' | 'tag-blue' | 'tag-orange' | 'tag-green' | 'tag-gray' | 'popular'

withDefaults(defineProps<{ variant?: Variant }>(), { variant: 'purple' })

const variantClass: Record<Variant, string> = {
  purple: 'bg-primary text-white rounded-full px-[10px] py-[4px] text-caption-bold',
  pink: 'bg-brand-pink text-white rounded-full px-[10px] py-[4px] text-caption-bold',
  orange: 'bg-brand-orange text-white rounded-full px-[10px] py-[4px] text-caption-bold',
  // tag-blue — нейтрально-информационный бейдж: фон tint-sky, текст
  // link-blue-pressed (тёмно-синий, читабелен на голубой подложке).
  // Заменил tag-purple — его юзали только в 4 точках с особыми данными,
  // плюс это требовало отдельного токена brand-purple-800.
  'tag-blue': 'bg-tint-sky text-[var(--color-link-blue-pressed)] rounded-sm px-[8px] py-[2px] text-caption-bold',
  'tag-orange': 'bg-tint-peach text-[var(--color-brand-orange-deep)] rounded-sm px-[8px] py-[2px] text-caption-bold',
  'tag-green': 'bg-tint-mint text-brand-green rounded-sm px-[8px] py-[2px] text-caption-bold',
  'tag-gray': 'bg-surface text-steel rounded-sm px-[8px] py-[2px] text-caption-bold',
  popular: 'bg-primary text-white rounded-full px-[10px] py-[4px] text-caption-bold'
}
</script>

<template>
  <span :class="['inline-flex items-center gap-1 mix-blend-multiply', variantClass[variant]]">
    <slot />
  </span>
</template>
