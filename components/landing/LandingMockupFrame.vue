<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
  }>(),
  { title: 'quar.io/chair-42/setup' }
)
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-hairline bg-canvas shadow-card">
    <div class="flex items-center gap-2 border-b border-hairline px-md py-sm">
      <span class="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <span class="h-3 w-3 rounded-full bg-[#febc2e]" />
      <span class="h-3 w-3 rounded-full bg-[#28c840]" />
      <span class="ml-md min-w-0 truncate text-caption text-steel">{{ title }}</span>
    </div>
    <slot />
  </div>
</template>
