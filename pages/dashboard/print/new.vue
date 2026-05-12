<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

import type { PrintTemplateListItem } from '~~/shared/schemas/printBatch'

const api = useApi()
const router = useRouter()
const { currentTenant } = useAuthState()

const templatesKey = computed(() => `print-templates-${currentTenant.value?.id ?? 'none'}`)
const { data: templatesData, pending: templatesPending } = await useAsyncData(
  templatesKey,
  () => api<{ templates: PrintTemplateListItem[] }>('/api/print-templates'),
  { default: () => ({ templates: [] }) }
)
const templates = computed(() => templatesData.value?.templates ?? [])

const availabilityKey = computed(() => `print-availability-${currentTenant.value?.id ?? 'none'}`)
const { data: availData, refresh: refreshAvail } = await useAsyncData(
  availabilityKey,
  () => api<{ available: number }>('/api/print-batches/availability'),
  { default: () => ({ available: 0 }), watch: [() => currentTenant.value?.id] }
)
const available = computed(() => availData.value?.available ?? 0)

const selectedTemplate = ref<string | null>(null)
const count = ref(100)
const submitting = ref(false)
const error = ref<string | null>(null)

// По умолчанию выбираем первый шаблон, как только список загрузился.
watchEffect(() => {
  if (!selectedTemplate.value && templates.value.length) {
    selectedTemplate.value = templates.value[0].code
  }
})

const tooMany = computed(() => Number(count.value) > available.value)
const canSubmit = computed(() => !!selectedTemplate.value && Number(count.value) >= 1 && !tooMany.value && !submitting.value)

async function submit() {
  if (!selectedTemplate.value) return
  error.value = null
  submitting.value = true
  try {
    await api('/api/print-batches', {
      method: 'POST',
      body: { templateCode: selectedTemplate.value, count: Number(count.value) }
    })
    await refreshAvail()
    router.push('/dashboard/print')
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Не удалось создать тираж'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:printer" title="Подготовка к печати">
      <template #actions>
        <UiButton variant="secondary" to="/dashboard/print">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          К списку тиражей
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm space-y-xl">

      <section class="space-y-md">
        <div class="flex items-baseline justify-between">
          <h2 class="text-body-md-md text-charcoal">Шаблон</h2>
          <span class="text-caption text-steel">{{ templates.length }} доступно</span>
        </div>

        <div v-if="templatesPending" class="flex items-center gap-2 text-body-sm text-steel">
          <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
          Загружаю шаблоны…
        </div>

        <div v-else class="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="t in templates"
            :key="t.code"
            type="button"
            :class="[
              'group flex flex-col items-stretch rounded-lg border bg-canvas p-md text-left transition-colors',
              selectedTemplate === t.code
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-hairline hover:border-primary/40'
            ]"
            @click="selectedTemplate = t.code"
          >
            <div class="flex h-32 items-center justify-center rounded-md bg-surface">
              <img v-if="t.previewUrl" :src="t.previewUrl" :alt="t.name" class="h-28 w-auto">
              <Icon v-else name="lucide:image" class="h-10 w-10 text-stone" />
            </div>
            <div class="mt-md space-y-1">
              <div class="flex items-center justify-between gap-2">
                <span class="text-body-sm-md text-ink">{{ t.name }}</span>
                <span class="text-caption text-steel">{{ t.size.widthMm }}×{{ t.size.heightMm }} мм</span>
              </div>
              <p class="text-caption text-steel">{{ t.description }}</p>
            </div>
          </button>
        </div>
      </section>

      <section class="space-y-md">
        <h2 class="text-body-md-md text-charcoal">Количество</h2>
        <div class="max-w-sm space-y-md">
          <UiInput
            v-model="count"
            type="number"
            label="Сколько QR попадёт в тираж"
            :hint="`Будут использованы свободные непечатанные QR. Доступно: ${available}.`"
          />
          <UiAlert v-if="tooMany" kind="warning">
            Запрошено больше, чем доступно. Сгенерируйте новые QR-коды в разделе «QR-коды».
          </UiAlert>
          <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>
        </div>
      </section>

      <div class="flex items-center justify-end gap-md border-t border-hairline pt-lg">
        <UiButton variant="secondary" to="/dashboard/print" :disabled="submitting">
          Отмена
        </UiButton>
        <UiButton
          variant="primary"
          :loading="submitting"
          :disabled="!canSubmit"
          @click="submit"
        >
          <Icon name="lucide:printer" class="h-4 w-4" />
          Сгенерировать PDF
        </UiButton>
      </div>
    </div>
  </div>
</template>
