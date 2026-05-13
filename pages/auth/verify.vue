<script setup lang="ts">
definePageMeta({ layout: 'blank' })

const route = useRoute()
const token = (route.query.token as string | undefined) ?? ''
const { refresh } = useAuthState()

const state = ref<'pending' | 'ok' | 'error'>('pending')
const message = ref<string | null>(null)

onMounted(async () => {
  if (!token) {
    state.value = 'error'
    message.value = 'Ссылка недействительна.'
    return
  }
  try {
    await $fetch('/api/auth/verify-email', { method: 'POST', body: { token } })
    state.value = 'ok'
    await refresh()
  } catch (e: any) {
    state.value = 'error'
    message.value = e?.data?.statusMessage ?? 'Не удалось подтвердить email.'
  }
})
</script>

<template>
  <div class="container-page flex min-h-screen items-center justify-center py-section">
    <div class="w-full max-w-md text-center">
      <NuxtLink to="/" class="mb-8 flex justify-center">
        <img src="/icons/icon-192.png" alt="" width="96" height="96" class="h-24 w-24 rounded-xl" />
      </NuxtLink>

      <template v-if="state === 'pending'">
        <h1 class="text-h4 text-ink">Подтверждаем email…</h1>
      </template>

      <template v-else-if="state === 'ok'">
        <h1 class="text-h4 text-ink">Email подтверждён</h1>
        <p class="mt-3 text-body text-charcoal">Спасибо! Теперь красная плашка с ваших инструкций исчезнет.</p>
        <UiButton class="mt-6" to="/dashboard" block>Перейти в личный кабинет</UiButton>
      </template>

      <template v-else>
        <h1 class="text-h4 text-ink">Не удалось подтвердить</h1>
        <UiAlert v-if="message" class="mt-4" kind="error">{{ message }}</UiAlert>
        <UiButton class="mt-6" to="/dashboard" variant="secondary" block>В личный кабинет</UiButton>
      </template>
    </div>
  </div>
</template>
