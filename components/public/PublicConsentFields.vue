<script setup lang="ts">
type ConsentValue = {
  personalData: boolean
  marketing: boolean
}

const props = defineProps<{
  modelValue: ConsentValue
  legal: any
  purpose: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: ConsentValue] }>()

const operator = computed(() => props.legal?.operator)
const docs = computed(() => props.legal?.documents ?? {})
const pdDoc = computed(() => docs.value.PERSONAL_DATA_CONSENT)
const marketingDoc = computed(() => docs.value.MARKETING_CONSENT)
const pdModalOpen = ref(false)
const marketingModalOpen = ref(false)

function update(key: keyof ConsentValue, value: boolean) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

function openModal(event: MouseEvent, target: 'pd' | 'marketing') {
  event.preventDefault()
  if (target === 'pd') pdModalOpen.value = true
  else marketingModalOpen.value = true
}
</script>

<template>
  <div class="space-y-sm text-caption text-charcoal">
    <label class="flex items-start gap-2">
      <input
        type="checkbox"
        class="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline-strong"
        :checked="modelValue.personalData"
        required
        @change="update('personalData', ($event.target as HTMLInputElement).checked)"
      >
      <span>
        Я соглашаюсь с
        <button type="button" class="text-link hover:underline" @click="openModal($event, 'pd')">
          условиями обработки персональных данных
        </button>
      </span>
    </label>

    <label class="flex items-start gap-2">
      <input
        type="checkbox"
        class="mt-0.5 h-4 w-4 shrink-0 rounded border-hairline-strong"
        :checked="modelValue.marketing"
        @change="update('marketing', ($event.target as HTMLInputElement).checked)"
      >
      <span>
        Я соглашаюсь получать рекламные сообщения на условиях
        <button type="button" class="text-link hover:underline" @click="openModal($event, 'marketing')">
          отдельного согласия
        </button>
      </span>
    </label>

    <UiModal v-model:open="pdModalOpen" title="Согласие на обработку персональных данных" size="lg">
      <div class="space-y-md text-body-sm text-charcoal">
        <div class="rounded-md bg-surface p-md text-caption">
          <p>Оператор: {{ operator?.operatorName ?? 'не указан' }}</p>
          <p>Техническая платформа: {{ operator?.platformName ?? 'quar.io' }}</p>
          <p v-if="operator?.pdEmail">Email для обращений по персональным данным: {{ operator.pdEmail }}</p>
          <p v-if="operator?.policyUrl">
            <a :href="operator.policyUrl" target="_blank" rel="noopener" class="text-link hover:underline">
              Политика обработки персональных данных
            </a>
          </p>
        </div>
        <p class="text-caption text-steel">Цель обработки: {{ purpose }}.</p>
        <pre class="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-md bg-surface p-md font-sans text-caption text-charcoal">{{ pdDoc?.content ?? 'Текст согласия пока не опубликован.' }}</pre>
      </div>
    </UiModal>

    <UiModal v-model:open="marketingModalOpen" title="Согласие на рекламные сообщения" size="lg">
      <pre class="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-md bg-surface p-md font-sans text-caption text-charcoal">{{ marketingDoc?.content ?? 'Текст согласия пока не опубликован.' }}</pre>
    </UiModal>
  </div>
</template>
