<script setup lang="ts">
const props = defineProps<{
  instructionId: string
  config: Record<string, any>
  viewerSessionId: string
}>()

const months = computed(() => Number(props.config?.warrantyMonths ?? 12))
const requirePhone = computed(() => Boolean(props.config?.requirePhone))
const requireSerial = computed(() => Boolean(props.config?.requireSerial ?? true))
const successMsg = computed(() => String(props.config?.successMessage ?? 'Спасибо! Гарантия зарегистрирована.'))

const form = reactive({
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  serialNumber: '',
  purchaseDate: ''
})
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMsg = ref<string | null>(null)

async function submit() {
  status.value = 'loading'
  errorMsg.value = null
  try {
    await $fetch('/api/modules/warranty/register', {
      method: 'POST',
      body: {
        instructionId: props.instructionId,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone || undefined,
        serialNumber: form.serialNumber || undefined,
        purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined
      }
    })
    status.value = 'success'
  } catch (e: any) {
    status.value = 'error'
    errorMsg.value = e?.data?.statusMessage ?? 'Ошибка отправки'
  }
}
</script>

<template>
  <div class="rounded-lg border border-hairline bg-tint-mint p-xl">
    <h3 class="text-h4 text-charcoal">Зарегистрируйте расширенную гарантию</h3>
    <p class="mt-1 text-body-sm text-charcoal/80">
      Получите {{ months }} месяцев расширенной гарантии бесплатно.
    </p>

    <div v-if="status === 'success'" class="mt-md text-body text-charcoal">
      ✓ {{ successMsg }}
    </div>

    <form v-else class="mt-md grid gap-3" @submit.prevent="submit">
      <UiInput v-model="form.customerName" label="Ваше имя" required />
      <UiInput v-model="form.customerEmail" type="email" label="Email" required />
      <UiInput v-if="requirePhone" v-model="form.customerPhone" label="Телефон" required />
      <UiInput v-if="requireSerial" v-model="form.serialNumber" label="Серийный номер" required />
      <UiInput v-model="form.purchaseDate" type="date" label="Дата покупки" />
      <UiAlert v-if="status === 'error'" kind="error">{{ errorMsg }}</UiAlert>
      <UiButton type="submit" :loading="status === 'loading'" block>Зарегистрировать</UiButton>
    </form>
  </div>
</template>
