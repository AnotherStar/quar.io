<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    busy?: boolean
  }>(),
  { busy: false }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: { files: File[]; prompt: string }]
}>()

const MAX_FILE_MB = 25
const MAX_TOTAL_MB = 60
const MAX_FILES = 10
const ACCEPT = 'application/pdf,image/*'

const files = ref<File[]>([])
const prompt = ref('')
const dragOver = ref(false)
const error = ref<string | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

// Cache object URLs per File so we don't recreate them on every render
// (and so we can revoke them when the file is removed or the modal closes).
const previewUrls = new Map<File, string>()

function previewFor(file: File): string | null {
  if (!file.type.startsWith('image/')) return null
  let url = previewUrls.get(file)
  if (!url) {
    url = URL.createObjectURL(file)
    previewUrls.set(file, url)
  }
  return url
}

function revokePreview(file: File) {
  const url = previewUrls.get(file)
  if (url) {
    URL.revokeObjectURL(url)
    previewUrls.delete(file)
  }
}

function revokeAllPreviews() {
  for (const url of previewUrls.values()) URL.revokeObjectURL(url)
  previewUrls.clear()
}

onBeforeUnmount(revokeAllPreviews)

const totalMb = computed(() =>
  files.value.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)
)

const canSubmit = computed(
  () => (files.value.length > 0 || prompt.value.trim().length > 0) && !props.busy
)

function reset() {
  files.value = []
  prompt.value = ''
  error.value = null
  dragOver.value = false
  revokeAllPreviews()
}

watch(
  () => props.open,
  (open) => { if (open) reset() }
)

function isAcceptable(file: File) {
  return file.type === 'application/pdf'
    || file.type.startsWith('image/')
    || file.name.toLowerCase().endsWith('.pdf')
}

function addFiles(incoming: FileList | File[]) {
  error.value = null
  const arr = Array.from(incoming)
  const accepted: File[] = []
  for (const f of arr) {
    if (!isAcceptable(f)) {
      error.value = `Файл ${f.name} не поддерживается. Загрузите PDF или изображение.`
      continue
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      error.value = `Файл ${f.name} больше ${MAX_FILE_MB} МБ`
      continue
    }
    // De-dupe by name + size
    if (files.value.some((existing) => existing.name === f.name && existing.size === f.size)) continue
    accepted.push(f)
  }
  const next = [...files.value, ...accepted]
  if (next.length > MAX_FILES) {
    error.value = `Можно загрузить не больше ${MAX_FILES} файлов за раз`
    files.value = next.slice(0, MAX_FILES)
    return
  }
  const totalBytes = next.reduce((sum, f) => sum + f.size, 0)
  if (totalBytes > MAX_TOTAL_MB * 1024 * 1024) {
    error.value = `Суммарный размер не должен превышать ${MAX_TOTAL_MB} МБ`
    return
  }
  files.value = next
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.length) addFiles(input.files)
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  if (!e.dataTransfer?.files?.length) return
  addFiles(e.dataTransfer.files)
}

function removeFile(idx: number) {
  const target = files.value[idx]
  if (target) revokePreview(target)
  files.value = files.value.filter((_, i) => i !== idx)
  error.value = null
}

function fileIcon(file: File) {
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) return 'lucide:file-text'
  return 'lucide:image'
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

function close() {
  if (props.busy) return
  emit('update:open', false)
}

function submit() {
  if (!canSubmit.value) return
  emit('submit', { files: [...files.value], prompt: prompt.value.trim() })
}
</script>

<template>
  <UiModal
    :open="open"
    title="Сгенерировать инструкцию"
    size="lg"
    :close-on-backdrop="!busy"
    :close-on-esc="!busy"
    @update:open="(v) => emit('update:open', v)"
  >
    <div class="flex flex-col gap-md">
      <p class="text-body-sm text-steel">
        Загрузите один или несколько PDF и&nbsp;фотографий и/или опишите задачу. ИИ
        прочитает файлы и&nbsp;учтёт подсказку. Можно прислать только подсказку без файлов&nbsp;—
        тогда инструкция будет создана по&nbsp;описанию.
      </p>

      <!-- Drop zone -->
      <label
        :class="[
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-md py-lg text-center transition-colors',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-hairline bg-surface hover:border-primary/60 hover:bg-primary/5',
          busy && 'pointer-events-none opacity-60'
        ]"
        @dragover.prevent="dragOver = true"
        @dragenter.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <Icon name="lucide:upload-cloud" class="h-7 w-7 text-primary" />
        <div class="text-body-sm-md text-ink">
          Перетащите файлы сюда или <span class="text-primary underline">выберите</span>
        </div>
        <div class="text-caption text-steel">
          PDF и изображения · до {{ MAX_FILE_MB }} МБ на файл · максимум {{ MAX_FILES }} файлов
        </div>
        <input
          ref="inputRef"
          type="file"
          :accept="ACCEPT"
          multiple
          class="hidden"
          :disabled="busy"
          @change="onPick"
        >
      </label>

      <!-- File list -->
      <ul v-if="files.length" class="flex flex-col gap-2">
        <li
          v-for="(f, idx) in files"
          :key="`${f.name}-${f.size}-${idx}`"
          class="flex items-center gap-3 rounded-lg border border-hairline bg-surface px-3 py-2"
        >
          <div
            class="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border border-hairline bg-canvas"
          >
            <img
              v-if="previewFor(f)"
              :src="previewFor(f) || ''"
              :alt="f.name"
              class="h-full w-full object-cover"
              loading="lazy"
            >
            <Icon v-else :name="fileIcon(f)" class="h-5 w-5 text-steel" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-body-sm-md text-ink">{{ f.name }}</div>
            <div class="text-caption text-steel">{{ formatSize(f.size) }}</div>
          </div>
          <button
            type="button"
            class="grid h-7 w-7 shrink-0 place-items-center rounded-md text-steel transition-colors hover:bg-hairline hover:text-ink"
            aria-label="Удалить файл"
            :disabled="busy"
            @click="removeFile(idx)"
          >
            <Icon name="lucide:x" class="h-4 w-4" />
          </button>
        </li>
      </ul>

      <!-- Prompt -->
      <div>
        <label class="mb-1 block text-caption-bold uppercase tracking-wide text-steel">
          Подсказка ИИ (опционально)
        </label>
        <textarea
          v-model="prompt"
          rows="4"
          placeholder="Например: ориентируйся на пункт «Гарантия», добавь раздел «Уход за изделием», пиши на «вы»."
          class="w-full resize-y rounded-lg border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink placeholder:text-hairline-strong focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
          :disabled="busy"
        />
      </div>

      <p v-if="error" class="text-body-sm text-error">{{ error }}</p>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-md">
        <span v-if="files.length" class="text-caption text-steel">
          {{ files.length }} {{ files.length === 1 ? 'файл' : files.length < 5 ? 'файла' : 'файлов' }}
          · {{ totalMb.toFixed(1) }} МБ
        </span>
        <span v-else class="text-caption text-steel">Файлы не выбраны</span>
        <div class="flex items-center gap-2">
          <UiButton variant="secondary" :disabled="busy" @click="close">
            Отмена
          </UiButton>
          <UiButton variant="primary" :disabled="!canSubmit" :loading="busy" @click="submit">
            <Icon name="lucide:sparkles" class="h-4 w-4" />
            Сгенерировать
          </UiButton>
        </div>
      </div>
    </template>
  </UiModal>
</template>
