<script setup lang="ts">
definePageMeta({ layout: 'blank', middleware: 'guest' })

const email = ref('')
const loading = ref(false)
const sent = ref(false)
const error = ref<string | null>(null)

async function submit() {
  error.value = null
  loading.value = true
  try {
    await $fetch('/api/auth/forgot-password', { method: 'POST', body: { email: email.value } })
    sent.value = true
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'Не удалось отправить письмо'
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
      <h1 class="text-h4 text-ink text-center">Восстановление пароля</h1>

      <template v-if="sent">
        <p class="mt-4 text-body text-charcoal text-center">
          Если такой email есть в системе — мы отправили на него ссылку для сброса пароля.
          Проверьте входящие, ссылка действует 1 час.
        </p>
        <UiButton class="mt-6" to="/auth/login" variant="secondary" block>Вернуться ко входу</UiButton>
      </template>

      <template v-else>
        <p class="mt-2 text-body-sm text-steel text-center">
          Укажите email — мы пришлём ссылку для задания нового пароля.
        </p>

        <form class="mt-8 grid gap-4" @submit.prevent="submit">
          <UiInput v-model="email" type="email" label="Email" autocomplete="email" required />
          <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>
          <UiButton type="submit" :loading="loading" block>Прислать ссылку</UiButton>
        </form>

        <p class="mt-6 text-body-sm text-steel text-center">
          <NuxtLink to="/auth/login" class="text-link hover:underline">Вернуться ко входу</NuxtLink>
        </p>
      </template>
    </div>
  </div>
</template>
