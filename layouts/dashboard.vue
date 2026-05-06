<script setup lang="ts">
import { moduleRegistry } from '~~/modules-sdk/registry'

const { user, currentTenant } = useAuthState()
const route = useRoute()
const api = useApi()

// Core nav items
const coreItems = [
  { to: '/dashboard', label: 'Обзор', icon: 'lucide:layout-dashboard', exact: true },
  { to: '/dashboard/instructions', label: 'Инструкции', icon: 'lucide:file-text' },
  { to: '/dashboard/sections', label: 'Секции', icon: 'lucide:blocks' },
  { to: '/dashboard/modules', label: 'Модули', icon: 'lucide:puzzle' },
  { to: '/dashboard/billing', label: 'Тариф и оплата', icon: 'lucide:credit-card' },
  { to: '/dashboard/settings', label: 'Настройки', icon: 'lucide:settings' }
]

// Per-module sidebar entries — appear only when the module is enabled for
// this tenant. Module declares its dashboardNavItem in modules-sdk/registry.
const { data: modulesData } = await useAsyncData(
  'sidebar-modules',
  () => api<{ modules: any[] }>('/api/modules'),
  { default: () => ({ modules: [] }) }
)

const moduleNavItems = computed(() => {
  return moduleRegistry
    .filter((m) => m.dashboardNavItem)
    .filter((m) => modulesData.value?.modules.find((api) => api.code === m.manifest.code)?.tenantConfig?.enabled)
    .map((m) => ({ ...m.dashboardNavItem!, code: m.manifest.code }))
})

const isActive = (to: string, exact?: boolean) =>
  exact ? route.path === to : route.path.startsWith(to)

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-surface-soft">
    <header class="border-b border-hairline bg-canvas">
      <div class="container-page flex h-16 items-center justify-between">
        <div class="flex items-center gap-4">
          <NuxtLink to="/dashboard" class="flex items-center gap-2">
            <div class="grid h-8 w-8 place-items-center rounded-md bg-primary text-white text-h5">M</div>
            <span class="text-body-md text-ink">ManualOnline</span>
          </NuxtLink>
          <span v-if="currentTenant" class="rounded-sm bg-surface px-2 py-1 text-body-sm-md text-charcoal">
            {{ currentTenant.name }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <span class="hidden text-body-sm text-steel md:inline">{{ user?.email }}</span>
          <UiButton variant="ghost" size="sm" @click="logout">Выйти</UiButton>
        </div>
      </div>
    </header>
    <div class="container-page grid grid-cols-1 gap-8 py-2xl md:grid-cols-[220px_1fr]">
      <aside>
        <nav class="flex flex-col gap-1">
          <NuxtLink
            v-for="i in coreItems"
            :key="i.to"
            :to="i.to"
            :class="[
              'flex items-center gap-3 rounded-md px-md py-sm text-body-sm-md transition-colors',
              isActive(i.to, i.exact) ? 'bg-canvas text-ink shadow-subtle' : 'text-steel hover:bg-canvas/60 hover:text-ink'
            ]"
          >
            <Icon :name="i.icon" class="h-4 w-4" />
            <span>{{ i.label }}</span>
          </NuxtLink>

          <template v-if="moduleNavItems.length">
            <hr class="my-sm border-hairline" />
            <NuxtLink
              v-for="i in moduleNavItems"
              :key="i.to"
              :to="i.to"
              :class="[
                'flex items-center gap-3 rounded-md px-md py-sm text-body-sm-md transition-colors',
                isActive(i.to) ? 'bg-canvas text-ink shadow-subtle' : 'text-steel hover:bg-canvas/60 hover:text-ink'
              ]"
            >
              <Icon :name="i.icon" class="h-4 w-4" />
              <span>{{ i.label }}</span>
            </NuxtLink>
          </template>
        </nav>
      </aside>
      <section>
        <slot />
      </section>
    </div>
  </div>
</template>
