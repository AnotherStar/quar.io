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
  <div>
    <PageHeader icon="lucide:credit-card" title="Тариф и оплата" />

    <div class="mt-sm space-y-xl">

    <div class="rounded-lg bg-surface p-xl">
      <div class="flex items-start justify-between gap-md">
        <div>
          <p class="text-caption-bold text-steel uppercase tracking-wide">Текущий тариф</p>
          <p class="mt-2 text-h2 capitalize text-navy">{{ data?.plan }}</p>
          <div class="mt-2 flex items-center gap-2">
            <UiBadge v-if="data?.status === 'trialing'" variant="tag-orange">TRIAL</UiBadge>
            <UiBadge v-else-if="data?.status === 'active' && data?.plan !== 'free'" variant="tag-green">ACTIVE</UiBadge>
            <UiBadge v-else variant="tag-gray">{{ data?.status }}</UiBadge>
          </div>
        </div>
        <div v-if="data?.trial?.isTrialing" class="text-right">
          <p class="text-caption-bold text-steel uppercase tracking-wide">Триал заканчивается через</p>
          <p class="mt-2 text-h3 text-navy">{{ data.trial.daysLeft }} дн.</p>
          <p class="mt-0.5 text-caption text-steel">{{ new Date(data.currentPeriodEnd).toLocaleDateString() }}</p>
        </div>
      </div>
    </div>

    <div v-if="data?.trial?.isTrialing" class="rounded-lg bg-surface p-xl">
      <div class="flex items-center gap-3">
        <Icon name="lucide:gift" class="h-5 w-5 text-navy opacity-50" />
        <h3 class="text-h4 text-navy">Что включено в триале</h3>
      </div>
      <ul class="mt-md space-y-1 text-body-sm text-charcoal">
        <li>✓ Кастомные секции</li>
        <li>✓ Модули (warranty-registration, ...)</li>
        <li>✓ Approval workflow</li>
        <li>✓ Расширенная аналитика (1 год)</li>
        <li class="text-steel">⚠️ Лимит инструкций — 3, чтобы по окончании триала ничего не пропало</li>
      </ul>
      <p class="mt-md text-caption text-steel">
        После окончания триала платные функции отключатся. Кастомные секции и модули останутся в БД,
        но перестанут отображаться на публичных страницах до подключения платного пакета.
        Сами инструкции продолжат работать.
      </p>
    </div>

    <div v-else-if="!trialBlocked" class="rounded-lg bg-surface p-xl">
      <div class="flex items-center gap-3">
        <Icon name="lucide:sparkles" class="h-5 w-5 text-navy opacity-50" />
        <h3 class="text-h4 text-navy">Запустить триал Plus на 30 дней</h3>
      </div>
      <p class="mt-sm text-body text-slate">
        Все функции Plus — кастомные секции, модули, workflow одобрения. Лимит инструкций
        остаётся 3, чтобы по окончании триала ничего не пропало.
      </p>
      <UiAlert v-if="error" kind="error" class="mt-md">{{ error }}</UiAlert>
      <UiButton class="mt-md" :loading="activating" @click="startTrial">Активировать триал</UiButton>
    </div>

    <div v-else-if="data?.trial?.trialUsedAt" class="rounded-lg bg-surface p-xl">
      <div class="flex items-center gap-3">
        <Icon name="lucide:check-circle-2" class="h-5 w-5 text-navy opacity-50" />
        <h3 class="text-h4 text-navy">Триал уже использован</h3>
      </div>
      <p class="mt-sm text-body text-slate">
        Триал был активирован {{ new Date(data.trial.trialUsedAt).toLocaleDateString() }}.
        Для постоянного доступа к платным функциям подключите оплату.
      </p>
    </div>

    <UiAlert kind="info" title="Биллинг ещё не подключён">
      Реальная оплата (Stripe / ЮKassa) — в TODO. Сейчас доступен только триал.
    </UiAlert>
    </div>
  </div>
</template>
