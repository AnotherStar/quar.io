<script setup lang="ts">
// Главная админ-секции. Сводная статистика платформы + быстрая ссылка на
// «Пользователи». Доступ ограничен middleware 'admin' — нечеловеки получат
// редирект на /dashboard.
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const api = useApi()

const { data } = await useAsyncData(
  'admin-stats',
  () => api<{
    users: { total: number; new30d: number; admins: number }
    tenants: { total: number; byPlan: Array<{ code: string; name: string; count: number }> }
    instructions: { total: number; published: number }
    visits: { last30d: number; last7d: number }
  }>('/api/admin/stats')
)

const planBadgeVariant = (code: string) => {
  if (code === 'business') return 'tag-green'
  if (code === 'plus') return 'tag-orange'
  return 'tag-gray'
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:shield-check" title="Админ-панель">
      <template #actions>
        <UiButton to="/dashboard/admin/users" variant="secondary" size="sm">
          <Icon name="lucide:users" class="h-4 w-4" />
          Все пользователи
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm space-y-2xl">
      <!-- Top-level counters -->
      <div class="grid grid-cols-2 gap-md md:grid-cols-4">
        <div class="rounded-lg bg-surface p-xl">
          <p class="text-caption-bold text-steel uppercase tracking-wide">Пользователей</p>
          <p class="mt-2 text-h2 text-navy">{{ data?.users.total ?? 0 }}</p>
          <p class="mt-1 text-caption text-steel">+{{ data?.users.new30d ?? 0 }} за 30 дней</p>
        </div>
        <div class="rounded-lg bg-surface p-xl">
          <p class="text-caption-bold text-steel uppercase tracking-wide">Компаний</p>
          <p class="mt-2 text-h2 text-navy">{{ data?.tenants.total ?? 0 }}</p>
          <p class="mt-1 text-caption text-steel">админов: {{ data?.users.admins ?? 0 }}</p>
        </div>
        <div class="rounded-lg bg-surface p-xl">
          <p class="text-caption-bold text-steel uppercase tracking-wide">Инструкций</p>
          <p class="mt-2 text-h2 text-navy">{{ data?.instructions.total ?? 0 }}</p>
          <p class="mt-1 text-caption text-steel">опубликовано: {{ data?.instructions.published ?? 0 }}</p>
        </div>
        <div class="rounded-lg bg-surface p-xl">
          <p class="text-caption-bold text-steel uppercase tracking-wide">Визиты · 30 дн</p>
          <p class="mt-2 text-h2 text-navy">{{ data?.visits.last30d ?? 0 }}</p>
          <p class="mt-1 text-caption text-steel">за 7 дней: {{ data?.visits.last7d ?? 0 }}</p>
        </div>
      </div>

      <!-- Plans breakdown -->
      <div>
        <div class="flex items-center gap-3">
          <Icon name="lucide:credit-card" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Тарифы компаний</h2>
        </div>
        <ul v-if="data?.tenants.byPlan.length" class="mt-md divide-y divide-hairline-soft">
          <li
            v-for="p in data.tenants.byPlan"
            :key="p.code"
            class="flex items-center justify-between py-sm"
          >
            <div class="flex items-center gap-3">
              <UiBadge :variant="planBadgeVariant(p.code)">{{ p.code }}</UiBadge>
              <span class="text-body-sm text-ink">{{ p.name }}</span>
            </div>
            <span class="text-body-sm-md text-ink">{{ p.count }}</span>
          </li>
        </ul>
        <p v-else class="mt-md py-md text-body text-steel">Нет данных.</p>
      </div>
    </div>
  </div>
</template>
