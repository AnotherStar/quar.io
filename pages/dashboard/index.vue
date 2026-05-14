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
  <div>
    <PageHeader icon="lucide:layout-dashboard" title="Обзор" />

    <div class="mt-sm space-y-2xl">

    <div class="grid grid-cols-2 gap-md md:grid-cols-4">
      <div class="rounded-lg bg-surface p-xl">
        <p class="text-caption-bold text-steel uppercase tracking-wide">Всего</p>
        <p class="mt-2 text-h2 text-navy">{{ stats.total }}</p>
      </div>
      <div class="rounded-lg bg-surface p-xl">
        <p class="text-caption-bold text-steel uppercase tracking-wide">Опубликовано</p>
        <p class="mt-2 text-h2 text-navy">{{ stats.published }}</p>
      </div>
      <div class="rounded-lg bg-surface p-xl">
        <p class="text-caption-bold text-steel uppercase tracking-wide">Черновики</p>
        <p class="mt-2 text-h2 text-navy">{{ stats.drafts }}</p>
      </div>
      <div class="rounded-lg bg-surface p-xl">
        <p class="text-caption-bold text-steel uppercase tracking-wide">На ревью</p>
        <p class="mt-2 text-h2 text-navy">{{ stats.inReview }}</p>
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <Icon name="lucide:clock" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Последние инструкции</h2>
        </div>
        <UiButton to="/dashboard/instructions" variant="secondary" size="sm">Все инструкции</UiButton>
      </div>
      <ul v-if="data?.instructions.length" class="mt-md divide-y divide-hairline">
        <li v-for="i in data.instructions.slice(0, 5)" :key="i.id" class="flex items-center justify-between py-sm">
          <NuxtLink :to="`/dashboard/instructions/${i.id}/edit`" class="text-body-sm-md text-ink hover:text-primary">{{ i.title }}</NuxtLink>
          <UiBadge :variant="i.status === 'PUBLISHED' ? 'tag-green' : i.status === 'IN_REVIEW' ? 'tag-orange' : 'tag-gray'">
            {{ i.status }}
          </UiBadge>
        </li>
      </ul>
      <p v-else class="mt-md py-md text-body text-steel">
        Пока нет инструкций.
        <NuxtLink to="/dashboard/instructions" class="text-link hover:underline">Создать первую</NuxtLink>
      </p>
    </div>
    </div>
  </div>
</template>
