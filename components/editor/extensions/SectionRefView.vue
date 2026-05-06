<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const sectionId = computed(() => (props.node.attrs.sectionId as string | null) ?? null)
const sections = ref<Array<{ id: string; name: string; description: string | null }>>([])
const current = ref<{ id: string; name: string; description: string | null } | null>(null)
const loading = ref(false)
const showPicker = ref(false)

const api = useApi()

async function loadList() {
  loading.value = true
  try {
    const { sections: list } = await api<{ sections: any[] }>('/api/sections')
    sections.value = list
  } finally { loading.value = false }
}

async function loadCurrent() {
  if (!sectionId.value) { current.value = null; return }
  const cached = sections.value.find((s) => s.id === sectionId.value)
  if (cached) { current.value = cached; return }
  try {
    const { section } = await api<{ section: any }>(`/api/sections/${sectionId.value}`)
    current.value = { id: section.id, name: section.name, description: section.description }
  } catch { current.value = null }
}

function pick(id: string) {
  props.updateAttributes({ sectionId: id })
  showPicker.value = false
}

function unset() {
  props.updateAttributes({ sectionId: null })
}

watch(sectionId, loadCurrent, { immediate: true })
onMounted(loadList)
</script>

<template>
  <NodeViewWrapper class="my-3 not-prose" data-type="section-ref">
    <div
      class="rounded-md border border-dashed border-primary/40 bg-tint-lavender/40 p-md transition-colors"
      contenteditable="false"
    >
      <div class="flex items-start justify-between gap-md">
        <div class="min-w-0 flex-1">
          <p class="text-caption-bold uppercase tracking-wide text-[var(--color-brand-purple-800)]">
            📎 Секция
          </p>
          <p v-if="current" class="mt-1 text-h5 text-ink truncate">{{ current.name }}</p>
          <p v-else-if="sectionId" class="mt-1 text-body-sm text-error">Секция не найдена</p>
          <p v-else class="mt-1 text-body-sm text-steel">Не выбрана</p>
          <p v-if="current?.description" class="mt-1 text-caption text-steel">{{ current.description }}</p>
        </div>
        <div class="flex shrink-0 gap-1">
          <button
            type="button"
            class="rounded-sm border border-hairline-strong px-2 py-1 text-caption hover:bg-canvas"
            @click="showPicker = true"
          >
            {{ sectionId ? 'Сменить' : 'Выбрать' }}
          </button>
          <button
            v-if="sectionId"
            type="button"
            class="rounded-sm border border-hairline-strong px-2 py-1 text-caption text-error hover:bg-canvas"
            @click="unset"
          >
            Очистить
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showPicker"
        class="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4"
        @click.self="showPicker = false"
      >
        <div class="w-full max-w-md rounded-lg border border-hairline bg-canvas p-md shadow-modal">
          <h3 class="text-h4 mb-md">Выберите секцию</h3>
          <p v-if="loading" class="text-body-sm text-steel">Загрузка…</p>
          <p v-else-if="!sections.length" class="text-body-sm text-steel">
            Пока нет секций. Создайте в
            <NuxtLink to="/dashboard/sections" class="text-link hover:underline">Дашборд → Секции</NuxtLink>.
          </p>
          <ul v-else class="max-h-[60vh] overflow-y-auto divide-y divide-hairline-soft">
            <li v-for="s in sections" :key="s.id">
              <button
                type="button"
                class="w-full px-2 py-3 text-left hover:bg-surface rounded-sm"
                @click="pick(s.id)"
              >
                <p class="text-body-md text-ink">{{ s.name }}</p>
                <p v-if="s.description" class="text-caption text-steel">{{ s.description }}</p>
              </button>
            </li>
          </ul>
          <div class="mt-md flex justify-end">
            <button class="text-body-sm text-steel hover:text-ink" @click="showPicker = false">Закрыть</button>
          </div>
        </div>
      </div>
    </Teleport>
  </NodeViewWrapper>
</template>
