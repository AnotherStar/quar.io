<script setup lang="ts">
import { getModuleByCode } from '~~/modules-sdk/registry'

const props = defineProps<{
  code: string
  config: Record<string, any>
  instructionId: string
  viewerSessionId: string
}>()

const definition = getModuleByCode(props.code)
const Component = shallowRef<any>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  if (!definition) {
    error.value = `Module "${props.code}" not registered`
    return
  }
  try {
    const mod = await definition.PublicComponent()
    Component.value = mod.default
  } catch (e) {
    error.value = (e as Error).message
  }
})
</script>

<template>
  <div class="my-section-sm">
    <component
      :is="Component"
      v-if="Component"
      :instruction-id="instructionId"
      :config="config"
      :viewer-session-id="viewerSessionId"
    />
    <div v-else-if="error" class="text-caption text-error">Module error: {{ error }}</div>
  </div>
</template>
