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
        <UiButton to="/dashboard/admin/features" variant="secondary" size="sm">
          <Icon name="lucide:layers" class="h-4 w-4" />
          Фичи и тарифы
        </UiButton>
        <UiButton to="/dashboard/admin/ai-usage" variant="secondary" size="sm">
          <Icon name="lucide:sparkles" class="h-4 w-4" />
          AI-расходы
        </UiButton>
        <UiButton to="/dashboard/admin/ai-settings" variant="secondary" size="sm">
          <Icon name="lucide:bot" class="h-4 w-4" />
          AI-настройки
        </UiButton>
        <UiButton to="/dashboard/admin/ui" variant="secondary" size="sm">
          <Icon name="lucide:palette" class="h-4 w-4" />
          Интерфейс
        </UiButton>
        <UiButton to="/dashboard/admin/users" variant="secondary" size="sm">
          <Icon name="lucide:users" class="h-4 w-4" />
          Пользователи
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm space-y-2xl">
      <!-- Top-level counters -->
      <div class="grid grid-cols-2 gap-md md:grid-cols-4">
        <UiStatCard label="Пользователей" :hint="`+${data?.users.new30d ?? 0} за 30 дней`">
          {{ data?.users.total ?? 0 }}
        </UiStatCard>
        <UiStatCard label="Компаний" :hint="`админов: ${data?.users.admins ?? 0}`">
          {{ data?.tenants.total ?? 0 }}
        </UiStatCard>
        <UiStatCard label="Инструкций" :hint="`опубликовано: ${data?.instructions.published ?? 0}`">
          {{ data?.instructions.total ?? 0 }}
        </UiStatCard>
        <UiStatCard label="Визиты · 30 дн" :hint="`за 7 дней: ${data?.visits.last7d ?? 0}`">
          {{ data?.visits.last30d ?? 0 }}
        </UiStatCard>
      </div>

      <!-- Plans breakdown -->
      <div>
        <SectionHeader icon="lucide:credit-card" title="Тарифы компаний" />
        <ul v-if="data?.tenants.byPlan.length" class="mt-md divide-y divide-hairline">
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
        <p v-else class="mt-md py-md text-body-sm text-steel">Нет данных.</p>
      </div>
    </div>
  </div>
</template>
