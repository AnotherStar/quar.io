<script setup lang="ts">
import { moduleRegistry } from '~~/modules-sdk/registry'

const { user, currentTenant } = useAuthState()
const route = useRoute()
const api = useApi()
const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)

// Core nav items
const coreItems = [
  { to: '/dashboard', label: 'Обзор', icon: 'lucide:layout-dashboard', exact: true },
  { to: '/dashboard/instructions', label: 'Инструкции', icon: 'lucide:file-text' },
  { to: '/dashboard/sections', label: 'Секции', icon: 'lucide:blocks' },
  { to: '/dashboard/modules', label: 'Модули', icon: 'lucide:puzzle' },
  { to: '/dashboard/qr-codes', label: 'QR-коды', icon: 'lucide:qr-code' },
  { to: '/dashboard/billing', label: 'Тариф и оплата', icon: 'lucide:credit-card' },
  { to: '/dashboard/settings', label: 'Настройки', icon: 'lucide:settings' }
]

// Per-module sidebar entries — appear only when the module is enabled for
// this tenant. Module declares its dashboardNavItem in modules-sdk/registry.
const sidebarModulesKey = computed(() => `sidebar-modules-${currentTenant.value?.id ?? 'none'}`)
const { data: modulesData } = await useAsyncData(
  sidebarModulesKey,
  () => api<{ modules: any[] }>('/api/modules'),
  {
    default: () => ({ modules: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

const moduleNavItems = computed(() => {
  return moduleRegistry
    .filter((m) => m.dashboardNavItem)
    .filter((m) => modulesData.value?.modules.find((api) => api.code === m.manifest.code)?.tenantConfig?.enabled)
    .map((m) => ({ ...m.dashboardNavItem!, code: m.manifest.code }))
})

const isActive = (to: string, exact?: boolean) =>
  exact ? route.path === to : route.path.startsWith(to)

watch(() => route.fullPath, () => {
  mobileMenuOpen.value = false
})

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await navigateTo('/auth/login')
}
</script>

<template>
  <div class="min-h-screen bg-surface-soft">
    <header class="sticky top-0 z-40 border-b border-hairline bg-canvas">
      <div class="container-page flex h-16 items-center justify-between">
        <div class="flex min-w-0 items-center gap-4">
          <NuxtLink to="/dashboard" class="flex items-center gap-2">
            <div class="grid h-8 w-8 place-items-center rounded-md bg-primary text-white text-h5">q</div>
            <span class="text-body-md text-ink">quar.io</span>
          </NuxtLink>
          <span v-if="currentTenant" class="hidden rounded-sm bg-surface px-2 py-1 text-body-sm-md text-charcoal sm:inline-flex">
            {{ currentTenant.name }}
          </span>
        </div>
        <div class="flex items-center gap-3">
          <span class="hidden text-body-sm text-steel md:inline">{{ user?.email }}</span>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-md text-charcoal transition-colors hover:bg-surface md:hidden"
            :aria-label="mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'"
            :aria-expanded="mobileMenuOpen"
            aria-controls="mobile-dashboard-menu"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <Icon :name="mobileMenuOpen ? 'lucide:x' : 'lucide:menu'" class="h-4 w-4" />
          </button>
          <UiButton variant="ghost" size="sm" @click="logout">Выйти</UiButton>
        </div>
      </div>
      <Transition name="dashboard-mobile-menu">
        <div
          v-show="mobileMenuOpen"
          id="mobile-dashboard-menu"
          class="border-t border-hairline bg-canvas md:hidden"
        >
          <nav class="container-page flex max-h-[calc(100vh-4rem)] flex-col gap-1 overflow-y-auto py-sm">
            <NuxtLink
              v-for="i in coreItems"
              :key="i.to"
              :to="i.to"
              :class="[
                'flex h-10 items-center gap-3 rounded-md px-md text-body-sm-md transition-colors',
                isActive(i.to, i.exact) ? 'bg-surface text-ink' : 'text-steel hover:bg-surface hover:text-ink'
              ]"
            >
              <Icon :name="i.icon" class="h-4 w-4 shrink-0" />
              <span class="truncate">{{ i.label }}</span>
            </NuxtLink>

            <template v-if="moduleNavItems.length">
              <hr class="my-sm border-hairline" />
              <NuxtLink
                v-for="i in moduleNavItems"
                :key="i.to"
                :to="i.to"
                :class="[
                  'flex h-10 items-center gap-3 rounded-md px-md text-body-sm-md transition-colors',
                  isActive(i.to) ? 'bg-surface text-ink' : 'text-steel hover:bg-surface hover:text-ink'
                ]"
              >
                <Icon :name="i.icon" class="h-4 w-4 shrink-0" />
                <span class="truncate">{{ i.label }}</span>
              </NuxtLink>
            </template>
          </nav>
        </div>
      </Transition>
    </header>
    <div
      class="container-page dashboard-shell gap-8 py-2xl"
      :class="{ 'is-sidebar-collapsed': sidebarCollapsed }"
    >
      <aside class="hidden md:block">
        <div class="sticky top-[88px]">
          <button
            type="button"
            class="mb-sm flex h-9 w-full items-center justify-center gap-2 rounded-md text-body-sm-md text-steel transition-colors hover:bg-canvas hover:text-ink"
            :aria-label="sidebarCollapsed ? 'Развернуть меню' : 'Свернуть меню'"
            :aria-expanded="!sidebarCollapsed"
            @click="sidebarCollapsed = !sidebarCollapsed"
          >
            <Icon
              :name="sidebarCollapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'"
              class="h-4 w-4 shrink-0"
            />
            <span v-if="!sidebarCollapsed">Свернуть</span>
          </button>
          <nav class="flex flex-col gap-1">
            <NuxtLink
              v-for="i in coreItems"
              :key="i.to"
              :to="i.to"
              :title="sidebarCollapsed ? i.label : undefined"
              :class="[
                'flex h-10 items-center rounded-md text-body-sm-md transition-colors',
                sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-md',
                isActive(i.to, i.exact) ? 'bg-canvas text-ink shadow-subtle' : 'text-steel hover:bg-canvas/60 hover:text-ink'
              ]"
            >
              <Icon :name="i.icon" class="h-4 w-4 shrink-0" />
              <span :class="sidebarCollapsed ? 'sr-only' : 'truncate'">{{ i.label }}</span>
            </NuxtLink>

            <template v-if="moduleNavItems.length">
              <hr class="my-sm border-hairline" />
              <NuxtLink
                v-for="i in moduleNavItems"
                :key="i.to"
                :to="i.to"
                :title="sidebarCollapsed ? i.label : undefined"
                :class="[
                  'flex h-10 items-center rounded-md text-body-sm-md transition-colors',
                  sidebarCollapsed ? 'justify-center px-0' : 'gap-3 px-md',
                  isActive(i.to) ? 'bg-canvas text-ink shadow-subtle' : 'text-steel hover:bg-canvas/60 hover:text-ink'
                ]"
              >
                <Icon :name="i.icon" class="h-4 w-4 shrink-0" />
                <span :class="sidebarCollapsed ? 'sr-only' : 'truncate'">{{ i.label }}</span>
              </NuxtLink>
            </template>
          </nav>
        </div>
      </aside>
      <section class="min-w-0">
        <slot />
      </section>
    </div>
  </div>
</template>

<style scoped>
.dashboard-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 768px) {
  .dashboard-shell {
    grid-template-columns: var(--dashboard-sidebar-width, 220px) minmax(0, 1fr);
    transition: grid-template-columns 0.2s ease;
  }

  .dashboard-shell.is-sidebar-collapsed {
    --dashboard-sidebar-width: 64px;
  }
}

.dashboard-mobile-menu-enter-active,
.dashboard-mobile-menu-leave-active {
  overflow: hidden;
  transition: opacity 0.16s ease, transform 0.16s ease, max-height 0.2s ease;
}

.dashboard-mobile-menu-enter-from,
.dashboard-mobile-menu-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-4px);
}

.dashboard-mobile-menu-enter-to,
.dashboard-mobile-menu-leave-from {
  max-height: calc(100vh - 4rem);
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .dashboard-shell,
  .dashboard-mobile-menu-enter-active,
  .dashboard-mobile-menu-leave-active {
    transition: none;
  }

  .dashboard-mobile-menu-enter-from,
  .dashboard-mobile-menu-leave-to {
    transform: none;
  }
}
</style>
