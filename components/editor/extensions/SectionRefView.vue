<script setup lang="ts">
// Editor view of a section reference. Renders the actual section content
// inline (read-only). Выбор секции теперь делается в тулбаре редактора при
// вставке — здесь только preview + кнопка удалить.
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)
const sectionId = computed(() => (props.node.attrs.sectionId as string | null) ?? null)

interface SectionRow { id: string; name: string; description: string | null; content: any }

// Per-page cache so multiple SectionRef nodes share one fetch
const sections = useState<SectionRow[] | null>('mo:editor-sections', () => null)
const loading = ref(false)
const api = useApi()

async function ensureLoaded() {
  if (sections.value !== null || loading.value) return
  loading.value = true
  try {
    const { sections: list } = await api<{ sections: SectionRow[] }>('/api/sections')
    sections.value = list
  } finally { loading.value = false }
}

const current = computed(() => sectionId.value
  ? sections.value?.find((s) => s.id === sectionId.value) ?? null
  : null)

function deleteBlock() {
  const pos = typeof props.getPos === 'function' ? props.getPos() : null
  if (pos == null) return
  props.editor.chain().focus().deleteRange({ from: pos, to: pos + props.node.nodeSize }).run()
}

onMounted(ensureLoaded)
</script>

<template>
  <NodeViewWrapper class="relative my-3 not-prose" data-type="section-ref">
    <!-- Delete-кнопка над блоком. Picker секции живёт в тулбаре. -->
    <div class="absolute right-0 -top-3 z-10" contenteditable="false">
      <button
        type="button"
        class="grid h-7 w-7 place-items-center rounded-sm border border-hairline bg-canvas/95 text-steel hover:text-error"
        title="Удалить блок"
        @click.stop="deleteBlock"
      >
        <Icon name="lucide:trash-2" class="h-4 w-4" />
      </button>
    </div>

    <div contenteditable="false">
      <div v-if="!sectionId" class="flex items-center gap-2 py-md text-body-sm text-hairline-strong">
        <Icon name="lucide:blocks" class="h-4 w-4" />
        Секция не выбрана
      </div>
      <div v-else-if="!current" class="py-md text-body-sm text-error">
        <span v-if="loading">Загрузка содержимого…</span>
        <span v-else>Секция не найдена или удалена.</span>
      </div>
      <div v-else class="pointer-events-none">
        <ClientOnly>
          <InstructionContent :content="current.content" />
        </ClientOnly>
      </div>
    </div>
  </NodeViewWrapper>
</template>
