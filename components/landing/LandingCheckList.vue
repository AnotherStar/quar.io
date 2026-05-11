<script setup lang="ts">
defineProps<{
  items: string[]
}>()
</script>

<template>
  <ul class="grid gap-sm">
    <li
      v-for="item in items"
      :key="item"
      class="flex items-start gap-sm text-body-sm text-charcoal"
    >
      <Icon name="lucide:check" class="mt-[2px] h-4 w-4 shrink-0 text-success" />
      <span>{{ item }}</span>
    </li>
  </ul>
</template>
