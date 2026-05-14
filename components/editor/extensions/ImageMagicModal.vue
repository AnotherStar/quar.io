<script setup lang="ts">
/**
 * Модалка ИИ-редактирования изображения. После клика «Сгенерировать» джоб
 * уезжает в фон (~1 минута), модалка показывает подтверждение и закрывается.
 * Когда генерация заканчивается, глобальная модалка ImageEditJobResultModal
 * (mountится в dashboard-layout) показывает «было → стало».
 */
const props = defineProps<{
  open: boolean
  sourceUrl: string
  instructionId?: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const api = useApi()
const editJobs = useImageEditJobs()
const { track } = useTrackGoal()

const prompt = ref('')
const isSubmitting = ref(false)
const submitted = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.open,
  (open) => {
    if (open) {
      prompt.value = ''
      submitted.value = false
      error.value = null
      isSubmitting.value = false
    }
  }
)

async function generate() {
  const cleanPrompt = prompt.value.trim()
  if (!cleanPrompt || isSubmitting.value) return
  isSubmitting.value = true
  error.value = null
  try {
    const { jobId } = await api<{ jobId: string; status: string }>('/api/ai/image-edit', {
      method: 'POST',
      body: {
        imageUrl: props.sourceUrl,
        prompt: cleanPrompt,
        instructionId: props.instructionId ?? undefined
      }
    })
    editJobs.registerOptimistic({
      id: jobId,
      status: 'PENDING',
      sourceUrl: props.sourceUrl,
      prompt: cleanPrompt,
      resultUrl: null,
      errorMessage: null,
      instructionId: props.instructionId ?? null,
      createdAt: new Date().toISOString(),
      completedAt: null
    })
    submitted.value = true
    track('editor_ai_used', { source: 'image_magic' })
    // Авто-закрытие, чтобы юзер действительно вернулся к работе. Достаточно
    // ~2.5 сек, чтобы текст-подтверждение успели прочитать.
    setTimeout(() => emit('update:open', false), 2500)
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.message ?? 'Не удалось запустить генерацию'
  } finally {
    isSubmitting.value = false
  }
}

function close() {
  if (isSubmitting.value) return
  emit('update:open', false)
}

function onPromptKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate()
}
</script>

<template>
  <UiModal
    :open="open"
    size="md"
    :close-on-backdrop="!isSubmitting"
    :close-on-esc="!isSubmitting"
    @update:open="(v) => emit('update:open', v)"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <Icon name="lucide:wand-2" class="h-5 w-5 text-navy opacity-50" />
        <h2 class="text-h4 text-navy">ИИ-редактирование изображения</h2>
      </div>
    </template>

    <div v-if="submitted" class="flex flex-col items-center gap-md py-lg text-center">
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Icon name="lucide:sparkles" class="h-6 w-6 text-primary" />
      </div>
      <div class="space-y-2">
        <p class="text-h4 text-navy">Запустили генерацию</p>
        <p class="max-w-[420px] text-body-sm text-steel">
          Генерация занимает около минуты. Можно продолжать работу в редакторе — как
          будет готово, мы покажем результат и предложим заменить картинку.
        </p>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 gap-md md:grid-cols-2">
      <!-- Исходное -->
      <div class="flex flex-col gap-2">
        <p class="text-caption-bold uppercase tracking-wide text-steel">Исходное</p>
        <div class="flex max-h-[320px] items-center justify-center overflow-hidden rounded-md bg-surface">
          <img :src="sourceUrl" alt="" class="max-h-full max-w-full rounded-md object-contain">
        </div>
      </div>

      <!-- Пояснение, как работает асинхронная генерация -->
      <div class="flex flex-col gap-sm">
        <p class="text-caption-bold uppercase tracking-wide text-steel">Что произойдёт</p>
        <ul class="space-y-2 rounded-md bg-surface p-md text-body-sm text-charcoal">
          <li class="flex items-start gap-2">
            <Icon name="lucide:clock-3" class="mt-0.5 h-4 w-4 shrink-0 text-steel" />
            <span>Генерация занимает <b>около минуты</b>.</span>
          </li>
          <li class="flex items-start gap-2">
            <Icon name="lucide:edit-3" class="mt-0.5 h-4 w-4 shrink-0 text-steel" />
            <span>Пока ждёте — можно продолжать работу в редакторе.</span>
          </li>
          <li class="flex items-start gap-2">
            <Icon name="lucide:bell-ring" class="mt-0.5 h-4 w-4 shrink-0 text-steel" />
            <span>Когда будет готово — покажем «было → стало» и спросим, заменить ли картинку.</span>
          </li>
        </ul>
      </div>
    </div>

    <template #footer>
      <div v-if="!submitted" class="space-y-2">
        <textarea
          v-model="prompt"
          rows="2"
          class="w-full resize-none rounded-lg border border-hairline bg-canvas px-md py-sm text-body-sm-md placeholder:text-stone outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          placeholder="Например: «удали фон», «добавь мягкий градиент», «сделай чёрно-белым»…"
          :disabled="isSubmitting"
          @keydown="onPromptKey"
        />
        <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>
        <div class="flex items-center justify-between gap-md">
          <p class="text-caption text-steel">⌘ + Enter — отправить</p>
          <UiButton
            variant="primary"
            :loading="isSubmitting"
            :disabled="!prompt.trim() || isSubmitting"
            @click="generate"
          >
            <Icon name="lucide:sparkles" class="h-4 w-4" />
            Сгенерировать
          </UiButton>
        </div>
      </div>
      <div v-else class="flex justify-end">
        <UiButton variant="secondary" @click="close">Понятно</UiButton>
      </div>
    </template>
  </UiModal>
</template>
