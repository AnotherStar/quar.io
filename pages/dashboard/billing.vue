<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const { currentTenant, refresh: refreshAuth } = useAuthState()

const billingKey = computed(() => `billing-state-${currentTenant.value?.id ?? 'none'}`)
const { data, refresh } = await useAsyncData(
  billingKey,
  () => api<any>('/api/billing/state'),
  {
    watch: [() => currentTenant.value?.id]
  }
)

const activating = ref(false)
const error = ref<string | null>(null)

async function startTrial() {
  if (!confirm('Активировать триал на 30 дней? Доступны все Plus-функции, лимит инструкций (3) сохраняется.')) return
  activating.value = true; error.value = null
  try {
    await api('/api/billing/trial', { method: 'POST' })
    await Promise.all([refresh(), refreshAuth()])
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Ошибка'
  } finally { activating.value = false }
}

const trialBlocked = computed(() =>
  !!data.value?.trial?.trialUsedAt || (data.value?.plan !== 'free' && data.value?.status === 'active')
)
</script>

<template>
  <div class="space-y-xl">
    <h1 class="text-h2 text-ink">Тариф и оплата</h1>

    <UiCard>
      <div class="flex items-start justify-between gap-md">
        <div>
          <p class="text-caption text-steel uppercase">Текущий тариф</p>
          <p class="mt-1 text-h2 capitalize">{{ data?.plan }}</p>
          <div class="mt-1 flex items-center gap-2">
            <UiBadge v-if="data?.status === 'trialing'" variant="orange">TRIAL</UiBadge>
            <UiBadge v-else-if="data?.status === 'active' && data?.plan !== 'free'" variant="purple">ACTIVE</UiBadge>
            <UiBadge v-else variant="tag-purple">{{ data?.status }}</UiBadge>
          </div>
        </div>
        <div v-if="data?.trial?.isTrialing" class="text-right">
          <p class="text-caption text-steel uppercase">Триал заканчивается через</p>
          <p class="mt-1 text-h3">{{ data.trial.daysLeft }} дн.</p>
          <p class="text-caption text-steel">{{ new Date(data.currentPeriodEnd).toLocaleDateString() }}</p>
        </div>
      </div>
    </UiCard>

    <UiCard v-if="data?.trial?.isTrialing" tint="yellow" :bordered="false">
      <h3 class="text-h4">Что включено в триале</h3>
      <ul class="mt-2 space-y-1 text-body-sm text-charcoal">
        <li>✓ Кастомные секции</li>
        <li>✓ Модули (warranty-registration, ...)</li>
        <li>✓ Approval workflow</li>
        <li>✓ Расширенная аналитика (1 год)</li>
        <li class="text-charcoal/70">⚠️ Лимит инструкций — 3, чтобы по окончании триала ничего не пропало</li>
      </ul>
      <p class="mt-md text-caption text-charcoal/70">
        После окончания триала платные функции отключатся. Кастомные секции и модули останутся в БД,
        но перестанут отображаться на публичных страницах до подключения платного пакета.
        Сами инструкции продолжат работать.
      </p>
    </UiCard>

    <UiCard v-else-if="!trialBlocked">
      <h3 class="text-h4">Запустить триал Plus на 30 дней</h3>
      <p class="mt-2 text-body text-slate">
        Все функции Plus — кастомные секции, модули, workflow одобрения. Лимит инструкций
        остаётся 3, чтобы по окончании триала ничего не пропало.
      </p>
      <UiAlert v-if="error" kind="error" class="mt-md">{{ error }}</UiAlert>
      <UiButton class="mt-md" :loading="activating" @click="startTrial">Активировать триал</UiButton>
    </UiCard>

    <UiCard v-else-if="data?.trial?.trialUsedAt">
      <h3 class="text-h4">Триал уже использован</h3>
      <p class="mt-2 text-body text-slate">
        Триал был активирован {{ new Date(data.trial.trialUsedAt).toLocaleDateString() }}.
        Для постоянного доступа к платным функциям подключите оплату.
      </p>
    </UiCard>

    <UiAlert kind="info" title="Биллинг ещё не подключён">
      Реальная оплата (Stripe / ЮKassa) — в TODO. Сейчас доступен только триал.
    </UiAlert>
  </div>
</template>
