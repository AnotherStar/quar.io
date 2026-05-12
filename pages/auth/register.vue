<script setup lang="ts">
definePageMeta({ layout: 'blank', middleware: 'guest' })

const form = reactive({ email: '', password: '', tenantName: '', tenantSlug: '' })
const error = ref<string | null>(null)
const loading = ref(false)
const slugTouched = ref(false)
const { refresh } = useAuthState()

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

watch(() => form.tenantName, (n) => {
  if (!slugTouched.value) {
    form.tenantSlug = slugify(n)
  }
})

function onSlugInput() {
  slugTouched.value = true
}

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
      <NuxtLink to="/" class="mb-8 flex justify-center">
        <img src="/icons/icon-192.png" alt="" width="96" height="96" class="h-24 w-24 rounded-xl" />
      </NuxtLink>
      <h1 class="text-h4 text-ink text-center">Регистрация</h1>

      <form class="mt-8 grid gap-4" @submit.prevent="submit">
        <UiInput v-model="form.email" type="email" label="Email" autocomplete="email" required />
        <UiInput v-model="form.password" type="password" label="Пароль" hint="Минимум 8 символов" autocomplete="new-password" required />
        <hr class="border-hairline">
        <UiInput v-model="form.tenantName" label="Название компании или бренда" required />
        <UiInput v-model="form.tenantSlug" label="Ваша ссылка" :prefix="`quar.io/`" hint="Латиница, цифры, дефис" required @input="onSlugInput" />

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
