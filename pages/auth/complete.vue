<script setup lang="ts">
// Standalone-страница для дозаполнения trial-аккаунта. Основной in-app вход —
// модалка из дашборд-баннера, см. <DashboardCompleteSignupModal>. Эта страница
// остаётся ради deep-link'ов / прямых заходов по URL.
definePageMeta({
  layout: 'blank',
  middleware: [
    'auth',
    function () {
      const { user } = useAuthState()
      if (user.value && !user.value.needsSignup) return navigateTo('/dashboard')
    }
  ]
})

async function onSuccess() {
  await navigateTo('/dashboard')
}
</script>

<template>
  <div class="container-page flex min-h-screen items-center justify-center py-section">
    <div class="w-full max-w-md">
      <NuxtLink to="/" class="mb-8 flex justify-center">
        <img src="/icons/icon-192.png" alt="" width="96" height="96" class="h-24 w-24 rounded-xl" />
      </NuxtLink>
      <h1 class="text-h4 text-ink text-center">Завершите регистрацию</h1>
      <p class="mt-2 text-body-sm text-steel text-center">
        Задайте email и пароль — без них вы не сможете войти в trial-аккаунт повторно.
      </p>

      <AuthCompleteSignupForm class="mt-8" @success="onSuccess" />
    </div>
  </div>
</template>
