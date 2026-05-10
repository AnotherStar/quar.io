<script setup lang="ts">
const { user } = useAuthState()
</script>

<template>
  <div class="min-h-screen bg-canvas">
    <header class="sticky top-0 z-30 border-b border-hairline bg-canvas/95 backdrop-blur">
      <div class="container-page flex h-16 items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2">
          <img src="/icons/icon-192.png" alt="" width="40" height="40" class="h-10 w-10 rounded-md" />
          <span class="text-h5 text-ink">quar.io</span>
        </NuxtLink>
        <nav class="hidden items-center gap-6 md:flex">
          <NuxtLink to="/pricing" class="text-body-sm-md text-charcoal hover:text-ink">Тарифы</NuxtLink>
          <NuxtLink to="/#features" class="text-body-sm-md text-charcoal hover:text-ink">Возможности</NuxtLink>
        </nav>
        <div class="flex items-center gap-3">
          <template v-if="user">
            <UiButton to="/dashboard" variant="primary" size="sm">Кабинет</UiButton>
          </template>
          <template v-else>
            <UiButton to="/auth/login" variant="ghost" size="sm">Войти</UiButton>
            <UiButton to="/auth/register" variant="primary" size="sm">Начать бесплатно</UiButton>
          </template>
        </div>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer class="mt-section-lg border-t border-hairline">
      <div class="container-page py-section">
        <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-2">
            <img src="/icons/icon-192.png" alt="" width="28" height="28" class="h-7 w-7 rounded-md" />
            <span class="text-body-sm text-steel">© {{ new Date().getFullYear() }} quar.io</span>
          </div>
          <div class="flex gap-5 text-body-sm text-steel">
            <NuxtLink to="/pricing">Тарифы</NuxtLink>
            <NuxtLink to="/about">О нас</NuxtLink>
            <NuxtLink to="/terms">Условия</NuxtLink>
            <NuxtLink to="/privacy">Конфиденциальность</NuxtLink>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
