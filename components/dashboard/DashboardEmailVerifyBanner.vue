<script setup lang="ts">
// Top-of-dashboard nudge. Has two modes:
//   1. needsSignup (anonymous trial-account)  — приоритетный, красный баннер,
//      ведёт на /auth/complete для дозаполнения email/пароля.
//   2. !emailVerified                          — мягкая красная плашка с
//      кнопкой повторной отправки письма верификации.

const { user, refresh } = useAuthState()

const sending = ref(false)
const sent = ref(false)
const error = ref<string | null>(null)

const needsSignup = computed(() => !!user.value?.needsSignup)
const needsVerify = computed(() => !!user.value && !user.value.needsSignup && !user.value.emailVerified)
const visible = computed(() => needsSignup.value || needsVerify.value)

async function resend() {
  if (sending.value) return
  sending.value = true
  error.value = null
  try {
    await $fetch('/api/auth/resend-verification', { method: 'POST' })
    sent.value = true
    setTimeout(() => { sent.value = false }, 6000)
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Не удалось отправить письмо. Попробуйте позже.'
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  if (user.value && (user.value.needsSignup || !user.value.emailVerified)) refresh()
})
</script>

<template>
  <div v-if="visible" class="mb-md rounded-md border border-[#f1c2c2] bg-[#fde0e0] px-md py-sm text-[#8a1212]">
    <!-- Анонимный trial: задавим email/пароль -->
    <div v-if="needsSignup" class="flex flex-wrap items-center gap-sm">
      <Icon name="lucide:user-plus" class="h-5 w-5 shrink-0" />
      <p class="text-body-sm-md flex-1 min-w-[220px]">
        Вы в режиме <span class="font-medium">trial-аккаунта</span>. Завершите регистрацию (email и пароль) — иначе вы не сможете
        войти повторно, а на ваших публичных инструкциях будет висеть красная плашка для покупателей.
      </p>
      <UiButton size="sm" variant="dark" to="/auth/complete">Завершить регистрацию</UiButton>
    </div>

    <!-- Полноценный аккаунт без подтверждённой почты -->
    <template v-else>
      <div class="flex flex-wrap items-center gap-sm">
        <Icon name="lucide:mail-warning" class="h-5 w-5 shrink-0" />
        <p class="text-body-sm-md flex-1 min-w-[220px]">
          Подтвердите email <span class="font-medium">{{ user!.email }}</span> — пока он не подтверждён, на ваших публичных
          инструкциях показывается красная плашка для покупателей.
        </p>
        <UiButton size="sm" variant="dark" :loading="sending" :disabled="sent" @click="resend">
          {{ sent ? 'Письмо отправлено' : 'Отправить письмо' }}
        </UiButton>
      </div>
      <p v-if="error" class="mt-2 text-body-sm">{{ error }}</p>
    </template>
  </div>
</template>
