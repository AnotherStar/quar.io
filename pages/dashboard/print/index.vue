<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

import type { PrintBatchListItem } from '~~/shared/schemas/printBatch'

const api = useApi()
const { currentTenant } = useAuthState()

const listKey = computed(() => `print-batches-${currentTenant.value?.id ?? 'none'}`)
const { data, refresh, pending } = await useAsyncData(
  listKey,
  () => api<{ batches: PrintBatchListItem[] }>('/api/print-batches'),
  {
    default: () => ({ batches: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

const batches = computed(() => data.value?.batches ?? [])

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
</script>

<template>
  <div>
    <PageHeader icon="lucide:printer" title="Печать">
      <template #actions>
        <UiButton variant="primary" to="/dashboard/print/new">
          <Icon name="lucide:plus" class="h-4 w-4" />
          Подготовить к печати
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm space-y-xl">
      <div>
        <table class="w-full">
          <thead>
            <tr class="border-b border-hairline text-caption text-steel uppercase">
              <th class="pb-sm text-left">Шаблон</th>
              <th class="pb-sm text-left">Размер</th>
              <th class="pb-sm text-right">Кол-во</th>
              <th class="pb-sm text-left">Статус</th>
              <th class="pb-sm text-left">Создан</th>
              <th class="pb-sm text-left">Автор</th>
              <th class="pb-sm text-right">Файл</th>
              <th class="w-10 pb-sm" />
            </tr>
          </thead>
          <tbody>
            <tr v-if="pending">
              <td :colspan="8" class="py-xl">
                <div class="flex items-center justify-center gap-2 text-body-sm text-steel">
                  <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                  Загружаю тиражи…
                </div>
              </td>
            </tr>
            <tr v-else-if="!batches.length">
              <td :colspan="8" class="py-xl text-center text-body-sm text-steel">
                Пока нет тиражей. Нажмите «Подготовить к печати», чтобы создать первый.
              </td>
            </tr>
            <tr
              v-for="b in batches"
              v-else
              :key="b.id"
              class="border-b border-hairline-soft"
            >
              <td class="py-sm text-body-sm-md text-charcoal">{{ b.templateName }}</td>
              <td class="py-sm text-body-sm text-steel">
                {{ b.templateSizeMm.width }}×{{ b.templateSizeMm.height }} мм
              </td>
              <td class="py-sm text-right text-body-sm-md text-charcoal">{{ b.count }}</td>
              <td class="py-sm">
                <UiBadge :variant="statusBadge(b.status).variant">{{ statusBadge(b.status).label }}</UiBadge>
                <span v-if="b.status === 'FAILED' && b.error" class="ml-xs text-caption text-steel">{{ b.error }}</span>
              </td>
              <td class="py-sm text-body-sm text-steel">{{ fmtDate(b.createdAt) }}</td>
              <td class="py-sm text-body-sm text-steel">{{ b.createdByEmail || '—' }}</td>
              <td class="py-sm text-right text-caption text-steel">{{ fmtSize(b.pdfSizeBytes) }}</td>
              <td class="py-sm text-right">
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
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
