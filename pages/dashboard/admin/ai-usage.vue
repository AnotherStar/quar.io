<script setup lang="ts">
// AI-расходы платформы. Сводка за 30 дней, топ тенантов, последние события.
// Доступ только админам — middleware 'admin'.
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const api = useApi()

interface AiUsageRow {
  id: string
  createdAt: string
  tenantId: string
  tenantName: string | null
  tenantSlug: string | null
  userId: string | null
  userEmail: string | null
  userName: string | null
  feature: string
  model: string
  status: 'success' | 'error' | 'aborted' | string
  errorMessage: string | null
  inputTokens: number | null
  cachedInputTokens: number | null
  outputTokens: number | null
  reasoningTokens: number | null
  totalTokens: number | null
  imageCount: number | null
  estimatedCostUsd: number | null
  durationMs: number | null
  requestId: string | null
}

interface AiUsageResponse {
  totals: {
    last30d: { calls: number; tokens: number; costUsd: number; images: number; success: number; error: number; aborted: number }
    last7d: { calls: number; tokens: number; costUsd: number; images: number }
    allTime: { calls: number; tokens: number; costUsd: number; images: number }
  }
  byStatus30d: Array<{ status: string; count: number }>
  byFeature30d: Array<{ feature: string; calls: number; tokens: number; costUsd: number; images: number }>
  topTenants30d: Array<{ tenantId: string; tenantName: string; tenantSlug: string | null; calls: number; tokens: number; costUsd: number; images: number }>
  recent: AiUsageRow[]
}

const { data, pending, refresh } = await useAsyncData(
  'admin-ai-usage',
  () => api<AiUsageResponse>('/api/admin/ai-usage', { query: { limit: 100 } })
)

function formatNumber(n: number | null | undefined) {
  return new Intl.NumberFormat('ru-RU').format(n ?? 0)
}
function formatUsd(n: number | null | undefined) {
  const v = n ?? 0
  if (v === 0) return '$0'
  if (v < 0.01) return `$${v.toFixed(4)}`
  if (v < 1) return `$${v.toFixed(3)}`
  return `$${v.toFixed(2)}`
}
function formatDuration(ms: number | null) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms} мс`
  return `${(ms / 1000).toFixed(1)} с`
}
function formatDateTime(s: string) {
  return new Date(s).toLocaleString('ru-RU', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

const statusBadge = (status: string) => {
  if (status === 'success') return 'tag-green'
  if (status === 'error') return 'tag-orange'
  if (status === 'aborted') return 'tag-gray'
  return 'tag-gray'
}

const featureLabel = (feature: string) => {
  if (feature === 'instruction-generation') return 'Генерация инструкции'
  if (feature === 'image-edit') return 'Правка картинки'
  return feature
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:sparkles" title="AI-расходы">
      <template #actions>
        <UiButton variant="secondary" size="sm" :loading="pending" @click="refresh">
          <Icon name="lucide:refresh-cw" class="h-4 w-4" />
          Обновить
        </UiButton>
        <UiButton to="/dashboard/admin" variant="secondary" size="sm">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          К админке
        </UiButton>
      </template>
    </PageHeader>

    <div v-if="data" class="mt-sm space-y-2xl">
      <!-- Top counters: 30 дней -->
      <div>
        <p class="mb-md text-caption-bold uppercase tracking-wide text-steel">За последние 30 дней</p>
        <div class="grid grid-cols-2 gap-md md:grid-cols-4">
          <div class="rounded-lg bg-surface p-xl">
            <p class="text-caption-bold text-steel uppercase tracking-wide">Вызовов</p>
            <p class="mt-2 text-h2 text-navy">{{ formatNumber(data.totals.last30d.calls) }}</p>
            <p class="mt-1 text-caption text-steel">
              за 7 дней: {{ formatNumber(data.totals.last7d.calls) }}
            </p>
          </div>
          <div class="rounded-lg bg-surface p-xl">
            <p class="text-caption-bold text-steel uppercase tracking-wide">Токенов</p>
            <p class="mt-2 text-h2 text-navy">{{ formatNumber(data.totals.last30d.tokens) }}</p>
            <p class="mt-1 text-caption text-steel">
              за 7 дней: {{ formatNumber(data.totals.last7d.tokens) }}
            </p>
          </div>
          <div class="rounded-lg bg-surface p-xl">
            <p class="text-caption-bold text-steel uppercase tracking-wide">Расходы · USD</p>
            <p class="mt-2 text-h2 text-navy">{{ formatUsd(data.totals.last30d.costUsd) }}</p>
            <p class="mt-1 text-caption text-steel">
              за 7 дней: {{ formatUsd(data.totals.last7d.costUsd) }}
            </p>
          </div>
          <div class="rounded-lg bg-surface p-xl">
            <p class="text-caption-bold text-steel uppercase tracking-wide">Статус · 30 дн</p>
            <p class="mt-2 text-body-sm-md text-navy">
              <span class="text-success">✓ {{ formatNumber(data.totals.last30d.success) }}</span>
              <span class="ml-3 text-error">✕ {{ formatNumber(data.totals.last30d.error) }}</span>
            </p>
            <p class="mt-1 text-caption text-steel">
              прервано: {{ formatNumber(data.totals.last30d.aborted) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Breakdown by feature -->
      <div>
        <div class="flex items-center gap-3">
          <Icon name="lucide:layers" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">По типу запроса · 30 дней</h2>
        </div>
        <UiTable v-if="data.byFeature30d.length" min-width="560px" class="mt-md">
          <thead>
            <tr>
              <th class="text-left">Фича</th>
              <th class="text-right">Вызовов</th>
              <th class="text-right">Токенов</th>
              <th class="text-right">Картинок</th>
              <th class="text-right">USD</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.byFeature30d" :key="row.feature">
              <td class="text-body-sm text-ink">{{ featureLabel(row.feature) }}</td>
              <td class="text-right text-body-sm text-ink">{{ formatNumber(row.calls) }}</td>
              <td class="text-right text-body-sm text-ink">{{ formatNumber(row.tokens) }}</td>
              <td class="text-right text-body-sm text-ink">{{ formatNumber(row.images) }}</td>
              <td class="text-right text-body-sm-md text-ink">{{ formatUsd(row.costUsd) }}</td>
            </tr>
          </tbody>
        </UiTable>
        <p v-else class="mt-md py-md text-body text-steel">Нет данных.</p>
      </div>

      <!-- Top tenants -->
      <div>
        <div class="flex items-center gap-3">
          <Icon name="lucide:building-2" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Топ компаний · 30 дней</h2>
        </div>
        <UiTable v-if="data.topTenants30d.length" min-width="640px" class="mt-md">
          <thead>
            <tr>
              <th class="text-left">Компания</th>
              <th class="text-right">Вызовов</th>
              <th class="text-right">Токенов</th>
              <th class="text-right">Картинок</th>
              <th class="text-right">USD</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.topTenants30d" :key="row.tenantId">
              <td>
                <span class="text-body-sm-md text-ink">{{ row.tenantName }}</span>
                <span v-if="row.tenantSlug" class="ml-2 text-caption text-steel">/{{ row.tenantSlug }}</span>
              </td>
              <td class="text-right text-body-sm text-ink">{{ formatNumber(row.calls) }}</td>
              <td class="text-right text-body-sm text-ink">{{ formatNumber(row.tokens) }}</td>
              <td class="text-right text-body-sm text-ink">{{ formatNumber(row.images) }}</td>
              <td class="text-right text-body-sm-md text-ink">{{ formatUsd(row.costUsd) }}</td>
            </tr>
          </tbody>
        </UiTable>
        <p v-else class="mt-md py-md text-body text-steel">Нет данных.</p>
      </div>

      <!-- Recent events -->
      <div>
        <div class="flex items-center gap-3">
          <Icon name="lucide:list" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Последние события</h2>
        </div>
        <UiTable v-if="data.recent.length" min-width="900px" class="mt-md">
          <thead>
            <tr>
              <th class="text-left">Время</th>
              <th class="text-left">Компания</th>
              <th class="text-left">Пользователь</th>
              <th class="text-left">Фича</th>
              <th class="text-left">Модель</th>
              <th class="text-left">Статус</th>
              <th class="text-right">Токены</th>
              <th class="text-right">USD</th>
              <th class="text-right">Время</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in data.recent" :key="row.id">
              <td class="text-caption text-steel">{{ formatDateTime(row.createdAt) }}</td>
              <td class="text-body-sm text-ink">
                <span v-if="row.tenantName">{{ row.tenantName }}</span>
                <span v-else class="text-steel">—</span>
              </td>
              <td class="text-caption text-steel">
                {{ row.userName || row.userEmail || '—' }}
              </td>
              <td class="text-body-sm text-ink">{{ featureLabel(row.feature) }}</td>
              <td class="text-caption text-steel">{{ row.model }}</td>
              <td>
                <UiBadge :variant="statusBadge(row.status)">{{ row.status }}</UiBadge>
                <span
                  v-if="row.errorMessage"
                  :title="row.errorMessage"
                  class="ml-2 inline-block max-w-[200px] truncate align-middle text-caption text-error"
                >
                  {{ row.errorMessage }}
                </span>
              </td>
              <td class="text-right text-body-sm text-ink">
                <span v-if="row.totalTokens">{{ formatNumber(row.totalTokens) }}</span>
                <span v-else-if="row.imageCount">{{ formatNumber(row.imageCount) }} img</span>
                <span v-else class="text-steel">—</span>
              </td>
              <td class="text-right text-body-sm text-ink">
                <span v-if="row.estimatedCostUsd !== null">{{ formatUsd(row.estimatedCostUsd) }}</span>
                <span v-else class="text-steel">—</span>
              </td>
              <td class="text-right text-caption text-steel">{{ formatDuration(row.durationMs) }}</td>
            </tr>
          </tbody>
        </UiTable>
        <p v-if="!data.recent.length" class="py-md text-body text-steel">Событий пока нет.</p>
      </div>

      <!-- All-time -->
      <div class="rounded-lg border border-hairline p-md">
        <p class="text-caption-bold uppercase tracking-wide text-steel">За всё время</p>
        <p class="mt-1 text-body-sm text-ink">
          {{ formatNumber(data.totals.allTime.calls) }} вызовов ·
          {{ formatNumber(data.totals.allTime.tokens) }} токенов ·
          {{ formatNumber(data.totals.allTime.images) }} картинок ·
          {{ formatUsd(data.totals.allTime.costUsd) }}
        </p>
      </div>
    </div>

    <p v-else-if="pending" class="mt-md text-body text-steel">Загрузка…</p>
  </div>
</template>
