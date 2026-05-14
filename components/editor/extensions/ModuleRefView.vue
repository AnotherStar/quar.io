<script setup lang="ts">
// Editor view of a module reference. Renders the actual module's public
// component inline (so the user sees what their visitors will see),
// framed with a dotted outline. Kebab menu in the corner picks a
// different module or removes the block.
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { getModuleByCode } from '~~/modules-sdk/registry'

const props = defineProps(nodeViewProps)
const configId = computed(() => (props.node.attrs.tenantModuleConfigId as string | null) ?? null)
const override = computed(() => (props.node.attrs.configOverride as Record<string, unknown>) ?? {})

interface TenantModuleRow {
  id: string
  code: string
  name: string
  description: string | null
  allowedByPlan: boolean
  tenantConfig: { id: string; enabled: boolean; config: Record<string, unknown> } | null
}

const modules = useState<TenantModuleRow[] | null>('mo:editor-modules', () => null)
const loading = ref(false)
const api = useApi()

async function ensureLoaded() {
  if (modules.value !== null || loading.value) return
  loading.value = true
  try {
    const { modules: list } = await api<{ modules: TenantModuleRow[] }>('/api/modules')
    modules.value = list
  } finally { loading.value = false }
}

const current = computed(() => configId.value
  ? modules.value?.find((m) => m.tenantConfig?.id === configId.value) ?? null
  : null)
const previewComponent = shallowRef<any>(null)
const previewError = ref<string | null>(null)
// Per-instance config component (e.g. FAQ Q&A editor). Loaded lazily; absence
// is what hides the "Настроить" button — there's no flag to flip.
const editorConfigComponent = shallowRef<any>(null)
watch(current, async (m) => {
  previewComponent.value = null
  previewError.value = null
  editorConfigComponent.value = null
  if (!m) return
  const def = getModuleByCode(m.code)
  if (!def) { previewError.value = `Модуль "${m.code}" не зарегистрирован`; return }
  try {
    const mod = await def.PublicComponent()
    previewComponent.value = mod.default
  } catch (e) {
    previewError.value = (e as Error).message
  }
  if (def.EditorConfigComponent) {
    try {
      const cfg = await def.EditorConfigComponent()
      editorConfigComponent.value = cfg.default
    } catch (e) {
      // Soft-fail — base block still works without per-instance config.
      console.warn('[module-ref] failed to load editor config component:', e)
    }
  }
}, { immediate: true })

const mergedConfig = computed(() => ({
  ...(current.value?.tenantConfig?.config ?? {}),
  ...override.value
}))

function deleteBlock() {
  const pos = typeof props.getPos === 'function' ? props.getPos() : null
  if (pos == null) return
  props.editor.chain().focus().deleteRange({ from: pos, to: pos + props.node.nodeSize }).run()
}

// Per-instance config modal. Local draft is committed to node attrs only when
// the user clicks "Сохранить" — Cancel/Esc discards. Keeps undo history clean.
const configModalOpen = ref(false)
const configDraft = ref<Record<string, unknown>>({})

function openConfig() {
  configDraft.value = JSON.parse(JSON.stringify(override.value || {}))
  configModalOpen.value = true
}
function saveConfig() {
  props.updateAttributes({ configOverride: configDraft.value })
  configModalOpen.value = false
}
function cancelConfig() {
  configModalOpen.value = false
}
function onConfigKey(e: KeyboardEvent) {
  if (e.key === 'Escape') cancelConfig()
}

onMounted(ensureLoaded)
</script>

<template>
  <NodeViewWrapper class="relative my-3 not-prose" data-type="module-ref">
    <!-- Кнопки действий над блоком: настроить (если у модуля есть editor config)
         и удалить. Picker модуля живёт в тулбаре. -->
    <div class="absolute right-0 -top-3 z-10 flex items-center gap-1" contenteditable="false">
      <button
        v-if="current && editorConfigComponent"
        type="button"
        class="grid h-7 w-7 place-items-center rounded-sm border border-hairline bg-canvas/95 text-steel hover:text-ink"
        title="Настроить модуль"
        @click.stop="openConfig"
      >
        <Icon name="lucide:settings-2" class="h-4 w-4" />
      </button>
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
      <div v-if="!configId" class="flex items-center gap-2 py-md text-body-sm text-hairline-strong">
        <Icon name="lucide:puzzle" class="h-4 w-4" />
        Модуль не выбран
      </div>
      <div v-else-if="!current" class="py-md text-body-sm text-error">
        <span v-if="loading">Загрузка…</span>
        <span v-else>Модуль не найден или выключен.</span>
      </div>
      <div v-else-if="previewError" class="py-md text-body-sm text-error">{{ previewError }}</div>
      <div v-else class="pointer-events-none">
        <ClientOnly>
          <component
            :is="previewComponent"
            v-if="previewComponent"
            :instruction-id="''"
            :config="mergedConfig"
            :viewer-session-id="'editor-preview'"
          />
        </ClientOnly>
      </div>
    </div>

    <!-- Per-instance config modal. Rendered as a Teleport so it sits above
         the editor and never inherits its `not-prose` / `pointer-events-none`
         wrappers. -->
    <Teleport v-if="configModalOpen" to="body">
      <div
        class="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-ink/40 p-md backdrop-blur-sm"
        contenteditable="false"
        @click.self="cancelConfig"
        @keydown="onConfigKey"
      >
        <div class="my-xl w-full max-w-[640px] rounded-lg border border-hairline bg-canvas shadow-modal">
          <header class="flex items-center justify-between gap-md border-b border-hairline px-xl py-md">
            <div class="min-w-0">
              <h3 class="truncate text-h4 text-ink">Настройка модуля</h3>
              <p v-if="current" class="mt-0.5 truncate text-body-sm text-steel">{{ current.name }}</p>
            </div>
            <button
              type="button"
              class="grid h-8 w-8 place-items-center rounded-sm text-steel hover:bg-surface"
              title="Закрыть"
              @click="cancelConfig"
            >
              <Icon name="lucide:x" class="h-4 w-4" />
            </button>
          </header>
          <div class="px-xl py-md">
            <ClientOnly>
              <component
                :is="editorConfigComponent"
                v-if="editorConfigComponent"
                v-model="configDraft"
              />
            </ClientOnly>
          </div>
          <footer class="flex items-center justify-end gap-2 border-t border-hairline px-xl py-md">
            <UiButton variant="ghost" @click="cancelConfig">Отмена</UiButton>
            <UiButton variant="primary" @click="saveConfig">Сохранить</UiButton>
          </footer>
        </div>
      </div>
    </Teleport>
  </NodeViewWrapper>
</template>
