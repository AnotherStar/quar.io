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
</script>

<template>
  <div class="space-y-xl">
    <NuxtLink :to="`/dashboard/instructions/${id}/edit`" class="text-caption text-steel hover:text-ink">← Назад к редактору</NuxtLink>
    <h1 class="text-h2 text-ink">Аналитика · последние 30 дней</h1>

    <div class="grid grid-cols-2 gap-md md:grid-cols-4">
      <UiCard><p class="text-caption text-steel uppercase">Просмотры</p><p class="mt-1 text-h2">{{ stats?.totals.pageViews ?? 0 }}</p></UiCard>
      <UiCard><p class="text-caption text-steel uppercase">Уникальные сессии</p><p class="mt-1 text-h2">{{ stats?.totals.uniqueSessions ?? 0 }}</p></UiCard>
      <UiCard><p class="text-caption text-steel uppercase">Средний скролл</p><p class="mt-1 text-h2">{{ Math.round(stats?.totals.avgScrollDepth ?? 0) }}%</p></UiCard>
      <UiCard>
        <p class="text-caption text-steel uppercase">Среднее время</p>
        <p class="mt-1 text-h2">{{ Math.round((stats?.totals.avgDurationMs ?? 0) / 1000) }}s</p>
      </UiCard>
    </div>

    <div class="grid grid-cols-1 gap-md md:grid-cols-2">
      <UiCard>
        <h3 class="text-h5 mb-2">По странам</h3>
        <ul class="divide-y divide-hairline-soft">
          <li v-for="r in stats?.byCountry" :key="r.country" class="flex justify-between py-1 text-body-sm">
            <span>{{ r.country }}</span><span class="text-steel">{{ r.count }}</span>
          </li>
        </ul>
      </UiCard>
      <UiCard>
        <h3 class="text-h5 mb-2">По устройствам</h3>
        <ul class="divide-y divide-hairline-soft">
          <li v-for="r in stats?.byDevice" :key="r.deviceType" class="flex justify-between py-1 text-body-sm">
            <span>{{ r.deviceType }}</span><span class="text-steel">{{ r.count }}</span>
          </li>
        </ul>
      </UiCard>
    </div>

    <UiCard>
      <h3 class="text-h5 mb-2">Отзывы по блокам</h3>
      <div class="grid grid-cols-2 gap-md md:grid-cols-4">
        <div v-for="r in stats?.feedbackByKind" :key="r.kind">
          <p class="text-caption text-steel uppercase">{{ r.kind }}</p>
          <p class="text-h3">{{ r.count }}</p>
        </div>
      </div>
      <hr class="my-md border-hairline">
      <ul class="divide-y divide-hairline-soft max-h-[400px] overflow-y-auto">
        <li v-for="f in feedback?.items" :key="f.id" class="py-sm text-body-sm">
          <span class="font-mono text-caption text-steel">{{ f.blockId }}</span>
          <UiBadge class="ml-2" :variant="f.kind === 'HELPFUL' ? 'tag-green' : f.kind === 'INCORRECT' ? 'tag-orange' : 'tag-purple'">{{ f.kind }}</UiBadge>
          <p v-if="f.comment" class="mt-1 text-charcoal">{{ f.comment }}</p>
        </li>
      </ul>
    </UiCard>
  </div>
</template>
