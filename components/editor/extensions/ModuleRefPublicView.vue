<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const id = computed(() => (props.node.attrs.tenantModuleConfigId as string | null) ?? null)
const override = computed(() => (props.node.attrs.configOverride as Record<string, unknown>) ?? {})

const refs = inject<{
  modules: Record<string, { code: string; config: Record<string, unknown> }>
  instructionId: string
  versionId?: string | null
  viewerSessionId: string
}>('publicRefs', { modules: {}, instructionId: '', versionId: null, viewerSessionId: '' })

const data = computed(() => (id.value ? refs.modules[id.value] : null))
const mergedConfig = computed(() => ({ ...(data.value?.config ?? {}), ...override.value }))
</script>

<template>
  <NodeViewWrapper class="my-section-sm" data-type="module-ref">
    <ClientOnly v-if="data">
      <ModuleRenderer
        :code="data.code"
        :config="mergedConfig"
        :instruction-id="refs.instructionId"
        :version-id="refs.versionId"
        :viewer-session-id="refs.viewerSessionId"
      />
    </ClientOnly>
  </NodeViewWrapper>
</template>
