<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const api = useApi()
const { currentTenant } = useAuthState()

type Tab = 'dashboard' | 'visits'
const tab = ref<Tab>((route.query.tab === 'visits' ? 'visits' : 'dashboard'))
const tabs: Array<{ value: Tab; label: string }> = [
  { value: 'dashboard', label: 'Дашборд' },
  { value: 'visits', label: 'Визиты' }
]
watch(tab, (v) => {
  router.replace({ query: { ...route.query, tab: v === 'dashboard' ? undefined : v } })
})

// Period selector — shared between tabs.
const days = ref<number>(Number(route.query.days ?? 30) || 30)
const periods = [7, 30, 90]
watch(days, (v) => {
  router.replace({ query: { ...route.query, days: v === 30 ? undefined : String(v) } })
})

// ─── Dashboard tab ────────────────────────────────────────────────────────
const overviewKey = computed(() => `analytics-overview-${currentTenant.value?.id ?? 'none'}-${days.value}`)
const { data: overview, pending: overviewPending } = await useAsyncData(
  overviewKey,
  () => api<any>(`/api/analytics/overview?days=${days.value}`),
  { watch: [() => currentTenant.value?.id, days] }
)

const maxByDay = computed(() => {
  const xs = (overview.value?.byDay ?? []) as Array<{ visits: number }>
  return Math.max(1, ...xs.map((d) => d.visits))
})

function formatDuration(ms: number): string {
  if (!ms) return '0с'
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}с`
  const m = Math.floor(s / 60)
  const rs = s % 60
  return rs ? `${m}м ${rs}с` : `${m}м`
}

function formatDay(d: string | Date): string {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })
}

function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const entrySourceLabel: Record<string, string> = {
  qr: 'QR',
  utm: 'UTM',
  referral: 'Реферал',
  internal: 'Внутренний',
  direct: 'Прямой',
  unknown: 'Неизвестно'
}

// ─── Visits tab ───────────────────────────────────────────────────────────
const page = ref(1)
const pageSize = ref(25)
const filterInstructionId = ref<string>('')
const filterEntrySource = ref<string>('')
const filterReturning = ref<string>('')

const visitsKey = computed(() =>
  `analytics-visits-${currentTenant.value?.id ?? 'none'}-${days.value}-${page.value}-${pageSize.value}` +
  `-${filterInstructionId.value}-${filterEntrySource.value}-${filterReturning.value}`
)

const visitsQuery = computed(() => {
  const p = new URLSearchParams({
    page: String(page.value),
    pageSize: String(pageSize.value),
    days: String(days.value)
  })
  if (filterInstructionId.value) p.set('instructionId', filterInstructionId.value)
  if (filterEntrySource.value) p.set('entrySource', filterEntrySource.value)
  if (filterReturning.value) p.set('isReturning', filterReturning.value)
  return p.toString()
})

const { data: visitsData, pending: visitsPending } = await useAsyncData(
  visitsKey,
  () => api<any>(`/api/analytics/visits?${visitsQuery.value}`),
  { watch: [() => currentTenant.value?.id, days, page, pageSize, filterInstructionId, filterEntrySource, filterReturning] }
)

watch([filterInstructionId, filterEntrySource, filterReturning, days], () => { page.value = 1 })

// Instructions list for the filter dropdown — reuse the overview's topInstructions
// plus a "All" option. Larger lists can ship a dedicated endpoint later.
const instructionsList = computed(() => overview.value?.topInstructions ?? [])

// ─── Visit detail modal ───────────────────────────────────────────────────
// Manual $fetch instead of useAsyncData — a reactive useAsyncData key combined
// with `immediate: false` leaves `pending` stuck on first open.
const detailId = ref<string | null>(null)
const detail = ref<any>(null)
const detailPending = ref(false)

async function openVisit(id: string) {
  detailId.value = id
  detail.value = null
  detailPending.value = true
  try {
    detail.value = await api<any>(`/api/analytics/visits/${id}`)
  } catch (e) {
    console.error('[analytics] visit detail failed', e)
  } finally {
    detailPending.value = false
  }
}
function closeVisit() {
  detailId.value = null
  detail.value = null
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:bar-chart-3" title="Аналитика">
      <template #actions>
        <div class="inline-flex h-9 items-stretch overflow-hidden rounded-md border border-hairline">
          <button
            v-for="p in periods"
            :key="p"
            type="button"
            :class="['px-md text-caption-bold transition-colors', days === p ? 'bg-primary text-on-primary' : 'bg-canvas text-charcoal hover:bg-hairline-soft']"
            @click="days = p"
          >
            {{ p }}д
          </button>
        </div>
      </template>
    </PageHeader>

    <div class="mt-sm">
      <UiSegmentedTabs v-model="tab" :tabs="tabs" />
    </div>

    <!-- ─── Дашборд ────────────────────────────────────────────────────── -->
    <div v-show="tab === 'dashboard'" class="mt-xl space-y-2xl">
      <div v-if="overviewPending && !overview" class="rounded-lg bg-surface p-2xl text-center text-body-sm text-steel">
        Загрузка…
      </div>

      <template v-else>
        <!-- Метрики -->
        <div class="grid grid-cols-2 gap-md md:grid-cols-5">
          <div class="rounded-lg bg-surface p-xl">
            <p class="text-caption-bold uppercase tracking-wide text-steel">Визиты</p>
            <p class="mt-2 text-h2 text-navy">{{ overview?.totals.visits ?? 0 }}</p>
          </div>
          <div class="rounded-lg bg-surface p-xl">
            <p class="text-caption-bold uppercase tracking-wide text-steel">Уник. сессий</p>
            <p class="mt-2 text-h2 text-navy">{{ overview?.totals.uniqueSessions ?? 0 }}</p>
          </div>
          <div class="rounded-lg bg-surface p-xl">
            <p class="text-caption-bold uppercase tracking-wide text-steel">Просмотры</p>
            <p class="mt-2 text-h2 text-navy">{{ overview?.totals.pageViews ?? 0 }}</p>
          </div>
          <div class="rounded-lg bg-surface p-xl">
            <p class="text-caption-bold uppercase tracking-wide text-steel">Среднее время</p>
            <p class="mt-2 text-h2 text-navy">{{ formatDuration(overview?.totals.avgDurationMs ?? 0) }}</p>
          </div>
          <div class="rounded-lg bg-surface p-xl">
            <p class="text-caption-bold uppercase tracking-wide text-steel">Средний скролл</p>
            <p class="mt-2 text-h2 text-navy">{{ overview?.totals.avgScrollDepth ?? 0 }}%</p>
          </div>
        </div>

        <!-- Динамика по дням -->
        <UiCard>
          <div class="flex items-center justify-between">
            <h3 class="text-h5 text-navy">Визиты по дням</h3>
            <span class="text-caption text-steel">Последние {{ days }} дн.</span>
          </div>
          <div v-if="!overview?.byDay?.length" class="mt-md py-lg text-center text-body-sm text-steel">
            Данных пока нет.
          </div>
          <div v-else class="mt-md flex h-32 items-end gap-1">
            <div
              v-for="d in overview.byDay"
              :key="d.day"
              class="group relative flex-1 min-w-[6px] rounded-t bg-tint-lavender hover:bg-primary/60"
              :style="{ height: `${Math.max(4, (d.visits / maxByDay) * 100)}%` }"
              :title="`${formatDay(d.day)}: ${d.visits} визитов, ${d.pageViews} просмотров`"
            />
          </div>
          <div v-if="overview?.byDay?.length" class="mt-1 flex justify-between text-caption text-steel">
            <span>{{ formatDay(overview.byDay[0].day) }}</span>
            <span>{{ formatDay(overview.byDay[overview.byDay.length - 1].day) }}</span>
          </div>
        </UiCard>

        <!-- Топ инструкций -->
        <UiCard>
          <div class="flex items-center justify-between">
            <h3 class="text-h5 text-navy">Топ инструкций</h3>
            <UiButton to="/dashboard/instructions" variant="secondary" size="sm">Все инструкции</UiButton>
          </div>
          <div v-if="!overview?.topInstructions?.length" class="mt-md py-lg text-center text-body-sm text-steel">
            Пока нет визитов.
          </div>
          <table v-else class="mt-md w-full text-body-sm">
            <thead class="text-caption-bold uppercase tracking-wide text-steel">
              <tr class="border-b border-hairline-soft">
                <th class="py-2 text-left font-normal">Инструкция</th>
                <th class="py-2 text-right font-normal">Визиты</th>
                <th class="py-2 text-right font-normal">Просмотры</th>
                <th class="py-2 text-right font-normal">Среднее время</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-hairline-soft">
              <tr v-for="i in overview.topInstructions" :key="i.id">
                <td class="py-2 pr-md">
                  <NuxtLink :to="`/dashboard/instructions/${i.id}/analytics`" class="text-ink hover:text-primary">
                    {{ i.title }}
                  </NuxtLink>
                </td>
                <td class="py-2 text-right tabular-nums">{{ i.visits }}</td>
                <td class="py-2 text-right tabular-nums text-steel">{{ i.pageViews }}</td>
                <td class="py-2 text-right tabular-nums text-steel">{{ formatDuration(i.avgDurationMs) }}</td>
              </tr>
            </tbody>
          </table>
        </UiCard>

        <!-- Источники и устройства -->
        <div class="grid grid-cols-1 gap-md md:grid-cols-2">
          <UiCard>
            <h3 class="text-h5 mb-md text-navy">Источник захода</h3>
            <ul class="divide-y divide-hairline-soft">
              <li v-for="r in overview?.byEntrySource" :key="r.source" class="flex items-center justify-between py-2 text-body-sm">
                <UiBadge :variant="r.source === 'qr' ? 'tag-green' : r.source === 'utm' ? 'tag-orange' : 'tag-gray'">
                  {{ entrySourceLabel[r.source] ?? r.source }}
                </UiBadge>
                <span class="tabular-nums text-steel">{{ r.count }}</span>
              </li>
              <li v-if="!overview?.byEntrySource?.length" class="py-md text-center text-steel">Нет данных</li>
            </ul>
          </UiCard>

          <UiCard>
            <h3 class="text-h5 mb-md text-navy">UTM-источники</h3>
            <ul class="divide-y divide-hairline-soft">
              <li v-for="r in overview?.byUtmSource" :key="r.utmSource" class="flex items-center justify-between py-2 text-body-sm">
                <span class="text-charcoal">{{ r.utmSource }}</span>
                <span class="tabular-nums text-steel">{{ r.count }}</span>
              </li>
              <li v-if="!overview?.byUtmSource?.length" class="py-md text-center text-steel">Нет UTM-меток</li>
            </ul>
          </UiCard>

          <UiCard>
            <h3 class="text-h5 mb-md text-navy">По странам</h3>
            <ul class="divide-y divide-hairline-soft max-h-[280px] overflow-y-auto">
              <li v-for="r in overview?.byCountry" :key="r.country" class="flex items-center justify-between py-2 text-body-sm">
                <span class="text-charcoal">{{ r.country }}</span>
                <span class="tabular-nums text-steel">{{ r.count }}</span>
              </li>
              <li v-if="!overview?.byCountry?.length" class="py-md text-center text-steel">Нет данных</li>
            </ul>
          </UiCard>

          <UiCard>
            <h3 class="text-h5 mb-md text-navy">По устройствам</h3>
            <ul class="divide-y divide-hairline-soft">
              <li v-for="r in overview?.byDevice" :key="r.deviceType" class="flex items-center justify-between py-2 text-body-sm">
                <span class="text-charcoal capitalize">{{ r.deviceType }}</span>
                <span class="tabular-nums text-steel">{{ r.count }}</span>
              </li>
              <li v-if="!overview?.byDevice?.length" class="py-md text-center text-steel">Нет данных</li>
            </ul>
          </UiCard>
        </div>

        <!-- Цели -->
        <UiCard>
          <h3 class="text-h5 mb-md text-navy">Цели</h3>
          <div v-if="!overview?.goalsByCode?.length" class="py-md text-center text-body-sm text-steel">
            Пока не зафиксировано ни одной цели.
          </div>
          <div v-else class="grid grid-cols-2 gap-md md:grid-cols-4">
            <div v-for="g in overview.goalsByCode" :key="g.code" class="rounded-md border border-hairline-soft p-md">
              <p class="font-mono text-caption text-steel">{{ g.code }}</p>
              <p class="mt-1 text-h3 text-navy tabular-nums">{{ g.count }}</p>
            </div>
          </div>
        </UiCard>
      </template>
    </div>

    <!-- ─── Визиты ────────────────────────────────────────────────────── -->
    <div v-show="tab === 'visits'" class="mt-xl space-y-md">
      <UiCard>
        <div class="flex flex-wrap items-center gap-sm">
          <label class="flex items-center gap-2 text-body-sm text-steel">
            Инструкция
            <select v-model="filterInstructionId" class="h-9 rounded-md border border-hairline bg-canvas px-sm text-body-sm text-ink">
              <option value="">Все</option>
              <option v-for="i in instructionsList" :key="i.id" :value="i.id">{{ i.title }}</option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-body-sm text-steel">
            Источник
            <select v-model="filterEntrySource" class="h-9 rounded-md border border-hairline bg-canvas px-sm text-body-sm text-ink">
              <option value="">Все</option>
              <option value="qr">QR</option>
              <option value="utm">UTM</option>
              <option value="referral">Реферал</option>
              <option value="internal">Внутренний</option>
              <option value="direct">Прямой</option>
            </select>
          </label>
          <label class="flex items-center gap-2 text-body-sm text-steel">
            Тип
            <select v-model="filterReturning" class="h-9 rounded-md border border-hairline bg-canvas px-sm text-body-sm text-ink">
              <option value="">Все</option>
              <option value="false">Новые</option>
              <option value="true">Вернувшиеся</option>
            </select>
          </label>
          <span class="ml-auto text-caption text-steel">Всего: <span class="text-ink tabular-nums">{{ visitsData?.total ?? 0 }}</span></span>
        </div>
      </UiCard>

      <UiCard :padded="'sm'">
        <div v-if="visitsPending && !visitsData" class="py-2xl text-center text-body-sm text-steel">Загрузка…</div>
        <div v-else-if="!visitsData?.items?.length" class="py-2xl text-center text-body-sm text-steel">
          Визитов по выбранным фильтрам нет.
        </div>
        <table v-else class="w-full text-body-sm">
          <thead class="text-caption-bold uppercase tracking-wide text-steel">
            <tr class="border-b border-hairline-soft">
              <th class="px-sm py-2 text-left font-normal">Время</th>
              <th class="px-sm py-2 text-left font-normal">Инструкция</th>
              <th class="px-sm py-2 text-left font-normal">Источник</th>
              <th class="px-sm py-2 text-left font-normal">Гео</th>
              <th class="px-sm py-2 text-left font-normal">Устройство</th>
              <th class="px-sm py-2 text-right font-normal">Время</th>
              <th class="px-sm py-2 text-right font-normal">Скролл</th>
              <th class="px-sm py-2 text-right font-normal">Стр.</th>
              <th class="px-sm py-2 text-right font-normal">Цели</th>
              <th class="px-sm py-2"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-hairline-soft">
            <tr
              v-for="v in visitsData.items"
              :key="v.id"
              class="cursor-pointer transition-colors hover:bg-hairline-soft"
              @click="openVisit(v.id)"
            >
              <td class="px-sm py-2 whitespace-nowrap tabular-nums text-charcoal">{{ formatDateTime(v.startedAt) }}</td>
              <td class="px-sm py-2 max-w-[240px]">
                <span class="block truncate text-ink">{{ v.instruction?.title }}</span>
              </td>
              <td class="px-sm py-2">
                <UiBadge :variant="v.entrySource === 'qr' ? 'tag-green' : v.entrySource === 'utm' ? 'tag-orange' : 'tag-gray'">
                  {{ entrySourceLabel[v.entrySource ?? 'unknown'] ?? v.entrySource }}
                </UiBadge>
                <UiBadge v-if="v.isReturning" variant="tag-purple" class="ml-1">↻</UiBadge>
              </td>
              <td class="px-sm py-2 whitespace-nowrap text-charcoal">
                {{ v.country || '—' }}<span v-if="v.city" class="text-steel">, {{ v.city }}</span>
              </td>
              <td class="px-sm py-2 whitespace-nowrap text-charcoal capitalize">
                {{ v.deviceType ?? '—' }}<span v-if="v.os" class="text-steel"> · {{ v.os }}</span>
              </td>
              <td class="px-sm py-2 text-right tabular-nums text-steel">{{ formatDuration(v.totalDurationMs) }}</td>
              <td class="px-sm py-2 text-right tabular-nums text-steel">{{ v.maxScrollDepth }}%</td>
              <td class="px-sm py-2 text-right tabular-nums text-steel">{{ v.pageViews }}</td>
              <td class="px-sm py-2 text-right tabular-nums">
                <span :class="v._count?.goals ? 'text-primary font-semibold' : 'text-steel'">{{ v._count?.goals ?? 0 }}</span>
              </td>
              <td class="px-sm py-2 text-right text-steel">
                <Icon name="lucide:chevron-right" class="h-4 w-4" />
              </td>
            </tr>
          </tbody>
        </table>
      </UiCard>

      <!-- Пагинация -->
      <div v-if="visitsData && visitsData.totalPages > 1" class="flex items-center justify-between text-body-sm">
        <span class="text-steel">Страница {{ visitsData.page }} из {{ visitsData.totalPages }}</span>
        <div class="flex gap-2">
          <UiButton variant="secondary" size="sm" :disabled="page <= 1" @click="page = Math.max(1, page - 1)">← Назад</UiButton>
          <UiButton variant="secondary" size="sm" :disabled="page >= visitsData.totalPages" @click="page = Math.min(visitsData.totalPages, page + 1)">Вперёд →</UiButton>
        </div>
      </div>
    </div>

    <!-- ─── Визит — детально ─────────────────────────────────────────── -->
    <UiModal :open="!!detailId" size="lg" title="Визит пользователя" @close="closeVisit">
      <div v-if="detailPending && !detail" class="py-lg text-center text-body-sm text-steel">Загрузка…</div>
      <div v-else-if="detail" class="space-y-lg">
        <!-- Шапка -->
        <div class="flex items-start justify-between gap-md">
          <div>
            <p class="text-caption uppercase tracking-wide text-steel">Инструкция</p>
            <NuxtLink :to="`/dashboard/instructions/${detail.visit.instruction.id}/analytics`" class="text-h5 text-ink hover:text-primary">
              {{ detail.visit.instruction.title }}
            </NuxtLink>
          </div>
          <div class="text-right">
            <p class="text-caption uppercase tracking-wide text-steel">Время</p>
            <p class="text-body-sm-md text-ink">{{ formatDateTime(detail.visit.startedAt) }}</p>
          </div>
        </div>

        <!-- Метрики визита -->
        <div class="grid grid-cols-2 gap-sm md:grid-cols-4">
          <div class="rounded-md bg-surface p-md">
            <p class="text-caption text-steel">Длительность</p>
            <p class="text-h5 tabular-nums text-navy">{{ formatDuration(detail.visit.totalDurationMs) }}</p>
          </div>
          <div class="rounded-md bg-surface p-md">
            <p class="text-caption text-steel">Скролл</p>
            <p class="text-h5 tabular-nums text-navy">{{ detail.visit.maxScrollDepth }}%</p>
          </div>
          <div class="rounded-md bg-surface p-md">
            <p class="text-caption text-steel">Просмотров</p>
            <p class="text-h5 tabular-nums text-navy">{{ detail.visit.pageViews }}</p>
          </div>
          <div class="rounded-md bg-surface p-md">
            <p class="text-caption text-steel">Блоков</p>
            <p class="text-h5 tabular-nums text-navy">{{ detail.visit.blocksViewed?.length ?? 0 }}</p>
          </div>
        </div>

        <!-- Атрибуция и устройство -->
        <div class="grid grid-cols-1 gap-md md:grid-cols-2">
          <div>
            <h4 class="text-caption-bold mb-2 uppercase tracking-wide text-steel">Источник</h4>
            <dl class="grid grid-cols-[120px_1fr] gap-y-1 text-body-sm">
              <dt class="text-steel">Тип</dt>
              <dd class="text-ink">
                <UiBadge :variant="detail.visit.entrySource === 'qr' ? 'tag-green' : detail.visit.entrySource === 'utm' ? 'tag-orange' : 'tag-gray'">
                  {{ entrySourceLabel[detail.visit.entrySource ?? 'unknown'] ?? detail.visit.entrySource }}
                </UiBadge>
              </dd>
              <template v-if="detail.visit.entryQrShortId">
                <dt class="text-steel">QR</dt>
                <dd class="font-mono text-caption text-ink">{{ detail.visit.entryQrShortId }}</dd>
              </template>
              <template v-if="detail.visit.referrer">
                <dt class="text-steel">Откуда пришёл</dt>
                <dd class="break-all text-caption text-ink">{{ detail.visit.referrer }}</dd>
              </template>
              <template v-if="detail.visit.utmSource">
                <dt class="text-steel">UTM source</dt>
                <dd class="text-ink">{{ detail.visit.utmSource }}</dd>
              </template>
              <template v-if="detail.visit.utmMedium">
                <dt class="text-steel">UTM medium</dt>
                <dd class="text-ink">{{ detail.visit.utmMedium }}</dd>
              </template>
              <template v-if="detail.visit.utmCampaign">
                <dt class="text-steel">UTM campaign</dt>
                <dd class="text-ink">{{ detail.visit.utmCampaign }}</dd>
              </template>
              <dt class="text-steel">Повторный визит</dt>
              <dd class="text-ink">{{ detail.visit.isReturning ? 'Да' : 'Нет' }}</dd>
              <template v-if="detail.visit.isBot">
                <dt class="text-steel">Бот</dt>
                <dd class="text-ink">Да</dd>
              </template>
            </dl>
          </div>

          <div>
            <h4 class="text-caption-bold mb-2 uppercase tracking-wide text-steel">Окружение</h4>
            <dl class="grid grid-cols-[120px_1fr] gap-y-1 text-body-sm">
              <dt class="text-steel">Гео</dt>
              <dd class="text-ink">
                {{ detail.visit.country ?? '—' }}<span v-if="detail.visit.region">, {{ detail.visit.region }}</span><span v-if="detail.visit.city">, {{ detail.visit.city }}</span>
              </dd>
              <dt class="text-steel">Устройство</dt>
              <dd class="text-ink capitalize">
                {{ detail.visit.deviceType ?? '—' }}<span v-if="detail.visit.os"> · {{ detail.visit.os }}</span><span v-if="detail.visit.browser"> · {{ detail.visit.browser }}</span>
              </dd>
              <template v-if="detail.visit.timezone">
                <dt class="text-steel">Таймзона</dt>
                <dd class="text-ink">{{ detail.visit.timezone }}</dd>
              </template>
              <dt class="text-steel">Язык</dt>
              <dd class="text-ink">{{ detail.visit.language ?? '—' }}</dd>
              <template v-if="detail.visit.viewportWidth">
                <dt class="text-steel">Разрешение экрана</dt>
                <dd class="text-ink tabular-nums">{{ detail.visit.viewportWidth }}×{{ detail.visit.viewportHeight }}</dd>
              </template>
            </dl>
          </div>
        </div>

        <!-- Цели -->
        <div v-if="detail.visit.goals?.length">
          <h4 class="text-caption-bold mb-2 uppercase tracking-wide text-steel">Цели</h4>
          <ul class="divide-y divide-hairline-soft">
            <li v-for="g in detail.visit.goals" :key="g.id" class="flex items-center justify-between gap-md py-2 text-body-sm">
              <div class="flex items-center gap-2">
                <UiBadge variant="tag-purple">{{ g.code }}</UiBadge>
                <span v-if="g.meta" class="font-mono text-caption text-steel">{{ JSON.stringify(g.meta) }}</span>
              </div>
              <span class="tabular-nums text-steel">{{ formatDateTime(g.createdAt) }}</span>
            </li>
          </ul>
        </div>

        <!-- Чтение блоков -->
        <div v-if="detail.blockDwell?.length">
          <h4 class="text-caption-bold mb-2 uppercase tracking-wide text-steel">Время на блоках</h4>
          <ul class="divide-y divide-hairline-soft">
            <li v-for="b in detail.blockDwell.slice(0, 10)" :key="b.blockId" class="flex items-center justify-between py-2 text-body-sm">
              <span class="font-mono text-caption text-charcoal">{{ b.blockId }}</span>
              <span class="text-steel"><span class="tabular-nums text-ink">{{ formatDuration(b.totalMs) }}</span> · {{ b.views }} показ(а)</span>
            </li>
          </ul>
        </div>

      </div>
    </UiModal>
  </div>
</template>
