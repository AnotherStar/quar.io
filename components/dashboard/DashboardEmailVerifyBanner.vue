<script setup lang="ts">
// Top-of-dashboard nudge. Two modes (приоритетный first):
//   1. needsSignup   — анонимный trial-аккаунт, ведём на /auth/complete.
//   2. !emailVerified — обычный аккаунт без подтверждённой почты, кнопка
//                       повторной отправки письма.
// Стилистически — мягкий tint (bg-tint-peach), без бордера, primary-кнопка,
// в духе UiAlert. На мобиле кнопка переезжает под текст, иконка не «гуляет».

const { user, refresh } = useAuthState()

const sending = ref(false)
const sent = ref(false)
const error = ref<string | null>(null)
const completeModalOpen = ref(false)

const needsSignup = computed(() => !!user.value?.needsSignup)
const needsVerify = computed(() => !!user.value && !user.value.needsSignup && !user.value.emailVerified)
const visible = computed(() => needsSignup.value || needsVerify.value)

function onSignupSuccess() {
  completeModalOpen.value = false
  // Стейт уже свежий — refresh() сделан внутри формы.
}

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
  <div v-if="visible" class="rounded-md bg-tint-peach px-md py-sm text-charcoal">
    <!-- На мобиле column, на sm+ — иконка/текст слева, кнопка справа. -->
    <div class="flex flex-col gap-sm sm:flex-row sm:items-center">
      <div class="flex min-w-0 flex-1 items-start gap-sm">
        <Icon
          :name="needsSignup ? 'lucide:user-plus' : 'lucide:mail-warning'"
          class="mt-0.5 h-5 w-5 shrink-0 text-warning"
        />
        <p v-if="needsSignup" class="text-body-sm leading-snug">
          Вы работаете в <span class="font-medium">пробном аккаунте</span>. Завершите регистрацию, чтобы сохранить данные — инструкции без подтверждённого email удаляются через 24 часа.
        </p>
        <p v-else class="text-body-sm leading-snug">
          Подтвердите email <span class="font-medium">{{ user!.email }}</span> — пока он не подтверждён, на ваших 
          инструкциях будет выводиться предупреждение о необходимости подтверждения email.
        </p>
      </div>

      <div class="shrink-0 sm:ml-md">
        <UiButton v-if="needsSignup" size="sm" variant="primary" @click="completeModalOpen = true">
          Завершить регистрацию
        </UiButton>
        <UiButton v-else size="sm" variant="primary" :loading="sending" :disabled="sent" @click="resend">
          {{ sent ? 'Письмо отправлено' : 'Отправить письмо' }}
        </UiButton>
      </div>
    </div>

    <p v-if="error && !needsSignup" class="mt-2 text-body-sm">{{ error }}</p>
  </div>

  <!-- Модалка дозаполнения — открывается прямо в дашборде, без смены layout.
       Раньше тут была навигация на /auth/complete, но переход между layouts
       (dashboard → blank) с двойным transition давал «белый экран». -->
  <UiModal v-model:open="completeModalOpen" title="Завершите регистрацию" size="sm">
    <p class="mb-md text-body-sm text-charcoal">
      Укажите email и пароль — без них вы не сможете снова войти в пробный аккаунт.
    </p>
    <AuthCompleteSignupForm @success="onSignupSuccess" />
  </UiModal>
</template>
