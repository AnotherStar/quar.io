<script setup lang="ts">
const { user } = useAuthState()
const { startTrial, loading: trialLoading } = useStartTrial()
</script>

<template>
  <div class="min-h-screen bg-canvas">
    <header class="sticky top-0 z-30 border-b border-hairline bg-canvas/80 backdrop-blur-md backdrop-saturate-150 supports-[backdrop-filter]:bg-canvas/70">
      <div class="container-page flex h-16 items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2">
          <img src="/icons/icon-192.png" alt="" width="40" height="40" class="h-10 w-10 rounded-md" />
          <span class="text-h5 text-[#808080]">quar.io</span>
        </NuxtLink>
        <nav class="hidden items-center gap-6 md:flex">
          <NuxtLink to="/#why" class="text-body-sm-md text-[#808080] hover:text-ink">Почему quar.io</NuxtLink>
          <NuxtLink to="/#trust" class="text-body-sm-md text-[#808080] hover:text-ink">Нам доверяют</NuxtLink>
          <NuxtLink to="/#how" class="text-body-sm-md text-[#808080] hover:text-ink">Как это работает</NuxtLink>
          <NuxtLink to="/#pricing" class="text-body-sm-md text-[#808080] hover:text-ink">Тарифы</NuxtLink>
          <NuxtLink to="/blog" class="text-body-sm-md text-[#808080] hover:text-ink">Блог</NuxtLink>
        </nav>
        <div class="flex items-center gap-3">
          <template v-if="user">
            <UiButton to="/dashboard" variant="primary" size="sm">Кабинет</UiButton>
          </template>
          <template v-else>
            <UiButton to="/auth/login" variant="ghost" size="sm">Войти</UiButton>
            <UiButton variant="primary" size="sm" :loading="trialLoading" @click="startTrial">Попробовать бесплатно</UiButton>
          </template>
        </div>
      </div>
    </header>

    <main>
      <slot />
    </main>

    <footer>
      <div class="container-page pt-lg pb-[30px]">
        <div class="flex flex-col items-center gap-sm md:flex-row md:justify-between">
          <div class="flex items-center gap-2">
            <img src="/icons/icon-192.png" alt="" width="24" height="24" class="h-6 w-6 rounded" />
            <span class="text-body-sm text-steel">© {{ new Date().getFullYear() }} quar.io</span>
          </div>
          <div class="hidden gap-md text-body-sm text-steel md:flex">
            <NuxtLink to="/#why">Почему quar.io</NuxtLink>
            <NuxtLink to="/#trust">Нам доверяют</NuxtLink>
            <NuxtLink to="/#how">Как это работает</NuxtLink>
            <NuxtLink to="/#pricing">Тарифы</NuxtLink>
            <NuxtLink to="/blog">Блог</NuxtLink>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>
