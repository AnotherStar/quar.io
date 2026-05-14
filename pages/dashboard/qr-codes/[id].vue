<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

import type { QrPrintRunEntry } from '~~/shared/schemas/qrCode'

interface QrInstructionRef {
  id: string
  slug: string
  title: string
  status: string
  productBarcode: string | null
}
interface QrCodeRow {
  id: string
  shortId: string
  instructionId: string | null
  instruction: QrInstructionRef | null
  printRuns: QrPrintRunEntry[]
  firstPrintedAt: string | null
  lastPrintedAt: string | null
  boundAt: string | null
  createdAt: string
  updatedAt: string
  notes: string | null
}

const route = useRoute()
const router = useRouter()
const api = useApi()
const id = computed(() => route.params.id as string)

const { data, refresh, pending } = await useAsyncData(
  () => `qr-${id.value}`,
  () => api<{ code: QrCodeRow }>(`/api/qr-codes/${id.value}`),
  { watch: [id] }
)

const code = computed(() => data.value?.code)
const notes = ref('')
const saving = ref(false)
const saveError = ref<string | null>(null)

watch(code, (c) => { notes.value = c?.notes ?? '' }, { immediate: true })

const search = ref('')
const debouncedSearch = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(search, (v) => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => { debouncedSearch.value = v }, 250)
})

const showRebind = ref(false)
const searchResults = ref<{ instructions: QrInstructionRef[] }>({ instructions: [] })
const searchPending = ref(false)

watch([showRebind, debouncedSearch], async ([open]) => {
  if (!open) return
  searchPending.value = true
  try {
    searchResults.value = await api<{ instructions: QrInstructionRef[] }>(
      `/api/instructions/search?q=${encodeURIComponent(debouncedSearch.value)}&take=50`
    )
  } finally {
    searchPending.value = false
  }
})

const shortUrl = computed(() => {
  if (!code.value) return ''
  const appUrl = useRuntimeConfig().public.appUrl.replace(/\/$/, '')
  return `${appUrl}/s/${code.value.shortId}`
})

const qrSvg = ref<string | null>(null)
watch(shortUrl, async (url) => {
  if (!url || !import.meta.client) return
  const QRCode = await import('qrcode')
  qrSvg.value = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0a0a0a', light: '#ffffff' }
  })
}, { immediate: true })

function downloadSvg() {
  if (!qrSvg.value || !code.value) return
  const blob = new Blob([qrSvg.value], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `qr-${code.value.shortId}.svg`
  a.click()
  URL.revokeObjectURL(url)
}

async function saveNotes() {
  if (!code.value) return
  saving.value = true
  saveError.value = null
  try {
    await api(`/api/qr-codes/${code.value.id}`, {
      method: 'PATCH',
      body: { notes: notes.value.trim() || null }
    })
    await refresh()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage ?? 'Не удалось сохранить заметку'
  } finally {
    saving.value = false
  }
}

async function unbind() {
  if (!code.value) return
  if (!confirm('Отвязать QR от инструкции? Сам стикер останется, его можно будет переклеить.')) return
  saving.value = true
  saveError.value = null
  try {
    await api(`/api/qr-codes/${code.value.id}`, {
      method: 'PATCH',
      body: { instructionId: null }
    })
    await refresh()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage ?? 'Не удалось отвязать QR'
  } finally {
    saving.value = false
  }
}

async function rebind(instructionId: string) {
  if (!code.value) return
  saving.value = true
  saveError.value = null
  try {
    await api(`/api/qr-codes/${code.value.id}`, {
      method: 'PATCH',
      body: { instructionId }
    })
    showRebind.value = false
    await refresh()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage ?? 'Не удалось привязать к инструкции'
  } finally {
    saving.value = false
  }
}

function copy(text: string) {
  if (import.meta.client) navigator.clipboard?.writeText(text)
}
</script>

<template>
  <div v-if="pending" class="py-section text-body text-steel">Загружаю QR-код…</div>

  <div v-else-if="code" class="space-y-xl">
    <div class="flex flex-col gap-sm">
      <button class="self-start text-body-sm text-link hover:underline" @click="router.back()">
        ← Назад к списку
      </button>
      <div class="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
        <div>
          <h1 class="text-h2 text-ink">QR /s/{{ code.shortId }}</h1>
          <p class="mt-1 text-body text-steel">
            Создан {{ new Date(code.createdAt).toLocaleDateString() }} · Обновлён {{ new Date(code.updatedAt).toLocaleDateString() }}
          </p>
        </div>
        <div class="flex items-center gap-sm">
          <UiBadge :variant="code.instruction ? 'tag-green' : 'tag-orange'">
            {{ code.instruction ? 'Привязан' : 'Свободен' }}
          </UiBadge>
          <UiBadge v-if="code.firstPrintedAt" variant="tag-blue">Напечатан</UiBadge>
        </div>
      </div>
    </div>

    <UiAlert v-if="saveError" kind="error">{{ saveError }}</UiAlert>

    <UiCard>
      <h2 class="text-h4 text-ink">QR-код</h2>
      <p class="mt-1 text-body-sm text-steel">
        Этот QR ведёт на ссылку ниже. Скачайте SVG для печати — он масштабируется без потери качества.
      </p>
      <div class="mt-md grid gap-md md:grid-cols-[200px_1fr] md:items-center">
        <div class="grid h-[200px] w-[200px] place-items-center rounded-md border border-hairline bg-canvas p-sm">
          <div v-if="qrSvg" class="qr-svg-host h-full w-full" v-html="qrSvg" />
          <span v-else class="text-caption text-steel">Генерирую…</span>
        </div>
        <div class="space-y-sm">
          <code class="block break-all rounded-md bg-surface px-md py-sm text-body-sm">{{ shortUrl }}</code>
          <div class="flex flex-wrap gap-sm">
            <UiButton variant="secondary" size="sm" @click="copy(shortUrl)">
              <Icon name="lucide:copy" class="h-4 w-4" /> Скопировать ссылку
            </UiButton>
            <UiButton variant="secondary" size="sm" :disabled="!qrSvg" @click="downloadSvg">
              <Icon name="lucide:download" class="h-4 w-4" /> Скачать SVG
            </UiButton>
          </div>
        </div>
      </div>
    </UiCard>

    <UiCard>
      <div class="flex items-start justify-between gap-md">
        <div>
          <h2 class="text-h4 text-ink">Привязка к инструкции</h2>
          <p v-if="code.instruction" class="mt-1 text-body text-steel">
            <NuxtLink :to="`/dashboard/instructions/${code.instruction.id}/edit`" class="text-link hover:underline">
              {{ code.instruction.title }}
            </NuxtLink>
            <span class="block text-caption text-steel">
              ШК {{ code.instruction.productBarcode || '—' }} · {{ code.instruction.status }}
            </span>
          </p>
          <p v-else class="mt-1 text-body text-steel">QR ещё не связан с инструкцией.</p>
        </div>
        <div class="flex flex-col gap-sm">
          <UiButton v-if="code.instruction" variant="secondary" size="sm" :loading="saving" @click="unbind">
            <Icon name="lucide:unlink" class="h-4 w-4" /> Отвязать
          </UiButton>
          <UiButton size="sm" @click="showRebind = true">
            <Icon name="lucide:link" class="h-4 w-4" />
            {{ code.instruction ? 'Перепривязать' : 'Привязать вручную' }}
          </UiButton>
        </div>
      </div>
    </UiCard>

    <UiCard>
      <h2 class="text-h4 text-ink">История печати</h2>
      <div v-if="code.printRuns.length" class="mt-md space-y-sm">
        <div
          v-for="run in [...code.printRuns].reverse()"
          :key="run.batchId + run.printedAt"
          class="flex items-center justify-between rounded-md border border-hairline px-md py-sm"
        >
          <div>
            <p class="text-body-md text-ink">{{ run.designLabel }}</p>
            <p class="text-caption text-steel">{{ new Date(run.printedAt).toLocaleString() }}</p>
          </div>
          <UiBadge variant="tag-blue">Партия {{ run.batchId.slice(0, 8) }}</UiBadge>
        </div>
      </div>
      <p v-else class="mt-md text-body text-steel">QR ещё не печатали.</p>
    </UiCard>

    <UiCard>
      <h2 class="text-h4 text-ink">Заметка</h2>
      <p class="mt-1 text-body-sm text-steel">Видна только команде. Например, в какой коробке стикер.</p>
      <textarea
        v-model="notes"
        rows="3"
        class="mt-md w-full rounded-md border border-hairline-strong bg-canvas px-md py-sm text-body outline-none focus:border-primary focus:border-2"
        placeholder="Свободный текст…"
      />
      <div class="mt-sm flex justify-end">
        <UiButton size="sm" :loading="saving" @click="saveNotes">Сохранить</UiButton>
      </div>
    </UiCard>

    <UiModal v-model:open="showRebind" title="Выбрать инструкцию" size="lg">
      <div class="space-y-md">
        <UiInput v-model="search" placeholder="Поиск по названию или slug…" autocomplete="off" />
        <p v-if="searchPending" class="text-body-sm text-steel">Ищу…</p>
        <div v-else-if="searchResults?.instructions.length" class="max-h-[400px] overflow-y-auto">
          <button
            v-for="instr in searchResults.instructions"
            :key="instr.id"
            class="flex w-full flex-col items-start gap-1 border-b border-hairline px-md py-sm text-left hover:bg-surface"
            @click="rebind(instr.id)"
          >
            <span class="text-body-md text-ink">{{ instr.title }}</span>
            <span class="text-caption text-steel">{{ instr.slug }} · {{ instr.status }}{{ instr.productBarcode ? ` · ШК ${instr.productBarcode}` : '' }}</span>
          </button>
        </div>
        <p v-else class="text-body-sm text-steel">Ничего не найдено.</p>
      </div>
    </UiModal>
  </div>
</template>

<style scoped>
.qr-svg-host :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
