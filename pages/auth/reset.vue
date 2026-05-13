<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const route = useRoute()
const token = (route.query.token as string | undefined) ?? ''
const { refresh } = useAuthState()

const password = ref('')
const passwordConfirm = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const done = ref(false)

async function submit() {
  error.value = null
  if (!token) {
    error.value = 'Ссылка недействительна.'
    return
  }
  if (password.value.length < 8) {
    error.value = 'Пароль должен быть не короче 8 символов.'
    return
  }
  if (password.value !== passwordConfirm.value) {
    error.value = 'Пароли не совпадают.'
    return
  }
  loading.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password: password.value }
    })
    await refresh()
    done.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'Не удалось сменить пароль'
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

      <template v-if="done">
        <h1 class="text-h4 text-ink text-center">Пароль обновлён</h1>
        <p class="mt-3 text-body text-charcoal text-center">Готово! Мы залогинили вас новой сессией — все старые входы сброшены.</p>
        <UiButton class="mt-6" to="/dashboard" block>Перейти в личный кабинет</UiButton>
      </template>

      <template v-else>
        <h1 class="text-h4 text-ink text-center">Новый пароль</h1>

        <form class="mt-8 grid gap-4" @submit.prevent="submit">
          <UiInput
            v-model="password"
            type="password"
            label="Новый пароль"
            hint="Минимум 8 символов"
            autocomplete="new-password"
            required
          />
          <UiInput
            v-model="passwordConfirm"
            type="password"
            label="Повторите пароль"
            autocomplete="new-password"
            required
          />
          <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>
          <UiButton type="submit" :loading="loading" block>Сменить пароль</UiButton>
        </form>

        <p class="mt-6 text-body-sm text-steel text-center">
          <NuxtLink to="/auth/login" class="text-link hover:underline">Вернуться ко входу</NuxtLink>
        </p>
      </template>
    </div>
  </div>
</template>
