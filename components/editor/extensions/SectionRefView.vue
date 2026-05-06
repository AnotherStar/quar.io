<script setup lang="ts">
// Editor view of a section reference. Renders the actual section content
// inline (read-only), framed with a subtle dotted outline so the user can
// see what's a section vs. native blocks. A kebab menu in the corner lets
// the user pick a different section or remove the block.
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { onClickOutside } from '@vueuse/core'

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

// Menu
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
onClickOutside(menuRef, () => { menuOpen.value = false })

function pick(id: string) {
  props.updateAttributes({ sectionId: id })
  menuOpen.value = false
}

function deleteBlock() {
  menuOpen.value = false
  const pos = typeof props.getPos === 'function' ? props.getPos() : null
  if (pos == null) return
  props.editor.chain().focus().deleteRange({ from: pos, to: pos + props.node.nodeSize }).run()
}

onMounted(ensureLoaded)
</script>

<template>
  <NodeViewWrapper class="relative my-3 not-prose" data-type="section-ref">
    <!-- Kebab menu sits ABOVE the block (negative top) so it doesn't push
         content. The dashed indicator is an outline → no layout impact, the
         block renders identically to the public preview. -->
    <div ref="menuRef" class="absolute right-0 -top-3 z-10" contenteditable="false">
        <button
          type="button"
          class="grid h-7 w-7 place-items-center rounded-sm border border-hairline bg-canvas/95 text-steel hover:text-ink"
          title="Параметры секции"
          @click.stop="menuOpen = !menuOpen"
        >
          <Icon name="lucide:ellipsis-vertical" class="h-4 w-4" />
        </button>

        <div
          v-if="menuOpen"
          class="absolute right-0 top-full mt-1 w-64 overflow-hidden rounded-md border border-hairline bg-canvas shadow-modal"
        >
          <p class="px-3 pt-2 text-caption text-steel uppercase tracking-wide">Секция</p>
          <p v-if="loading" class="px-3 py-2 text-body-sm text-steel">Загрузка…</p>
          <p v-else-if="!sections?.length" class="px-3 py-2 text-body-sm text-steel">
            Нет секций.
            <NuxtLink to="/dashboard/sections" class="text-link hover:underline" @click="menuOpen = false">
              Создать
            </NuxtLink>
          </p>
          <ul v-else class="max-h-[40vh] overflow-y-auto py-1">
            <li v-for="s in sections" :key="s.id">
              <button
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface"
                @click="pick(s.id)"
              >
                <Icon
                  :name="s.id === sectionId ? 'lucide:check' : 'lucide:blocks'"
                  :class="['h-4 w-4 shrink-0', s.id === sectionId ? 'text-primary' : 'text-steel']"
                />
                <span class="min-w-0 flex-1 truncate text-body-sm" :class="s.id === sectionId ? 'text-ink font-medium' : 'text-charcoal'">
                  {{ s.name }}
                </span>
              </button>
            </li>
          </ul>
          <hr class="border-hairline">
          <button
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm text-error hover:bg-surface"
            @click="deleteBlock"
          >
            <Icon name="lucide:trash-2" class="h-4 w-4" />
            Удалить блок
          </button>
        </div>
      </div>

    <div contenteditable="false">
      <div v-if="!sectionId" class="flex items-center gap-2 py-md text-body-sm text-stone">
        <Icon name="lucide:blocks" class="h-4 w-4" />
        Секция не выбрана — откройте меню справа
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
