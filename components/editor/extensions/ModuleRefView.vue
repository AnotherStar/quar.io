<script setup lang="ts">
// Editor view of a module reference. Renders the actual module's public
// component inline (so the user sees what their visitors will see),
// framed with a dotted outline. Kebab menu in the corner picks a
// different module or removes the block.
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { onClickOutside } from '@vueuse/core'
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
const enabledModules = computed(
  () => modules.value?.filter((m) => m.tenantConfig?.enabled && m.allowedByPlan) ?? []
)

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

// Menu
const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)
onClickOutside(menuRef, () => { menuOpen.value = false })

function pick(tenantConfigId: string) {
  props.updateAttributes({ tenantModuleConfigId: tenantConfigId })
  menuOpen.value = false
}
function deleteBlock() {
  menuOpen.value = false
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
  menuOpen.value = false
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
    <div ref="menuRef" class="absolute right-0 -top-3 z-10" contenteditable="false">
        <button
          type="button"
          class="grid h-7 w-7 place-items-center rounded-sm border border-hairline bg-canvas/95 text-steel hover:text-ink"
          title="Параметры модуля"
          @click.stop="menuOpen = !menuOpen"
        >
          <Icon name="lucide:ellipsis-vertical" class="h-4 w-4" />
        </button>

        <div
          v-if="menuOpen"
          class="absolute right-0 top-full mt-1 w-72 overflow-hidden rounded-md border border-hairline bg-canvas shadow-modal"
        >
          <p class="px-3 pt-2 text-caption text-steel uppercase tracking-wide">Модуль</p>
          <p v-if="loading" class="px-3 py-2 text-body-sm text-steel">Загрузка…</p>
          <p v-else-if="!enabledModules.length" class="px-3 py-2 text-body-sm text-steel">
            Нет включённых модулей.
            <NuxtLink to="/dashboard/modules" class="text-link hover:underline" @click="menuOpen = false">
              Включить
            </NuxtLink>
          </p>
          <ul v-else class="max-h-[40vh] overflow-y-auto py-1">
            <li v-for="m in enabledModules" :key="m.tenantConfig!.id">
              <button
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-surface"
                @click="pick(m.tenantConfig!.id)"
              >
                <Icon
                  :name="m.tenantConfig!.id === configId ? 'lucide:check' : 'lucide:puzzle'"
                  :class="['h-4 w-4 shrink-0', m.tenantConfig!.id === configId ? 'text-primary' : 'text-steel']"
                />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-body-sm" :class="m.tenantConfig!.id === configId ? 'text-ink font-medium' : 'text-charcoal'">
                    {{ m.name }}
                  </span>
                  <span v-if="m.description" class="block truncate text-caption text-steel">{{ m.description }}</span>
                </span>
              </button>
            </li>
          </ul>
          <hr v-if="current && editorConfigComponent" class="border-hairline">
          <button
            v-if="current && editorConfigComponent"
            type="button"
            class="flex w-full items-center gap-2 px-3 py-2 text-left text-body-sm text-ink hover:bg-surface"
            @click="openConfig"
          >
            <Icon name="lucide:settings-2" class="h-4 w-4 text-steel" />
            Настроить
          </button>
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
      <div v-if="!configId" class="flex items-center gap-2 py-md text-body-sm text-stone">
        <Icon name="lucide:puzzle" class="h-4 w-4" />
        Модуль не выбран — откройте меню справа
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
