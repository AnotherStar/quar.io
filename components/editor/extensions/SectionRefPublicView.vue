<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const id = computed(() => (props.node.attrs.sectionId as string | null) ?? null)

const refs = inject<{ sections: Record<string, { name: string; content: object }> }>(
  'publicRefs',
  { sections: {} }
)
const data = computed(() => (id.value ? refs.sections[id.value] : null))
</script>

<template>
  <!-- Transparent inclusion: section content renders inline at this position,
       no surrounding card. The section's own blocks (headings, paragraphs,
       images, columns) control its appearance. -->
  <NodeViewWrapper data-type="section-ref">
    <ClientOnly v-if="data">
      <InstructionContent :content="data.content" />
    </ClientOnly>
  </NodeViewWrapper>
</template>
