<script setup lang="ts">
// «Дорегистрация» анонимного trial-аккаунта: задаём email/пароль и при желании
// переименовываем компанию + slug. После успеха ведём в дашборд.
definePageMeta({ layout: 'blank', middleware: 'auth' })

const { user, currentTenant, refresh } = useAuthState()

// Если юзер сюда зашёл уже с полноценным аккаунтом — отправляем в дашборд,
// делать тут больше нечего.
if (user.value && !user.value.needsSignup) {
  await navigateTo('/dashboard')
}

const form = reactive({
  email: '',
  password: '',
  tenantName: currentTenant.value?.name ?? '',
  tenantSlug: currentTenant.value?.slug ?? ''
})
const error = ref<string | null>(null)
const loading = ref(false)
const slugTouched = ref(false)

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

watch(() => form.tenantName, (n) => {
  if (!slugTouched.value) form.tenantSlug = slugify(n)
})

function onSlugInput() { slugTouched.value = true }

async function submit() {
  error.value = null
  loading.value = true
  try {
    await $fetch('/api/auth/complete-signup', {
      method: 'POST',
      body: {
        email: form.email,
        password: form.password,
        tenantName: form.tenantName || undefined,
        tenantSlug: form.tenantSlug || undefined
      }
    })
    await refresh()
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'Не удалось завершить регистрацию'
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
      <h1 class="text-h4 text-ink text-center">Завершите регистрацию</h1>
      <p class="mt-2 text-body-sm text-steel text-center">
        Задайте email и пароль — без них вы не сможете войти в trial-аккаунт повторно.
      </p>

      <form class="mt-8 grid gap-4" @submit.prevent="submit">
        <UiInput v-model="form.email" type="email" label="Email" autocomplete="email" required />
        <UiInput v-model="form.password" type="password" label="Пароль" hint="Минимум 8 символов" autocomplete="new-password" required />
        <hr class="border-hairline">
        <UiInput v-model="form.tenantName" label="Название компании или бренда" />
        <UiInput v-model="form.tenantSlug" label="Ваша ссылка" :prefix="`quar.io/`" hint="Латиница, цифры, дефис" @input="onSlugInput" />

        <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>

        <UiButton type="submit" :loading="loading" block>Сохранить и продолжить</UiButton>
      </form>

      <p class="mt-6 text-body-sm text-steel text-center">
        <NuxtLink to="/dashboard" class="text-link hover:underline">Пока не нужно</NuxtLink>
      </p>
    </div>
  </div>
</template>
