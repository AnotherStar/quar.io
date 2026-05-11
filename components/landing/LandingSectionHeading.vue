<script setup lang="ts">
withDefaults(
  defineProps<{
    eyebrow: string
    title: string
    copy?: string
    centered?: boolean
  }>(),
  { copy: undefined, centered: false }
)
</script>

<template>
  <div :class="[centered ? 'mx-auto text-center' : '', 'max-w-3xl']">
    <p class="text-caption-bold uppercase text-steel">{{ eyebrow }}</p>
    <h2 class="mt-3 text-h2 text-navy">{{ title }}</h2>
    <p v-if="copy" class="mt-3 text-body text-slate">{{ copy }}</p>
  </div>
</template>
