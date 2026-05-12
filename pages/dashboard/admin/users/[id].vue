<script setup lang="ts">
// Детали пользователя для админа: все его компании, тариф каждой, список
// инструкций со статистикой за 30 дней.
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const route = useRoute()
const api = useApi()

interface AdminUserDetail {
  user: {
    id: string
    email: string
    name: string | null
    avatarUrl: string | null
    isAdmin: boolean
    emailVerifiedAt: string | null
    createdAt: string
    updatedAt: string
    activeSessions: number
  }
  tenants: Array<{
    id: string
    slug: string
    name: string
    role: 'OWNER' | 'EDITOR' | 'VIEWER'
    plan: string
    planName: string
    subscriptionStatus: string | null
    currentPeriodEnd: string | null
    createdAt: string
    instructions: Array<{
      id: string
      slug: string
      title: string
      status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED'
      createdAt: string
      updatedAt: string
      publishedAt: string | null
      visits30d: number
      pageViews30d: number
    }>
    instructionsCount: number
    visits30d: number
  }>
  totals: { tenants: number; instructions: number; visits30d: number }
}

const { data } = await useAsyncData(
  `admin-user-${route.params.id}`,
  () => api<AdminUserDetail>(`/api/admin/users/${route.params.id}`)
)

const planBadgeVariant = (code: string) => {
  if (code === 'business') return 'tag-green'
  if (code === 'plus') return 'tag-orange'
  return 'tag-gray'
}

const statusBadgeVariant = (s: string) => {
  if (s === 'PUBLISHED') return 'tag-green'
  if (s === 'IN_REVIEW') return 'tag-orange'
  if (s === 'ARCHIVED') return 'tag-orange'
  return 'tag-gray'
}

const formatDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
</script>

<template>
  <div v-if="data">
    <PageHeader icon="lucide:user" :title="data.user.name || data.user.email">
      <template #actions>
        <UiButton to="/dashboard/admin/users" variant="secondary" size="sm">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          К списку
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm space-y-2xl">
      <!-- User info -->
      <div class="rounded-lg bg-surface p-xl">
        <div class="flex flex-wrap items-start justify-between gap-md">
          <div>
            <p class="text-body-sm-md text-ink">{{ data.user.email }}</p>
            <p class="mt-1 text-caption text-steel">
              Зарегистрирован {{ formatDate(data.user.createdAt) }}
              <span v-if="!data.user.emailVerifiedAt"> · email не подтверждён</span>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <UiBadge v-if="data.user.isAdmin" variant="tag-green">admin</UiBadge>
            <UiBadge variant="tag-gray">{{ data.user.activeSessions }} сессий</UiBadge>
          </div>
        </div>
      </div>

      <!-- Totals -->
      <div class="grid grid-cols-3 gap-md">
        <div class="rounded-lg bg-surface p-xl">
          <p class="text-caption-bold text-steel uppercase tracking-wide">Компаний</p>
          <p class="mt-2 text-h2 text-navy">{{ data.totals.tenants }}</p>
        </div>
        <div class="rounded-lg bg-surface p-xl">
          <p class="text-caption-bold text-steel uppercase tracking-wide">Инструкций</p>
          <p class="mt-2 text-h2 text-navy">{{ data.totals.instructions }}</p>
        </div>
        <div class="rounded-lg bg-surface p-xl">
          <p class="text-caption-bold text-steel uppercase tracking-wide">Визиты · 30 дн</p>
          <p class="mt-2 text-h2 text-navy">{{ data.totals.visits30d }}</p>
        </div>
      </div>

      <!-- Per-tenant cards -->
      <div v-for="t in data.tenants" :key="t.id" class="space-y-md">
        <div class="flex flex-wrap items-center justify-between gap-md border-b border-hairline pb-sm">
          <div class="flex items-center gap-3">
            <Icon name="lucide:building-2" class="h-5 w-5 text-navy opacity-50" />
            <h2 class="text-h4 text-navy">{{ t.name }}</h2>
            <span class="text-caption text-steel">/{{ t.slug }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UiBadge variant="tag-gray">{{ t.role }}</UiBadge>
            <UiBadge :variant="planBadgeVariant(t.plan)">{{ t.plan }}</UiBadge>
            <UiBadge v-if="t.subscriptionStatus && t.subscriptionStatus !== 'active'" variant="tag-orange">
              {{ t.subscriptionStatus }}
            </UiBadge>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-md">
          <div class="rounded-md bg-surface p-md">
            <p class="text-caption text-steel">Инструкций</p>
            <p class="mt-1 text-h4 text-navy">{{ t.instructionsCount }}</p>
          </div>
          <div class="rounded-md bg-surface p-md">
            <p class="text-caption text-steel">Визиты · 30 дн</p>
            <p class="mt-1 text-h4 text-navy">{{ t.visits30d }}</p>
          </div>
          <div class="rounded-md bg-surface p-md">
            <p class="text-caption text-steel">Создана</p>
            <p class="mt-1 text-body-sm-md text-ink">{{ formatDate(t.createdAt) }}</p>
          </div>
        </div>

        <UiTable v-if="t.instructions.length" min-width="720px">
          <thead>
            <tr>
              <th class="text-left">Инструкция</th>
              <th class="text-left">Статус</th>
              <th class="text-right">Визиты · 30 дн</th>
              <th class="text-right">Просмотры · 30 дн</th>
              <th class="text-right">Обновлена</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in t.instructions" :key="i.id">
              <td>
                <p class="text-body-sm-md text-ink">{{ i.title }}</p>
                <p class="text-caption text-steel">/{{ t.slug }}/{{ i.slug }}</p>
              </td>
              <td class="align-top">
                <UiBadge :variant="statusBadgeVariant(i.status)">{{ i.status }}</UiBadge>
              </td>
              <td class="align-top text-right text-body-sm text-ink">{{ i.visits30d }}</td>
              <td class="align-top text-right text-body-sm text-ink">{{ i.pageViews30d }}</td>
              <td class="align-top text-right text-caption text-steel">{{ formatDate(i.updatedAt) }}</td>
            </tr>
          </tbody>
        </UiTable>
        <p v-else class="py-md text-body text-steel">Инструкций пока нет.</p>
      </div>

      <p v-if="!data.tenants.length" class="py-md text-body text-steel">
        Пользователь не состоит ни в одной компании.
      </p>
    </div>
  </div>
</template>
