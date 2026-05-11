<script setup lang="ts">
// Список всех пользователей платформы. Доступ только админам (middleware).
// Поиск по email/имени дебаунсится клиентом и фетчится через ?search=.
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const api = useApi()

const search = ref('')
const debouncedSearch = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null
watch(search, (v) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => { debouncedSearch.value = v.trim() }, 250)
})

interface AdminUserRow {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  isAdmin: boolean
  emailVerifiedAt: string | null
  createdAt: string
  tenants: Array<{
    id: string
    slug: string
    name: string
    role: 'OWNER' | 'EDITOR' | 'VIEWER'
    plan: string
    planName: string
    subscriptionStatus: string | null
    instructionsCount: number
    visits30d: number
  }>
  instructionsTotal: number
  visits30dTotal: number
}

const { data, pending } = await useAsyncData(
  'admin-users',
  () => api<{ total: number; take: number; skip: number; users: AdminUserRow[] }>('/api/admin/users', {
    query: { search: debouncedSearch.value || undefined, take: 100 }
  }),
  {
    watch: [debouncedSearch],
    default: () => ({ total: 0, take: 100, skip: 0, users: [] })
  }
)

const planBadgeVariant = (code: string) => {
  if (code === 'business') return 'tag-green'
  if (code === 'plus') return 'tag-orange'
  return 'tag-gray'
}

const formatDate = (s: string) =>
  new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })

// Самые «дорогие» планы из массива тенантов пользователя — для бейджа в строке.
const PLAN_RANK: Record<string, number> = { business: 3, plus: 2, free: 1 }
const topPlan = (row: AdminUserRow) => {
  if (!row.tenants.length) return null
  return [...row.tenants].sort(
    (a, b) => (PLAN_RANK[b.plan] ?? 0) - (PLAN_RANK[a.plan] ?? 0)
  )[0]
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:users" title="Пользователи">
      <template #actions>
        <UiButton to="/dashboard/admin" variant="secondary" size="sm">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          К админке
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm flex flex-wrap items-center justify-between gap-md">
      <p class="text-body-sm text-steel">
        Всего: <span class="text-ink">{{ data?.total ?? 0 }}</span>
      </p>
      <div class="relative w-full max-w-sm">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
        <input
          v-model="search"
          type="text"
          placeholder="Поиск по email или имени"
          class="h-10 w-full rounded-lg border border-transparent bg-surface px-md pl-9 text-body-sm-md placeholder:text-stone outline-none focus:border-primary focus:bg-canvas focus:ring-2 focus:ring-primary/20"
        >
      </div>
    </div>

    <div class="mt-xl">
      <table v-if="data?.users.length" class="w-full">
        <thead>
          <tr class="border-b border-hairline text-caption text-steel uppercase">
            <th class="pb-sm text-left">Пользователь</th>
            <th class="pb-sm text-left">Тариф</th>
            <th class="pb-sm text-left">Компании</th>
            <th class="pb-sm text-right">Инструкций</th>
            <th class="pb-sm text-right">Визиты · 30 дн</th>
            <th class="pb-sm text-right">Регистрация</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in data.users" :key="u.id" class="border-b border-hairline-soft">
            <td class="py-sm">
              <NuxtLink :to="`/dashboard/admin/users/${u.id}`" class="group block">
                <div class="flex items-center gap-2">
                  <span class="text-body-sm-md text-ink group-hover:text-primary">
                    {{ u.name || u.email }}
                  </span>
                  <UiBadge v-if="u.isAdmin" variant="tag-green">admin</UiBadge>
                </div>
                <span v-if="u.name" class="block text-caption text-steel group-hover:text-link">
                  {{ u.email }}
                </span>
                <span v-if="!u.emailVerifiedAt" class="block text-caption text-steel">
                  email не подтверждён
                </span>
              </NuxtLink>
            </td>
            <td class="py-sm align-top">
              <UiBadge v-if="topPlan(u)" :variant="planBadgeVariant(topPlan(u)!.plan)">
                {{ topPlan(u)!.plan }}
              </UiBadge>
              <span v-else class="text-caption text-steel">—</span>
            </td>
            <td class="py-sm align-top">
              <span class="text-body-sm text-ink">{{ u.tenants.length }}</span>
              <span
                v-if="u.tenants.length"
                class="ml-2 text-caption text-steel"
              >
                {{ u.tenants.map((t) => t.name).slice(0, 2).join(', ') }}{{ u.tenants.length > 2 ? '…' : '' }}
              </span>
            </td>
            <td class="py-sm align-top text-right text-body-sm text-ink">
              {{ u.instructionsTotal }}
            </td>
            <td class="py-sm align-top text-right text-body-sm text-ink">
              {{ u.visits30dTotal }}
            </td>
            <td class="py-sm align-top text-right text-caption text-steel">
              {{ formatDate(u.createdAt) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="pending" class="py-md text-body text-steel">Загрузка…</p>
      <p v-else class="py-md text-body text-steel">
        <span v-if="debouncedSearch">Ничего не найдено по «{{ debouncedSearch }}».</span>
        <span v-else>Пользователей пока нет.</span>
      </p>
    </div>
  </div>
</template>
