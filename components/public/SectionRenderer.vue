<script setup lang="ts">
defineProps<{ name: string; content: object }>()
</script>

<template>
  <section class="my-section-sm rounded-lg border border-hairline bg-surface p-xl">
    <h3 class="mb-3 text-h4 text-charcoal">{{ name }}</h3>
    <ClientOnly>
      <InstructionContent :content="content" />
    </ClientOnly>
  </section>
</template>
