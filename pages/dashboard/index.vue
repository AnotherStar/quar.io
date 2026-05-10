<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const { currentTenant } = useAuthState()
const overviewKey = computed(() => `dashboard-overview-${currentTenant.value?.id ?? 'none'}`)
const { data } = await useAsyncData(
  overviewKey,
  () => api<{ instructions: any[] }>('/api/instructions'),
  {
    default: () => ({ instructions: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

const stats = computed(() => {
  const list = data.value?.instructions ?? []
  return {
    total: list.length,
    published: list.filter((i) => i.status === 'PUBLISHED').length,
    drafts: list.filter((i) => i.status === 'DRAFT').length,
    inReview: list.filter((i) => i.status === 'IN_REVIEW').length
  }
})
</script>

<template>
  <div class="space-y-2xl">
    <div>
      <h1 class="text-h2 text-ink">Обзор</h1>
      <p class="mt-1 text-body text-slate">{{ currentTenant?.name }} · тариф {{ currentTenant?.plan }}</p>
    </div>

    <div class="grid grid-cols-2 gap-md md:grid-cols-4">
      <UiCard><p class="text-caption text-steel uppercase tracking-wide">Всего</p><p class="mt-2 text-h2">{{ stats.total }}</p></UiCard>
      <UiCard><p class="text-caption text-steel uppercase tracking-wide">Опубликовано</p><p class="mt-2 text-h2">{{ stats.published }}</p></UiCard>
      <UiCard><p class="text-caption text-steel uppercase tracking-wide">Черновики</p><p class="mt-2 text-h2">{{ stats.drafts }}</p></UiCard>
      <UiCard><p class="text-caption text-steel uppercase tracking-wide">На ревью</p><p class="mt-2 text-h2">{{ stats.inReview }}</p></UiCard>
    </div>

    <div>
      <div class="flex items-center justify-between">
        <h2 class="text-h3">Последние инструкции</h2>
        <UiButton to="/dashboard/instructions" variant="secondary" size="sm">Все инструкции</UiButton>
      </div>
      <UiCard class="mt-md">
        <ul v-if="data?.instructions.length" class="divide-y divide-hairline">
          <li v-for="i in data.instructions.slice(0, 5)" :key="i.id" class="flex items-center justify-between py-sm">
            <NuxtLink :to="`/dashboard/instructions/${i.id}/edit`" class="text-body-md text-ink hover:text-primary">{{ i.title }}</NuxtLink>
            <UiBadge :variant="i.status === 'PUBLISHED' ? 'tag-green' : i.status === 'IN_REVIEW' ? 'tag-orange' : 'tag-purple'">
              {{ i.status }}
            </UiBadge>
          </li>
        </ul>
        <div v-else class="py-md text-body text-steel">
          Пока нет инструкций.
          <NuxtLink to="/dashboard/instructions" class="text-link hover:underline">Создать первую</NuxtLink>
        </div>
      </UiCard>
    </div>
  </div>
</template>
