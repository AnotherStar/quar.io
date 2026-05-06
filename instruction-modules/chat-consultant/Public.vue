<script setup lang="ts">
const props = defineProps<{
  instructionId: string
  config: Record<string, any>
  viewerSessionId: string
}>()

const provider = computed(() => String(props.config?.provider ?? 'crisp'))
const siteId = computed(() => String(props.config?.siteId ?? ''))
const open = ref(false)
</script>

<template>
  <div>
    <button
      class="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-primary text-white shadow-card transition-transform hover:scale-105"
      aria-label="Чат с консультантом"
      @click="open = !open"
    >
      💬
    </button>
    <div
      v-if="open"
      class="fixed bottom-24 right-6 z-40 w-[320px] rounded-lg border border-hairline bg-canvas p-md shadow-modal"
    >
      <p class="text-body-md text-ink">Чат с консультантом</p>
      <p class="mt-1 text-body-sm text-steel">
        Провайдер: {{ provider }}<span v-if="siteId"> ({{ siteId }})</span>
      </p>
      <p class="mt-3 text-caption text-steel">
        В продакшене сюда грузится виджет выбранного провайдера.
      </p>
    </div>
  </div>
</template>
