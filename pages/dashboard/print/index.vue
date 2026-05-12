<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

import type { PrintBatchListItem } from '~~/shared/schemas/printBatch'

const api = useApi()
const { currentTenant } = useAuthState()
const route = useRoute()
const router = useRouter()

const listKey = computed(() => `print-batches-${currentTenant.value?.id ?? 'none'}`)
const { data, refresh, pending } = await useAsyncData(
  listKey,
  () => api<{ batches: PrintBatchListItem[] }>('/api/print-batches'),
  {
    default: () => ({ batches: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

const tab = ref<'active' | 'archive'>(route.query.tab === 'archive' ? 'archive' : 'active')
watch(tab, (v) => {
  router.replace({ query: { ...route.query, tab: v === 'active' ? undefined : v } })
})

const allBatches = computed(() => data.value?.batches ?? [])
const batches = computed(() =>
  tab.value === 'archive'
    ? allBatches.value.filter((b) => b.archivedAt)
    : allBatches.value.filter((b) => !b.archivedAt)
)
const counts = computed(() => ({
  active: allBatches.value.filter((b) => !b.archivedAt).length,
  archive: allBatches.value.filter((b) => b.archivedAt).length
}))

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
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

function downloadHref(id: string) {
  const tid = currentTenant.value?.id
  // Скачивание — обычная ссылка, чтобы браузер сам отрисовал диалог
  // «сохранить». tenantId передаём query-параметром, потому что fetch
  // обычно идёт с x-tenant-id заголовком, а тут — голый <a href>.
  return tid ? `/api/print-batches/${id}/download?tenantId=${tid}` : `/api/print-batches/${id}/download`
}

const busyId = ref<string | null>(null)
async function archive(id: string) {
  busyId.value = id
  try {
    await api(`/api/print-batches/${id}/archive`, { method: 'POST' })
    await refresh()
  } finally {
    busyId.value = null
  }
}
async function unarchive(id: string) {
  busyId.value = id
  try {
    await api(`/api/print-batches/${id}/unarchive`, { method: 'POST' })
    await refresh()
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:printer" title="Печать">
      <template #actions>
        <UiButton variant="primary" to="/dashboard/print/new">
          <Icon name="lucide:plus" class="h-4 w-4" />
          Создать
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm">
      <UiSegmentedTabs
        v-model="tab"
        :tabs="[
          { value: 'active', label: 'Все', count: counts.active },
          { value: 'archive', label: 'Архив', count: counts.archive }
        ]"
      />
    </div>

    <Transition name="tab-content" mode="out-in">
    <div :key="tab" class="mt-xl">
      <UiTable min-width="760px">
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
          <tr v-if="pending">
            <td :colspan="9" class="py-xl">
              <div class="flex items-center justify-center gap-2 text-body-sm text-steel">
                <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                Загружаю тиражи…
              </div>
            </td>
          </tr>
          <tr v-else-if="!batches.length">
            <td :colspan="9" class="py-xl text-center text-body-sm text-steel">
              <span v-if="tab === 'archive'">Архив пуст.</span>
              <span v-else>Пока нет тиражей. Нажмите «Подготовить к печати», чтобы создать первый.</span>
            </td>
          </tr>
          <tr v-for="b in batches" v-else :key="b.id">
            <td class="text-body-sm-md text-charcoal">{{ b.templateName }}</td>
            <td class="text-body-sm text-steel">
              {{ b.templateSizeMm.width }}×{{ b.templateSizeMm.height }} мм
            </td>
            <td class="text-right text-body-sm-md text-charcoal">{{ b.count }}</td>
            <td>
              <UiBadge :variant="statusBadge(b.status).variant">{{ statusBadge(b.status).label }}</UiBadge>
              <span v-if="b.status === 'FAILED' && b.error" class="ml-xs text-caption text-steel">{{ b.error }}</span>
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
    </div>
    </Transition>
  </div>
</template>
