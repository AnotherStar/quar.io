<script setup lang="ts">
/**
 * Глобальная «было → стало» модалка для асинхронных AI image-edit джобов.
 * Монтируется в dashboard-layout, читает состояние из useImageEditJobs и
 * показывает первый непросмотренный завершённый джоб. По кнопке «Заменить»
 * композабл сам решает — апдейтить ли узел через window-событие или увести
 * пользователя в редактор соответствующей инструкции.
 */
const editJobs = useImageEditJobs()
const route = useRoute()

const isReplacing = ref(false)
const job = editJobs.currentResult

// Модалку не показываем на публичных страницах — она нужна только в дашборде.
// Если /dashboard layout уже отфильтровал маршрут, эта проверка не сработает,
// но оставлена как страховка против будущего переезда модалки в другой layout.
const enabled = computed(() => route.path.startsWith('/dashboard'))
const open = computed(() => Boolean(enabled.value && job.value))

const isSuccess = computed(() => job.value?.status === 'SUCCEEDED' && Boolean(job.value.resultUrl))

async function keepOld() {
  if (!job.value) return
  await editJobs.acknowledge(job.value.id)
}

async function replace() {
  if (!job.value || isReplacing.value) return
  isReplacing.value = true
  try {
    await editJobs.requestApply(job.value)
  } finally {
    isReplacing.value = false
  }
}

async function dismissError() {
  if (!job.value) return
  await editJobs.acknowledge(job.value.id)
}
</script>

<template>
  <UiModal
    :open="open"
    size="lg"
    :close-on-backdrop="false"
    :close-on-esc="false"
    @update:open="(v) => { if (!v && job) keepOld() }"
  >
    <template #header>
      <div v-if="job" class="flex items-center gap-3">
        <Icon
          :name="isSuccess ? 'lucide:sparkles' : 'lucide:alert-triangle'"
          class="h-5 w-5"
          :class="isSuccess ? 'text-primary' : 'text-error'"
        />
        <h2 class="text-h4 text-navy">
          {{ isSuccess ? 'Готов вариант изображения' : 'Не удалось сгенерировать' }}
        </h2>
      </div>
    </template>

    <div v-if="job && isSuccess" class="space-y-md">
      <p class="text-body-sm text-steel">
        Промпт: <span class="text-charcoal">«{{ job.prompt }}»</span>
      </p>
      <div class="grid grid-cols-1 gap-md md:grid-cols-2">
        <div class="flex flex-col gap-2">
          <p class="text-caption-bold uppercase tracking-wide text-steel">Было</p>
          <div class="flex max-h-[360px] items-center justify-center overflow-hidden rounded-md bg-surface">
            <img :src="job.sourceUrl" alt="" class="max-h-[360px] max-w-full rounded-md object-contain">
          </div>
        </div>
        <div class="flex flex-col gap-2">
          <p class="text-caption-bold uppercase tracking-wide text-steel">Стало</p>
          <div class="flex max-h-[360px] items-center justify-center overflow-hidden rounded-md bg-surface ring-2 ring-primary/30">
            <img :src="job.resultUrl!" alt="" class="max-h-[360px] max-w-full rounded-md object-contain">
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="job" class="space-y-md">
      <p class="text-body-sm text-steel">
        Промпт: <span class="text-charcoal">«{{ job.prompt }}»</span>
      </p>
      <UiAlert kind="error">
        {{ job.errorMessage || 'Что-то пошло не так. Попробуйте ещё раз чуть позже.' }}
      </UiAlert>
      <div class="flex flex-col gap-2">
        <p class="text-caption-bold uppercase tracking-wide text-steel">Исходное изображение</p>
        <div class="flex max-h-[280px] items-center justify-center overflow-hidden rounded-md bg-surface">
          <img :src="job.sourceUrl" alt="" class="max-h-[280px] max-w-full rounded-md object-contain">
        </div>
      </div>
    </div>

    <template #footer>
      <div v-if="job && isSuccess" class="flex flex-col-reverse items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end">
        <UiButton variant="secondary" :disabled="isReplacing" @click="keepOld">
          Оставить старое
        </UiButton>
        <UiButton variant="primary" :loading="isReplacing" @click="replace">
          <Icon name="lucide:check" class="h-4 w-4" />
          Заменить на новое
        </UiButton>
      </div>
      <div v-else-if="job" class="flex justify-end">
        <UiButton variant="primary" @click="dismissError">Понятно</UiButton>
      </div>
    </template>
  </UiModal>
</template>
