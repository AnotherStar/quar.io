<script setup lang="ts">
// Имитация формы ввода карты. Все поля заполнены тестовыми данными и
// заблокированы — пока реального шлюза нет, эта модалка просто красиво
// подтверждает зачисление 5 000 ₽ на бонусный счёт через /api/billing/topup.
const props = defineProps<{
  open: boolean
  amount: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: [payload: { bonusBalance: number; credited: number }]
}>()

const api = useApi()
const submitting = ref(false)
const error = ref<string | null>(null)

const card = {
  number: '4242 4242 4242 4242',
  expiry: '12 / 29',
  cvc: '123',
  holder: 'TEST USER'
}

const formattedAmount = computed(() => `${props.amount.toLocaleString('ru-RU')} ₽`)

function close() {
  if (submitting.value) return
  emit('update:open', false)
}

async function submit() {
  if (submitting.value) return
  submitting.value = true
  error.value = null
  try {
    const res = await api<{ bonusBalance: number; credited: number }>(
      '/api/billing/topup',
      { method: 'POST', body: { amount: props.amount } }
    )
    emit('success', res)
    emit('update:open', false)
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Не удалось провести платёж'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UiModal
    :open="open"
    title="Пополнение бонусного счёта"
    size="sm"
    :close-on-backdrop="!submitting"
    :close-on-esc="!submitting"
    @update:open="close"
  >
    <div class="space-y-md">
      <div class="rounded-xl border border-hairline-soft bg-surface p-md">
        <div class="flex items-center justify-between text-body-sm text-steel">
          <span>К оплате</span>
          <span class="text-h3 text-navy">{{ formattedAmount }}</span>
        </div>
      </div>

      <div class="relative overflow-hidden rounded-xl bg-gradient-to-br from-navy to-ink p-lg text-surface">
        <div class="flex items-start justify-between">
          <span class="text-caption-bold uppercase tracking-wider opacity-70">Test mode</span>
          <Icon name="lucide:credit-card" class="h-6 w-6 opacity-80" />
        </div>
        <p class="mt-lg font-mono text-h3 tracking-widest">{{ card.number }}</p>
        <div class="mt-md flex items-end justify-between gap-md text-body-sm">
          <div>
            <p class="text-caption opacity-60 uppercase tracking-wide">Держатель</p>
            <p class="font-mono">{{ card.holder }}</p>
          </div>
          <div class="text-right">
            <p class="text-caption opacity-60 uppercase tracking-wide">Срок</p>
            <p class="font-mono">{{ card.expiry }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-md">
        <UiInput
          :model-value="card.number"
          label="Номер карты"
          disabled
          autocomplete="off"
          class="col-span-2"
        />
        <UiInput
          :model-value="card.expiry"
          label="Срок"
          disabled
          autocomplete="off"
        />
        <UiInput
          :model-value="card.cvc"
          label="CVC"
          disabled
          autocomplete="off"
        />
        <UiInput
          :model-value="card.holder"
          label="Имя на карте"
          disabled
          autocomplete="off"
          class="col-span-2"
        />
      </div>

      <p class="flex items-center gap-2 text-caption text-steel">
        <Icon name="lucide:shield-check" class="h-3.5 w-3.5" />
        Тестовый платёж — карта зафиксирована, реальное списание не произойдёт.
      </p>

      <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>
    </div>

    <template #footer>
      <div class="flex justify-end gap-sm">
        <UiButton variant="ghost" :disabled="submitting" @click="close">Отмена</UiButton>
        <UiButton :loading="submitting" @click="submit">
          Оплатить {{ formattedAmount }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>
