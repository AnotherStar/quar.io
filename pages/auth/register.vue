<script setup lang="ts">
definePageMeta({ layout: 'blank', middleware: 'guest' })

const form = reactive({ email: '', password: '', tenantName: '', tenantSlug: '', acceptedTerms: false })
const error = ref<string | null>(null)
const loading = ref(false)
const tryingAnonymous = ref(false)
const slugTouched = ref(false)
const { refresh } = useAuthState()
const { track } = useTrackGoal()

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
  track('signup_started')
  try {
    await $fetch('/api/auth/register', { method: 'POST', body: form })
    await refresh()
    track('signup_completed')
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'Не удалось зарегистрироваться'
  } finally {
    loading.value = false
  }
}

async function tryWithoutRegistration() {
  error.value = null
  tryingAnonymous.value = true
  try {
    await $fetch('/api/auth/anonymous-start', { method: 'POST' })
    await refresh()
    track('trial_started')
    await navigateTo('/dashboard')
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'Не удалось создать trial-аккаунт'
  } finally {
    tryingAnonymous.value = false
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

        <label class="flex items-start gap-2 text-body-sm text-charcoal">
          <input v-model="form.acceptedTerms" type="checkbox" class="mt-1 h-4 w-4 shrink-0 rounded border-hairline-strong" required>
          <span>
            Я принимаю
            <NuxtLink to="/legal/terms" target="_blank" class="text-link hover:underline">пользовательское соглашение</NuxtLink>.
          </span>
        </label>

        <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>

        <UiButton type="submit" :loading="loading" :disabled="!form.acceptedTerms" block>Создать аккаунт и войти</UiButton>

        <p class="text-body-sm text-steel">
          После создания аккаунта мы отправим письмо для подтверждения email. В личный кабинет вы попадёте сразу — подтвердить почту можно позже.
        </p>
      </form>

      <div class="my-6 flex items-center gap-3">
        <hr class="flex-1 border-hairline" />
        <span class="text-caption text-steel">или</span>
        <hr class="flex-1 border-hairline" />
      </div>

      <UiButton variant="secondary" :loading="tryingAnonymous" block @click="tryWithoutRegistration">
        Попробовать без регистрации
      </UiButton>
      <p class="mt-2 text-caption text-steel text-center">
        Мы создадим временный trial-аккаунт. Нажимая кнопку, вы принимаете
        <NuxtLink to="/legal/terms" target="_blank" class="text-link hover:underline">пользовательское соглашение</NuxtLink>.
        Завершить регистрацию (задать email и пароль) можно в любой момент из дашборда.
      </p>

      <p class="mt-6 text-body-sm text-steel">
        Уже есть аккаунт?
        <NuxtLink to="/auth/login" class="text-link hover:underline">Войти</NuxtLink>
      </p>
    </div>
  </div>
</template>
