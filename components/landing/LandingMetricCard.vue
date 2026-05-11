<script setup lang="ts">
defineProps<{
  metric: string
  label: string
  icon: string
}>()
</script>

<template>
  <div class="rounded-lg bg-surface p-lg">
    <div class="flex items-start justify-between gap-md">
      <div>
        <p class="text-h4 text-navy">{{ metric }}</p>
        <p class="mt-1 text-caption text-steel">{{ label }}</p>
      </div>
      <Icon :name="icon" class="h-5 w-5 shrink-0 text-navy opacity-50" />
    </div>
  </div>
</template>
