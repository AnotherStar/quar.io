<script setup lang="ts">
const { user, currentTenant } = useAuthState()
const route = useRoute()
const items = computed(() => [
  { to: '/dashboard', label: 'Обзор', exact: true },
  { to: '/dashboard/instructions', label: 'Инструкции' },
  { to: '/dashboard/sections', label: 'Секции' },
  { to: '/dashboard/modules', label: 'Модули' },
  { to: '/dashboard/team', label: 'Команда' },
  { to: '/dashboard/billing', label: 'Тариф и оплата' },
  { to: '/dashboard/settings', label: 'Настройки' }
])
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
            v-for="i in items"
            :key="i.to"
            :to="i.to"
            :class="[
              'rounded-md px-md py-sm text-body-sm-md transition-colors',
              isActive(i.to, i.exact) ? 'bg-canvas text-ink shadow-subtle' : 'text-steel hover:bg-canvas/60 hover:text-ink'
            ]"
          >
            {{ i.label }}
          </NuxtLink>
        </nav>
      </aside>
      <section>
        <slot />
      </section>
    </div>
  </div>
</template>
