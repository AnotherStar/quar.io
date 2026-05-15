<script setup lang="ts">
// Хаб раздела «Печать»: три вкладки на верхнем уровне.
//   - Тиражи: активные PDF-тиражи, готовые к скачиванию.
//   - Архив: то же, но архивированные.
//   - Шаблоны: каталог шаблонов (системные + кастомные своего тенанта +
//              публичные шаблоны от админа). Раньше каталог был спрятан
//              внутри «Подготовка к печати», теперь — отдельная вкладка.
//
// Сабтаб active/archive раньше переключался через query ?tab=archive — этот
// контракт сохранён: ?tab=archive открывает «Архив», ?tab=templates — «Шаблоны».
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

import type { PrintBatchListItem, PrintTemplateListItem } from '~~/shared/schemas/printBatch'

type Tab = 'active' | 'archive' | 'templates'

const api = useApi()
const { currentTenant } = useAuthState()
const route = useRoute()
const router = useRouter()

function parseTab(value: unknown): Tab {
  if (value === 'archive' || value === 'templates') return value
  return 'active'
}

const tab = ref<Tab>(parseTab(route.query.tab))
watch(tab, (v) => {
  router.replace({ query: { ...route.query, tab: v === 'active' ? undefined : v } })
})

// ── Тиражи ──────────────────────────────────────────────────────────────────
const batchesKey = computed(() => `print-batches-${currentTenant.value?.id ?? 'none'}`)
const { data: batchesData, refresh: refreshBatches, pending: batchesPending } = await useAsyncData(
  batchesKey,
  () => api<{ batches: PrintBatchListItem[] }>('/api/print-batches'),
  {
    default: () => ({ batches: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

const allBatches = computed(() => batchesData.value?.batches ?? [])
const batchesForTab = computed(() =>
  tab.value === 'archive'
    ? allBatches.value.filter((b) => b.archivedAt)
    : allBatches.value.filter((b) => !b.archivedAt)
)
const counts = computed(() => ({
  active: allBatches.value.filter((b) => !b.archivedAt).length,
  archive: allBatches.value.filter((b) => b.archivedAt).length
}))

// ── Шаблоны ─────────────────────────────────────────────────────────────────
const templatesKey = computed(() => `print-templates-list-${currentTenant.value?.id ?? 'none'}`)
const { data: templatesData, pending: templatesPending } = await useAsyncData(
  templatesKey,
  () => api<{ templates: PrintTemplateListItem[] }>('/api/print-templates'),
  {
    default: () => ({ templates: [] }),
    watch: [() => currentTenant.value?.id]
  }
)
const templates = computed(() => templatesData.value?.templates ?? [])
const templatesCount = computed(() => templates.value.length)

// ── Утилиты ─────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('ru', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function fmtSize(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

function statusBadge(status: PrintBatchListItem['status']) {
  if (status === 'READY') return { variant: 'tag-green' as const, label: 'Готов' }
  if (status === 'GENERATING') return { variant: 'tag-gray' as const, label: 'Готовится' }
  return { variant: 'tag-orange' as const, label: 'Ошибка' }
}

function templateKindBadge(kind: PrintTemplateListItem['kind']) {
  if (kind === 'public') return { variant: 'tag-blue' as const, label: 'Общий' }
  if (kind === 'custom') return { variant: 'tag-gray' as const, label: 'Свой' }
  return { variant: 'tag-gray' as const, label: 'Системный' }
}

function downloadHref(id: string) {
  const tid = currentTenant.value?.id
  return tid
    ? `/api/print-batches/${id}/download?tenantId=${tid}`
    : `/api/print-batches/${id}/download`
}

const busyId = ref<string | null>(null)
async function archive(id: string) {
  busyId.value = id
  try {
    await api(`/api/print-batches/${id}/archive`, { method: 'POST' })
    await refreshBatches()
  } finally {
    busyId.value = null
  }
}
async function unarchive(id: string) {
  busyId.value = id
  try {
    await api(`/api/print-batches/${id}/unarchive`, { method: 'POST' })
    await refreshBatches()
  } finally {
    busyId.value = null
  }
}

function useTemplate(code: string) {
  router.push({ path: '/dashboard/print/new', query: { template: code } })
}

// Из code 'custom:<cuid>' достаём cuid, чтобы построить ссылку редактирования.
// Системные шаблоны не редактируются — кнопка под них не показывается.
function extractCustomId(code: string): string | null {
  return code.startsWith('custom:') ? code.slice('custom:'.length) : null
}

function editTemplate(code: string) {
  const id = extractCustomId(code)
  if (!id) return
  router.push(`/dashboard/print/templates/${id}`)
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:printer" title="Печать">
      <template #actions>
        <UiButton
          v-if="tab === 'templates'"
          variant="secondary"
          to="/dashboard/print/templates/new"
        >
          <Icon name="lucide:palette" class="h-4 w-4" />
          Создать шаблон
        </UiButton>
        <UiButton variant="primary" to="/dashboard/print/new">
          <Icon name="lucide:plus" class="h-4 w-4" />
          Создать тираж
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm">
      <UiSegmentedTabs
        v-model="tab"
        :tabs="[
          { value: 'active', label: 'Тиражи', count: counts.active },
          { value: 'archive', label: 'Архив', count: counts.archive },
          { value: 'templates', label: 'Шаблоны', count: templatesCount }
        ]"
      />
    </div>

    <Transition name="tab-content" mode="out-in">
      <div :key="tab" class="mt-xl">
        <!-- ── Тиражи / Архив ───────────────────────────────────────────── -->
        <UiTable v-if="tab !== 'templates'" min-width="760px">
          <thead>
            <tr>
              <th class="text-left">Шаблон</th>
              <th class="text-left">Размер</th>
              <th class="text-right">Кол-во</th>
              <th class="text-left">Статус</th>
              <th class="text-left">Создан</th>
              <th class="text-left">Автор</th>
              <th class="text-right">Файл</th>
              <th class="w-10" />
              <th class="w-10" />
            </tr>
          </thead>
          <tbody>
            <tr v-if="batchesPending">
              <td :colspan="9" class="py-xl">
                <div class="flex items-center justify-center gap-2 text-body-sm text-steel">
                  <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                  Загружаю тиражи…
                </div>
              </td>
            </tr>
            <tr v-else-if="!batchesForTab.length">
              <td :colspan="9" class="py-xl text-center text-body-sm text-steel">
                <span v-if="tab === 'archive'">Архив пуст.</span>
                <span v-else>Пока нет тиражей. Нажмите «Создать тираж», чтобы сделать первый.</span>
              </td>
            </tr>
            <tr v-for="b in batchesForTab" v-else :key="b.id">
              <td class="text-body-sm-md text-charcoal">{{ b.templateName }}</td>
              <td class="text-body-sm text-steel">
                {{ b.templateSizeMm.width }}×{{ b.templateSizeMm.height }} мм
              </td>
              <td class="text-right text-body-sm-md text-charcoal">{{ b.count }}</td>
              <td>
                <UiBadge :variant="statusBadge(b.status).variant">
                  {{ statusBadge(b.status).label }}
                </UiBadge>
                <span v-if="b.status === 'FAILED' && b.error" class="ml-xs text-caption text-steel">
                  {{ b.error }}
                </span>
              </td>
              <td class="text-body-sm text-steel">{{ fmtDate(b.createdAt) }}</td>
              <td class="text-body-sm text-steel">{{ b.createdByEmail || '—' }}</td>
              <td class="text-right text-caption text-steel">{{ fmtSize(b.pdfSizeBytes) }}</td>
              <td class="text-right">
                <a
                  v-if="b.status === 'READY'"
                  :href="downloadHref(b.id)"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-steel hover:bg-surface hover:text-ink"
                  aria-label="Скачать PDF"
                  download
                >
                  <Icon name="lucide:download" class="h-4 w-4" />
                </a>
              </td>
              <td class="text-right">
                <button
                  v-if="!b.archivedAt"
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-steel hover:bg-surface hover:text-ink disabled:opacity-60"
                  :disabled="busyId === b.id"
                  aria-label="В архив"
                  title="В архив"
                  @click="archive(b.id)"
                >
                  <Icon name="lucide:archive" class="h-4 w-4" />
                </button>
                <button
                  v-else
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md text-steel hover:bg-surface hover:text-ink disabled:opacity-60"
                  :disabled="busyId === b.id"
                  aria-label="Восстановить"
                  title="Восстановить"
                  @click="unarchive(b.id)"
                >
                  <Icon name="lucide:archive-restore" class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </UiTable>

        <!-- ── Шаблоны ──────────────────────────────────────────────────── -->
        <div v-else>
          <p
            v-if="templatesPending"
            class="flex items-center justify-center gap-2 py-xl text-body-sm text-steel"
          >
            <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
            Загружаю шаблоны…
          </p>
          <p
            v-else-if="!templates.length"
            class="py-xl text-center text-body-sm text-steel"
          >
            Шаблонов пока нет. Нажмите «Создать шаблон», чтобы сделать первый.
          </p>
          <div
            v-else
            class="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <article
              v-for="t in templates"
              :key="t.code"
              class="flex flex-col overflow-hidden rounded-lg border border-hairline bg-surface"
            >
              <div class="relative aspect-[4/3] w-full overflow-hidden bg-tint-gray">
                <img
                  v-if="t.previewUrl"
                  :src="t.previewUrl"
                  :alt="t.name"
                  class="absolute inset-0 h-full w-full object-contain p-md"
                  loading="lazy"
                >
                <div
                  v-else
                  class="absolute inset-0 flex items-center justify-center text-caption text-steel"
                >
                  Нет превью
                </div>
              </div>
              <div class="flex flex-1 flex-col gap-2 p-md">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-body-sm-md text-ink">{{ t.name }}</span>
                  <UiBadge :variant="templateKindBadge(t.kind).variant">
                    {{ templateKindBadge(t.kind).label }}
                  </UiBadge>
                  <UiBadge v-if="t.isPublic" variant="tag-blue">
                    Публичный
                  </UiBadge>
                </div>
                <p class="text-caption text-steel">
                  {{ t.size.widthMm }}×{{ t.size.heightMm }} мм
                </p>
                <p class="text-body-sm text-steel">{{ t.description }}</p>
                <div class="mt-auto flex flex-wrap justify-end gap-2 pt-sm">
                  <UiButton
                    v-if="t.kind === 'custom'"
                    size="sm"
                    variant="secondary"
                    @click="editTemplate(t.code)"
                  >
                    <Icon name="lucide:pencil" class="h-4 w-4" />
                    Редактировать
                  </UiButton>
                  <UiButton size="sm" variant="secondary" @click="useTemplate(t.code)">
                    <Icon name="lucide:printer" class="h-4 w-4" />
                    Использовать
                  </UiButton>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
