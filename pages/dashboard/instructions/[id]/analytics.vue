<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const route = useRoute()
const id = route.params.id as string
const api = useApi()
const { currentTenant } = useAuthState()
const { track } = useTrackGoal()
onMounted(() => track('analytics_viewed', { instructionId: id }))

const [{ data: stats }, { data: feedback }] = await Promise.all([
  useAsyncData(
    computed(() => `analytics-${currentTenant.value?.id ?? 'none'}-${id}`),
    () => api<any>(`/api/instructions/${id}/analytics`),
    { watch: [() => currentTenant.value?.id] }
  ),
  useAsyncData(
    computed(() => `feedback-${currentTenant.value?.id ?? 'none'}-${id}`),
    () => api<any>(`/api/instructions/${id}/feedback`),
    { watch: [() => currentTenant.value?.id] }
  )
])

const feedbackKindLabels: Record<string, string> = {
  HELPFUL: 'Помогло',
  INCORRECT: 'Ошибка в инструкции',
  CONFUSING: 'Непонятно'
}

const feedbackKindVariants: Record<string, 'tag-green' | 'tag-orange' | 'tag-blue'> = {
  HELPFUL: 'tag-green',
  INCORRECT: 'tag-orange',
  CONFUSING: 'tag-blue'
}

const deviceLabels: Record<string, string> = {
  desktop: 'Компьютер',
  mobile: 'Смартфон',
  tablet: 'Планшет'
}

function deviceLabel(value: string | null | undefined) {
  if (!value) return 'Не определено'
  return deviceLabels[value] ?? value
}
</script>

<template>
  <div>
    <BackLink :to="`/dashboard/instructions/${id}/edit`" label="Назад к редактору" />

    <PageHeader icon="lucide:bar-chart-3" title="Аналитика инструкции">
      <template #actions>
        <span class="text-caption text-steel">за последние 30 дней</span>
      </template>
    </PageHeader>

    <div class="mt-sm space-y-2xl">
      <!-- Stat-карточки: 4 ключевые метрики -->
      <div class="grid grid-cols-2 gap-md md:grid-cols-4">
        <UiStatCard label="Просмотры">
          {{ stats?.totals.pageViews ?? 0 }}
        </UiStatCard>
        <UiStatCard label="Уникальные сессии">
          {{ stats?.totals.uniqueSessions ?? 0 }}
        </UiStatCard>
        <UiStatCard label="Средний скролл">
          {{ Math.round(stats?.totals.avgScrollDepth ?? 0) }}%
        </UiStatCard>
        <UiStatCard label="Среднее время">
          {{ Math.round((stats?.totals.avgDurationMs ?? 0) / 1000) }} с
        </UiStatCard>
      </div>

      <!-- Гео и устройства: info-card + section-mini-header -->
      <div class="grid grid-cols-1 gap-md md:grid-cols-2">
        <div class="rounded-lg bg-surface p-xl">
          <SectionHeader icon="lucide:globe" title="По странам" />
          <ul v-if="stats?.byCountry?.length" class="mt-md divide-y divide-hairline">
            <li v-for="r in stats?.byCountry" :key="r.country" class="flex justify-between py-sm text-body-sm">
              <span class="text-ink">{{ r.country }}</span>
              <span class="text-steel">{{ r.count }}</span>
            </li>
          </ul>
          <p v-else class="mt-md text-body-sm text-steel">Нет данных за 30 дней.</p>
        </div>
        <div class="rounded-lg bg-surface p-xl">
          <SectionHeader icon="lucide:smartphone" title="По устройствам" />
          <ul v-if="stats?.byDevice?.length" class="mt-md divide-y divide-hairline">
            <li v-for="r in stats?.byDevice" :key="r.deviceType" class="flex justify-between py-sm text-body-sm">
              <span class="text-ink">{{ deviceLabel(r.deviceType) }}</span>
              <span class="text-steel">{{ r.count }}</span>
            </li>
          </ul>
          <p v-else class="mt-md text-body-sm text-steel">Нет данных за 30 дней.</p>
        </div>
      </div>

      <!-- Отзывы по блокам -->
      <div class="rounded-lg bg-surface p-xl">
        <SectionHeader icon="lucide:message-square" title="Отзывы по блокам" />

        <div class="mt-md grid grid-cols-2 gap-md md:grid-cols-4">
          <div v-for="r in stats?.feedbackByKind" :key="r.kind">
            <p class="text-caption-bold text-steel uppercase tracking-wide">{{ feedbackKindLabels[r.kind] ?? r.kind }}</p>
            <p class="mt-1 text-h3 text-navy">{{ r.count }}</p>
          </div>
        </div>

        <hr class="my-lg border-hairline">

        <ul v-if="feedback?.items?.length" class="max-h-[400px] divide-y divide-hairline overflow-y-auto">
          <li v-for="f in feedback.items" :key="f.id" class="py-sm text-body-sm">
            <div class="flex items-center gap-2">
              <span class="font-mono text-caption text-steel">{{ f.blockId }}</span>
              <UiBadge :variant="feedbackKindVariants[f.kind] ?? 'tag-gray'">{{ feedbackKindLabels[f.kind] ?? f.kind }}</UiBadge>
            </div>
            <p v-if="f.comment" class="mt-1 text-charcoal">{{ f.comment }}</p>
          </li>
        </ul>
        <p v-else class="text-body-sm text-steel">Пока никто не оставил отзыв на блок.</p>
      </div>
    </div>
  </div>
</template>
