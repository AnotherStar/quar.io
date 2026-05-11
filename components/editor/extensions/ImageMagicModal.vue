<script setup lang="ts">
/**
 * Модалка ИИ-редактирования изображения. Сама модалка — UiModal; здесь только
 * содержимое: исходник слева, лента сгенерированных вариантов справа,
 * textarea с промптом и кнопка «Сгенерировать» в footer.
 */
const props = defineProps<{
  open: boolean
  sourceUrl: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  pick: [url: string]
}>()

const api = useApi()

interface Variant { url: string; prompt: string }

const prompt = ref('')
const variants = ref<Variant[]>([])
const isGenerating = ref(false)
const error = ref<string | null>(null)

// Сбрасываем состояние при каждом открытии модалки.
watch(
  () => props.open,
  (open) => {
    if (open) {
      prompt.value = ''
      variants.value = []
      error.value = null
      isGenerating.value = false
    }
  }
)

async function generate() {
  const cleanPrompt = prompt.value.trim()
  if (!cleanPrompt || isGenerating.value) return
  isGenerating.value = true
  error.value = null
  try {
    const { url } = await api<{ url: string }>('/api/ai/image-edit', {
      method: 'POST',
      body: { imageUrl: props.sourceUrl, prompt: cleanPrompt }
    })
    variants.value.unshift({ url, prompt: cleanPrompt })
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.message ?? 'Не удалось сгенерировать'
  } finally {
    isGenerating.value = false
  }
}

function pickVariant(v: Variant) {
  emit('pick', v.url)
  emit('update:open', false)
}

function close() {
  if (isGenerating.value) return
  emit('update:open', false)
}

function onPromptKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generate()
}
</script>

<template>
  <UiModal
    :open="open"
    size="lg"
    :close-on-backdrop="!isGenerating"
    :close-on-esc="!isGenerating"
    @update:open="(v) => emit('update:open', v)"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <Icon name="lucide:wand-2" class="h-5 w-5 text-navy opacity-50" />
        <h2 class="text-h4 text-navy">ИИ-редактирование изображения</h2>
      </div>
    </template>

    <div class="grid grid-cols-1 gap-md md:grid-cols-2">
      <!-- Исходное -->
      <div class="flex flex-col gap-2">
        <p class="text-caption-bold uppercase tracking-wide text-steel">Исходное</p>
        <div class="flex max-h-[400px] items-center justify-center overflow-hidden rounded-md bg-surface">
          <img :src="sourceUrl" alt="" class="max-h-full max-w-full rounded-md object-contain">
        </div>
      </div>

      <!-- Варианты -->
      <div class="flex flex-col gap-2">
        <p class="text-caption-bold uppercase tracking-wide text-steel">
          Варианты <span v-if="variants.length" class="text-stone">· {{ variants.length }}</span>
        </p>
        <div class="flex max-h-[400px] flex-col gap-sm overflow-y-auto rounded-md bg-surface p-sm">
          <div
            v-if="isGenerating"
            class="flex flex-col items-center justify-center gap-2 rounded-md bg-canvas p-lg text-center"
          >
            <Icon name="lucide:sparkles" class="h-5 w-5 animate-pulse text-primary" />
            <p class="text-body-sm text-steel">Генерирую…</p>
          </div>
          <p
            v-else-if="!variants.length"
            class="m-auto max-w-[240px] text-center text-body-sm text-steel"
          >
            Введите промпт ниже и нажмите «Сгенерировать», чтобы получить варианты.
          </p>
          <button
            v-for="(v, i) in variants"
            :key="i"
            type="button"
            class="group relative block overflow-hidden rounded-md bg-canvas transition-shadow hover:shadow-card"
            @click="pickVariant(v)"
          >
            <img :src="v.url" alt="" class="block w-full">
            <span class="block px-2 py-1 text-left text-caption text-steel">{{ v.prompt }}</span>
            <span class="pointer-events-none absolute inset-0 rounded-md ring-0 ring-primary/0 transition-all group-hover:ring-2 group-hover:ring-primary/60" />
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="space-y-2">
        <textarea
          v-model="prompt"
          rows="2"
          class="w-full resize-none rounded-lg border border-hairline bg-canvas px-md py-sm text-body-sm-md placeholder:text-stone outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          placeholder="Например: «удали фон», «добавь мягкий градиент», «сделай чёрно-белым»…"
          :disabled="isGenerating"
          @keydown="onPromptKey"
        />
        <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>
        <div class="flex items-center justify-between gap-md">
          <p class="text-caption text-steel">⌘ + Enter — отправить</p>
          <UiButton
            variant="primary"
            :loading="isGenerating"
            :disabled="!prompt.trim() || isGenerating"
            @click="generate"
          >
            <Icon name="lucide:sparkles" class="h-4 w-4" />
            Сгенерировать
          </UiButton>
        </div>
      </div>
    </template>
  </UiModal>
</template>
