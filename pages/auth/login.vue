<script setup lang="ts">
definePageMeta({ layout: 'blank', middleware: 'guest' })

const form = reactive({ email: '', password: '' })
const error = ref<string | null>(null)
const loading = ref(false)
const { refresh } = useAuthState()

async function submit() {
  error.value = null
  loading.value = true
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: form })
    await refresh()
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'Не удалось войти'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container-page flex min-h-screen items-center justify-center py-section">
    <div class="w-full max-w-md">
      <NuxtLink to="/" class="mb-8 flex justify-center">
        <img src="/icons/icon-192.png" alt="" width="96" height="96" class="h-24 w-24 rounded-xl" />
      </NuxtLink>
      <h1 class="text-h2 text-ink text-center">Вход</h1>

      <form class="mt-8 grid gap-4" @submit.prevent="submit">
        <UiInput v-model="form.email" type="email" label="Email" autocomplete="email" required />
        <UiInput v-model="form.password" type="password" label="Пароль" autocomplete="current-password" required />
        <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>
        <UiButton type="submit" :loading="loading" block>Войти</UiButton>
      </form>

      <p class="mt-6 text-body-sm text-steel">
        Нет аккаунта?
        <NuxtLink to="/auth/register" class="text-link hover:underline">Создать</NuxtLink>
      </p>
    </div>
  </div>
</template>
