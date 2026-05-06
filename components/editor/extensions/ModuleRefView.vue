<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const configId = computed(() => (props.node.attrs.tenantModuleConfigId as string | null) ?? null)
const modules = ref<any[]>([])
const showPicker = ref(false)
const loading = ref(false)

const api = useApi()

async function load() {
  loading.value = true
  try {
    const { modules: list } = await api<{ modules: any[] }>('/api/modules')
    modules.value = list
  } finally { loading.value = false }
}

const current = computed(() => modules.value.find((m) => m.tenantConfig?.id === configId.value))
const enabledModules = computed(() => modules.value.filter((m) => m.tenantConfig?.enabled && m.allowedByPlan))

function pick(id: string) {
  props.updateAttributes({ tenantModuleConfigId: id })
  showPicker.value = false
}
function unset() { props.updateAttributes({ tenantModuleConfigId: null }) }

onMounted(load)
</script>

<template>
  <NodeViewWrapper class="my-3 not-prose" data-type="module-ref">
    <div
      class="rounded-md border border-dashed border-primary/40 bg-tint-mint/40 p-md transition-colors"
      contenteditable="false"
    >
      <div class="flex items-start justify-between gap-md">
        <div class="min-w-0 flex-1">
          <p class="text-caption-bold uppercase tracking-wide text-brand-green">
            🧩 Модуль
          </p>
          <p v-if="current" class="mt-1 text-h5 text-ink truncate">{{ current.name }}</p>
          <p v-else-if="configId" class="mt-1 text-body-sm text-error">Модуль не найден / выключен</p>
          <p v-else class="mt-1 text-body-sm text-steel">Не выбран</p>
          <p v-if="current?.description" class="mt-1 text-caption text-steel">{{ current.description }}</p>
        </div>
        <div class="flex shrink-0 gap-1">
          <button
            type="button"
            class="rounded-sm border border-hairline-strong px-2 py-1 text-caption hover:bg-canvas"
            @click="showPicker = true"
          >
            {{ configId ? 'Сменить' : 'Выбрать' }}
          </button>
          <button
            v-if="configId"
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
          <h3 class="text-h4 mb-md">Выберите модуль</h3>
          <p v-if="loading" class="text-body-sm text-steel">Загрузка…</p>
          <p v-else-if="!enabledModules.length" class="text-body-sm text-steel">
            Нет включённых модулей. Включите в
            <NuxtLink to="/dashboard/modules" class="text-link hover:underline">Дашборд → Модули</NuxtLink>.
          </p>
          <ul v-else class="max-h-[60vh] overflow-y-auto divide-y divide-hairline-soft">
            <li v-for="m in enabledModules" :key="m.tenantConfig.id">
              <button
                type="button"
                class="w-full px-2 py-3 text-left hover:bg-surface rounded-sm"
                @click="pick(m.tenantConfig.id)"
              >
                <p class="text-body-md text-ink">{{ m.name }}</p>
                <p v-if="m.description" class="text-caption text-steel">{{ m.description }}</p>
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
