<script setup lang="ts">
definePageMeta({ layout: 'blank', middleware: 'guest' })

const form = reactive({ email: '', password: '', name: '', tenantName: '', tenantSlug: '' })
const error = ref<string | null>(null)
const loading = ref(false)
const { refresh } = useAuthState()

watch(() => form.tenantName, (n) => {
  if (!form.tenantSlug) {
    form.tenantSlug = n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  }
})

async function submit() {
  error.value = null
  loading.value = true
  try {
    await $fetch('/api/auth/register', { method: 'POST', body: form })
    await refresh()
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'Не удалось зарегистрироваться'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="container-page flex min-h-screen items-center justify-center py-section">
    <div class="w-full max-w-md">
      <NuxtLink to="/" class="mb-8 inline-flex items-center gap-2">
        <img src="/icons/icon-192.png" alt="" width="36" height="36" class="h-9 w-9 rounded-md" />
        <span class="text-h5 text-ink">quar.io</span>
      </NuxtLink>
      <h1 class="text-h2 text-ink">Создать аккаунт</h1>
      <p class="mt-2 text-body text-slate">1 месяц триала для первых QR-инструкций и отчета по проблемным шагам.</p>

      <form class="mt-8 grid gap-4" @submit.prevent="submit">
        <UiInput v-model="form.email" type="email" label="Email" autocomplete="email" required />
        <UiInput v-model="form.password" type="password" label="Пароль" hint="Минимум 8 символов" autocomplete="new-password" required />
        <UiInput v-model="form.name" label="Имя" autocomplete="name" />
        <hr class="border-hairline">
        <UiInput v-model="form.tenantName" label="Название компании" required />
        <UiInput v-model="form.tenantSlug" label="Slug компании" :prefix="`quar.io/`" hint="Латиница, цифры, дефис" required />

        <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>

        <UiButton type="submit" :loading="loading" block>Создать аккаунт</UiButton>
      </form>

      <p class="mt-6 text-body-sm text-steel">
        Уже есть аккаунт?
        <NuxtLink to="/auth/login" class="text-link hover:underline">Войти</NuxtLink>
      </p>
    </div>
  </div>
</template>
