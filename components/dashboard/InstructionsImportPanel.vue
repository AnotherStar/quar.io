<script setup lang="ts">
// Панель массового импорта инструкций. Раньше была отдельной страницей; теперь
// рендерится как вкладка внутри pages/dashboard/instructions/index.vue.
// Источник истины — useInstructionImportJobs(): он же поллит статусы и
// показывает тосты при завершении джобов. Здесь — только таблица задач и
// логика аплоада. Аплоад файлов идёт параллельно (браузер сам ограничивает
// число одновременных соединений); сервер берёт по три на обработку.
//
// Кнопка «Импортировать файлы» живёт в шапке родительской страницы — мы
// экспонируем openFilePicker() через defineExpose, чтобы родитель смог её
// дёрнуть из header-actions.
import type { ImportJob } from '~~/composables/useInstructionImportJobs'

const api = useApi()
const toast = useToast()
const importJobs = useInstructionImportJobs()

const fileInputEl = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

function openFilePicker() {
  fileInputEl.value?.click()
}

const ACCEPTED = '.pdf,application/pdf,image/*'
const MAX_BYTES = 25 * 1024 * 1024

async function uploadOne(file: File): Promise<void> {
  if (file.size > MAX_BYTES) {
    toast.error(`«${file.name}» больше 25 МБ — пропущен`)
    return
  }
  const form = new FormData()
  form.append('file', file, file.name)
  try {
    const res = await api<{ duplicate: boolean; job: ImportJob }>(
      '/api/instructions/import/upload',
      { method: 'POST', body: form }
    )
    if (res.duplicate) {
      const linked = res.job.instruction
      toast.warning(`«${file.name}» уже импортирован`, {
        action: linked
          ? { label: 'Открыть', to: `/dashboard/instructions/${linked.id}/edit` }
          : undefined
      })
      return
    }
    importJobs.registerOptimistic(res.job)
  } catch (e: any) {
    const msg = e?.data?.statusMessage || e?.statusMessage || 'Не удалось загрузить файл'
    toast.error(`«${file.name}»: ${msg}`)
  }
}

async function handleFilesPicked(ev: Event) {
  const input = ev.target as HTMLInputElement
  const list = input.files
  if (!list || !list.length) return
  const files = Array.from(list)
  input.value = ''
  uploading.value = true
  try {
    await Promise.all(files.map(uploadOne))
  } finally {
    uploading.value = false
  }
}

const jobs = importJobs.jobs

const STAGE_LABELS: Record<string, string> = {
  starting: 'Готовим к обработке',
  downloading: 'Читаем файл',
  'extracting-images': 'Извлекаем изображения',
  'uploading-images': 'Сохраняем изображения',
  generating: 'Генерируем инструкцию',
  saving: 'Сохраняем результат',
  done: 'Готово'
}

function statusLabel(job: ImportJob): string {
  switch (job.status) {
    case 'QUEUED':
      return 'В очереди'
    case 'PAUSED':
      return 'На паузе'
    case 'PROCESSING':
      return job.stage ? STAGE_LABELS[job.stage] ?? 'Обрабатываем' : 'Обрабатываем'
    case 'SUCCEEDED':
      return 'Готово'
    case 'FAILED':
      return 'Ошибка'
  }
}

type BadgeVariant = 'tag-blue' | 'tag-orange' | 'tag-green' | 'tag-gray'

function statusVariant(job: ImportJob): BadgeVariant {
  switch (job.status) {
    case 'SUCCEEDED':
      return 'tag-green'
    case 'FAILED':
      return 'tag-orange'
    case 'PROCESSING':
      return 'tag-blue'
    case 'PAUSED':
      return 'tag-gray'
    case 'QUEUED':
    default:
      return 'tag-gray'
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(0)} КБ`
  return `${(kb / 1024).toFixed(1)} МБ`
}

const busyId = ref<string | null>(null)

async function callAction(id: string, action: 'pause' | 'resume' | 'retry') {
  busyId.value = id
  try {
    await api(`/api/instructions/import/jobs/${id}/${action}`, { method: 'POST' })
    await importJobs.refresh()
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || 'Не удалось выполнить действие')
  } finally {
    busyId.value = null
  }
}

defineExpose({ openFilePicker, uploading })
</script>

<template>
  <div>
    <p class="text-body-sm text-steel">
      Загрузите PDF или изображения существующих инструкций — мы распознаем содержимое,
      соберём текст и иллюстрации в готовую инструкцию и сохраним её как черновик.
      Поддерживаются файлы до 25 МБ, обработка идёт по три файла параллельно.
    </p>

    <input
      ref="fileInputEl"
      type="file"
      :accept="ACCEPTED"
      multiple
      class="hidden"
      @change="handleFilesPicked"
    >

    <div class="mt-lg">
      <UiTable v-if="jobs.length">
        <thead>
          <tr>
            <th class="text-left">Файл</th>
            <th class="text-left">Статус</th>
            <th class="text-left">Инструкция</th>
            <th class="w-32 text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="job in jobs" :key="job.id">
            <td class="align-top">
              <p class="text-body-sm-md text-ink">{{ job.fileName }}</p>
              <p class="text-caption text-steel">
                {{ formatSize(job.fileSize) }} ·
                {{ job.fileMimeType === 'application/pdf' ? 'PDF' : 'Изображение' }}
              </p>
            </td>
            <td class="align-top">
              <UiBadge :variant="statusVariant(job)">{{ statusLabel(job) }}</UiBadge>
              <div
                v-if="job.status === 'PROCESSING' && job.progressPercent !== null"
                class="mt-1 h-1 w-32 overflow-hidden rounded-full bg-hairline"
              >
                <div
                  class="h-full bg-primary transition-[width] duration-300 ease-out"
                  :style="{ width: `${Math.min(100, Math.max(0, job.progressPercent))}%` }"
                />
              </div>
              <p
                v-if="job.status === 'FAILED' && job.errorMessage"
                class="mt-1 text-caption text-error"
                :title="job.errorMessage"
              >
                {{ job.errorMessage }}
              </p>
            </td>
            <td class="align-top">
              <NuxtLink
                v-if="job.instruction"
                :to="`/dashboard/instructions/${job.instruction.id}/edit`"
                class="text-body-sm text-primary hover:underline"
              >
                {{ job.instruction.title }}
              </NuxtLink>
              <span v-else class="text-body-sm text-steel">—</span>
            </td>
            <td class="align-top text-right">
              <div class="inline-flex items-center gap-1">
                <button
                  v-if="job.status === 'QUEUED'"
                  type="button"
                  class="ui-row-btn"
                  :disabled="busyId === job.id"
                  title="Поставить на паузу"
                  @click="callAction(job.id, 'pause')"
                >
                  <Icon name="lucide:pause" class="h-4 w-4" />
                </button>
                <button
                  v-if="job.status === 'PAUSED'"
                  type="button"
                  class="ui-row-btn"
                  :disabled="busyId === job.id"
                  title="Продолжить"
                  @click="callAction(job.id, 'resume')"
                >
                  <Icon name="lucide:play" class="h-4 w-4" />
                </button>
                <button
                  v-if="job.status === 'FAILED'"
                  type="button"
                  class="ui-row-btn"
                  :disabled="busyId === job.id"
                  title="Повторить"
                  @click="callAction(job.id, 'retry')"
                >
                  <Icon name="lucide:rotate-cw" class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </UiTable>
      <div v-else class="rounded-lg border border-dashed border-hairline bg-surface px-lg py-2xl text-center">
        <Icon name="lucide:upload-cloud" class="mx-auto h-8 w-8 text-steel" />
        <p class="mt-sm text-body-md text-ink">Здесь будут импортируемые файлы</p>
        <p class="mt-1 text-body-sm text-steel">
          Нажмите «Импортировать файлы» и выберите один или несколько PDF/изображений.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-row-btn {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--color-steel);
  background: transparent;
  border: 0;
  cursor: pointer;
}
.ui-row-btn:hover:not(:disabled) {
  background: var(--color-surface);
  color: var(--color-ink);
}
.ui-row-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
