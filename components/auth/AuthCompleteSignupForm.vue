<script setup lang="ts">
// Форма «дорегистрации» trial-аккаунта. Используется и на отдельной странице
// /auth/complete (для deep-link'ов), и в модалке внутри дашборда — чтобы
// внутридашбордный сценарий не менял layout (это раньше приводило к
// «белому экрану» из-за каскада page/layout transitions с mode: 'out-in').
//
// После успешного сабмита эмитим 'success' — родитель сам решает, навигировать
// в дашборд или просто закрыть модалку и обновить состояние.

const emit = defineEmits<{ success: [] }>()

const { currentTenant, refresh } = useAuthState()

const form = reactive({
  email: '',
  password: '',
  tenantName: currentTenant.value?.name ?? '',
  tenantSlug: currentTenant.value?.slug ?? '',
  acceptedTerms: false
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
        tenantSlug: form.tenantSlug || undefined,
        acceptedTerms: form.acceptedTerms
      }
    })
    await refresh()
    emit('success')
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'Не удалось завершить регистрацию'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form class="grid gap-4" @submit.prevent="submit">
    <UiInput v-model="form.email" type="email" label="Email" autocomplete="email" required />
    <UiInput v-model="form.password" type="password" label="Пароль" hint="Минимум 8 символов" autocomplete="new-password" required />
    <hr class="border-hairline">
    <UiInput v-model="form.tenantName" label="Название компании или бренда" />
    <UiInput v-model="form.tenantSlug" label="Ваша ссылка" :prefix="`quar.io/`" hint="Латиница, цифры, дефис" @input="onSlugInput" />

    <label class="flex items-start gap-2 text-body-sm text-charcoal">
      <input v-model="form.acceptedTerms" type="checkbox" class="mt-1 h-4 w-4 shrink-0 rounded border-hairline-strong" required>
      <span>
        Я принимаю
        <NuxtLink to="/legal/terms" target="_blank" class="text-link hover:underline">пользовательское соглашение</NuxtLink>.
      </span>
    </label>

    <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>

    <UiButton type="submit" :loading="loading" :disabled="!form.acceptedTerms" block>Сохранить и продолжить</UiButton>
  </form>
</template>
