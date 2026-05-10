<script setup lang="ts">
const props = defineProps<{
  instructionId: string
  versionId?: string | null
  config: Record<string, any>
  viewerSessionId: string
}>()
const legal = inject<any>('publicLegal', null)

const title = computed(() => String(props.config?.title ?? 'Свяжитесь с нами'))
const description = computed(() => String(props.config?.description ?? ''))
const successMsg = computed(() => String(props.config?.successMessage ?? 'Спасибо! Ваше сообщение получено.'))

const requireFio = computed(() => Boolean(props.config?.requireFio ?? true))
const requirePhone = computed(() => Boolean(props.config?.requirePhone ?? false))
const requireEmail = computed(() => Boolean(props.config?.requireEmail ?? true))
const requireTelegram = computed(() => Boolean(props.config?.requireTelegram ?? false))
const requireMessage = computed(() => Boolean(props.config?.requireMessage ?? true))

const form = reactive({
  fio: '',
  phone: '',
  email: '',
  telegram: '',
  message: ''
})
const consent = ref({
  personalData: false,
  marketing: false
})
const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const errorMsg = ref<string | null>(null)
const documentVersionIds = computed(() => {
  const docs = legal?.documents ?? {}
  return [
    docs.PERSONAL_DATA_CONSENT?.id,
    consent.value.marketing ? docs.MARKETING_CONSENT?.id : null
  ].filter(Boolean)
})
const canSubmit = computed(() => consent.value.personalData && status.value !== 'loading')

async function submit() {
  if (!consent.value.personalData) return
  status.value = 'loading'
  errorMsg.value = null
  try {
    await $fetch('/api/modules/feedback/submit', {
      method: 'POST',
      body: {
        instructionId: props.instructionId,
        fio: form.fio || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        telegram: form.telegram || undefined,
        message: form.message || undefined,
        versionId: props.versionId ?? undefined,
        sessionId: props.viewerSessionId,
        pageUrl: window.location.href,
        consent: {
          personalData: consent.value.personalData,
          marketing: consent.value.marketing,
          documentVersionIds: documentVersionIds.value
        }
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
  <section class="rounded-lg border border-hairline bg-canvas p-xl my-lg" data-module="feedback">
    <!-- Success state replaces the whole panel content. Showing the title +
         description after submit looks like the form is still asking for
         input. -->
    <div v-if="status === 'success'" class="flex items-start gap-3 rounded-md bg-tint-mint p-md text-body text-charcoal">
      <span class="text-xl leading-none">✓</span>
      <span>{{ successMsg }}</span>
    </div>

    <template v-else>
      <h3 class="text-h4 text-ink">{{ title }}</h3>
      <p v-if="description" class="mt-1 text-body-sm text-slate">{{ description }}</p>

      <form class="mt-md grid gap-3" @submit.prevent="submit">
        <UiInput v-model="form.fio" label="ФИО" :required="requireFio" />
        <UiInput v-model="form.phone" type="tel" label="Телефон" :required="requirePhone" />
        <UiInput v-model="form.email" type="email" label="Email" :required="requireEmail" />
        <UiInput v-model="form.telegram" label="Telegram" placeholder="@username" :required="requireTelegram" />
        <label class="block">
          <span class="mb-1 block text-body-sm-md text-ink">
            Сообщение<span v-if="requireMessage" class="text-error">&nbsp;*</span>
          </span>
          <textarea
            v-model="form.message"
            rows="4"
            :required="requireMessage"
            class="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-body outline-none focus:border-primary"
          />
        </label>
        <PublicConsentFields
          v-model="consent"
          :legal="legal"
          purpose="обработка обращения и обратная связь по товару"
        />
        <UiAlert v-if="status === 'error'" kind="error">{{ errorMsg }}</UiAlert>
        <UiButton type="submit" :loading="status === 'loading'" :disabled="!canSubmit" block>Отправить</UiButton>
      </form>
    </template>
  </section>
</template>
