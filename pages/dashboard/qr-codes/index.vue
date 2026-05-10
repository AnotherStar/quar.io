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
  notes: string | null
}

interface QrStats {
  total: number
  bound: number
  unbound: number
  printed: number
  unprinted: number
}

const api = useApi()
const { currentTenant } = useAuthState()

type StatusFilter = 'all' | 'bound' | 'unbound' | 'printed' | 'unprinted'
const status = ref<StatusFilter>('all')
const search = ref('')
const debouncedSearch = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(search, (v) => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => { debouncedSearch.value = v }, 250)
})

const countToCreate = ref(100)
const sizeMm = ref(40)
const designLabel = ref('')
const creating = ref(false)
const printing = ref(false)
const createError = ref<string | null>(null)
const printError = ref<string | null>(null)

const selected = ref<Set<string>>(new Set())

const qrKey = computed(() => `qr-codes-list-${currentTenant.value?.id ?? 'none'}-${status.value}-${debouncedSearch.value}`)
const { data, refresh, pending } = await useAsyncData(
  qrKey,
  () => api<{ stats: QrStats; total: number; codes: QrCodeRow[] }>(
    `/api/qr-codes?status=${status.value}&take=300&q=${encodeURIComponent(debouncedSearch.value)}`
  ),
  {
    default: () => ({ stats: { total: 0, bound: 0, unbound: 0, printed: 0, unprinted: 0 }, total: 0, codes: [] }),
    watch: [() => currentTenant.value?.id, status, debouncedSearch]
  }
)

const stats = computed(() => data.value?.stats ?? { total: 0, bound: 0, unbound: 0, printed: 0, unprinted: 0 })
const codes = computed(() => data.value?.codes ?? [])
const totalShown = computed(() => data.value?.total ?? 0)

const allSelected = computed(() => codes.value.length > 0 && codes.value.every((c) => selected.value.has(c.id)))
const someSelected = computed(() => codes.value.some((c) => selected.value.has(c.id)) && !allSelected.value)

function toggleAll() {
  if (allSelected.value) {
    selected.value = new Set()
  } else {
    selected.value = new Set(codes.value.map((c) => c.id))
  }
}
function toggleOne(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

async function createBatch() {
  creating.value = true
  createError.value = null
  try {
    await api('/api/qr-codes', { method: 'POST', body: { count: Number(countToCreate.value) } })
    await refresh()
  } catch (e: any) {
    createError.value = e?.data?.statusMessage ?? 'Не удалось создать QR-коды'
  } finally {
    creating.value = false
  }
}

async function printSelected() {
  if (printing.value || !selected.value.size) return
  if (!designLabel.value.trim()) {
    printError.value = 'Укажите название дизайна, чтобы отметить тираж'
    return
  }
  printing.value = true
  printError.value = null
  try {
    // 1. Mark as printed
    await api('/api/qr-codes/print-run', {
      method: 'POST',
      body: { ids: [...selected.value], designLabel: designLabel.value.trim() }
    })
    // 2. Trigger PDF download
    const params = new URLSearchParams({
      sizeMm: String(sizeMm.value),
      ids: [...selected.value].join(',')
    })
    if (import.meta.client) window.location.href = `/api/qr-codes/export?${params.toString()}`
    selected.value = new Set()
    await refresh()
  } catch (e: any) {
    printError.value = e?.data?.statusMessage ?? 'Не удалось напечатать пачку'
  } finally {
    printing.value = false
  }
}

function shortUrl(code: QrCodeRow) {
  const appUrl = useRuntimeConfig().public.appUrl.replace(/\/$/, '')
  return `${appUrl}/code/${code.shortId}`
}

function fmtDate(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString() : '—'
}

function lastDesign(code: QrCodeRow) {
  const runs = code.printRuns ?? []
  return runs.length ? runs[runs.length - 1].designLabel : null
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:qr-code" title="QR-коды" />

    <div class="mt-sm space-y-xl">

    <UiAlert v-if="createError" kind="error">{{ createError }}</UiAlert>

    <div class="grid gap-md md:grid-cols-5">
      <UiCard>
        <p class="text-caption text-steel uppercase">Всего</p>
        <p class="mt-1 text-h3 text-ink">{{ stats.total }}</p>
      </UiCard>
      <UiCard tint="mint" :bordered="false">
        <p class="text-caption text-steel uppercase">Свободные</p>
        <p class="mt-1 text-h3 text-ink">{{ stats.unbound }}</p>
      </UiCard>
      <UiCard tint="lavender" :bordered="false">
        <p class="text-caption text-steel uppercase">Привязанные</p>
        <p class="mt-1 text-h3 text-ink">{{ stats.bound }}</p>
      </UiCard>
      <UiCard tint="peach" :bordered="false">
        <p class="text-caption text-steel uppercase">Напечатанные</p>
        <p class="mt-1 text-h3 text-ink">{{ stats.printed }}</p>
      </UiCard>
      <UiCard tint="gray" :bordered="false">
        <p class="text-caption text-steel uppercase">Без печати</p>
        <p class="mt-1 text-h3 text-ink">{{ stats.unprinted }}</p>
      </UiCard>
    </div>

    <UiCard>
      <form class="grid gap-md md:grid-cols-[1fr_auto]" @submit.prevent="createBatch">
        <UiInput
          v-model="countToCreate"
          label="Сколько QR создать"
          type="number"
          hint="От 1 до 5000 за раз. Это просто записи в БД — размер выберете при печати."
        />
        <UiButton type="submit" class="self-end" :loading="creating" @click="createBatch">
          <Icon name="lucide:plus" class="h-4 w-4" />
          Сгенерировать
        </UiButton>
      </form>
    </UiCard>

    <UiCard>
      <div class="grid gap-md md:grid-cols-[1fr_1fr_auto] md:items-end">
        <UiInput
          v-model="designLabel"
          label="Дизайн стикеров"
          placeholder="Например: Чёрные круглые 30мм, осень-2026"
          hint="Любой текст — пометка для истории печати"
        />
        <UiInput
          v-model="sizeMm"
          label="Размер QR в PDF, мм"
          type="number"
          hint="20–100"
        />
        <UiButton
          variant="primary"
          :loading="printing"
          :disabled="!selected.size || !designLabel.trim()"
          @click="printSelected"
        >
          <Icon name="lucide:printer" class="h-4 w-4" />
          Напечатать выбранные ({{ selected.size }})
        </UiButton>
      </div>
      <UiAlert v-if="printError" class="mt-md" kind="error">{{ printError }}</UiAlert>
    </UiCard>

    <div class="flex flex-wrap items-center justify-between gap-md">
      <div class="flex items-center gap-1 border-b border-hairline">
        <button
          v-for="opt in [
            { v: 'all', label: `Все · ${stats.total}` },
            { v: 'unbound', label: `Свободные · ${stats.unbound}` },
            { v: 'bound', label: `Привязанные · ${stats.bound}` },
            { v: 'unprinted', label: `Без печати · ${stats.unprinted}` },
            { v: 'printed', label: `Напечатанные · ${stats.printed}` }
          ]"
          :key="opt.v"
          :class="['px-md py-sm text-body-sm-md transition-colors',
            status === opt.v ? 'border-b-2 border-ink text-ink' : 'border-b-2 border-transparent text-steel hover:text-ink']"
          @click="status = opt.v as StatusFilter"
        >
          {{ opt.label }}
        </button>
      </div>
      <div class="flex flex-1 items-center justify-end gap-md">
        <UiInput v-model="search" placeholder="Поиск по shortId, названию, ШК…" class="w-full md:w-72" />
        <UiButton variant="primary" to="/qr-codes/link">
          <Icon name="lucide:scan-line" class="h-4 w-4" />
          Привязать на телефоне
        </UiButton>
      </div>
    </div>

    <UiCard padded="sm">
      <div v-if="pending" class="py-md text-body text-steel">Загружаю QR-коды…</div>

      <table v-else-if="codes.length" class="w-full">
        <thead>
          <tr class="border-b border-hairline text-caption text-steel uppercase">
            <th class="w-8 pb-sm">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate.prop="someSelected"
                aria-label="Выбрать все"
                @change="toggleAll"
              >
            </th>
            <th class="pb-sm text-left">QR</th>
            <th class="pb-sm text-left">Статус</th>
            <th class="pb-sm text-left">Печать</th>
            <th class="pb-sm text-left">Инструкция</th>
            <th class="pb-sm text-right">Создан</th>
            <th class="w-10 pb-sm" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="code in codes"
            :key="code.id"
            class="border-b border-hairline-soft hover:bg-surface/40"
          >
            <td class="py-sm">
              <input
                type="checkbox"
                :checked="selected.has(code.id)"
                :aria-label="`Выбрать ${code.shortId}`"
                @change="toggleOne(code.id)"
              >
            </td>
            <td class="py-sm">
              <a :href="shortUrl(code)" target="_blank" rel="noopener" class="text-body-sm-md text-link hover:underline">
                /code/{{ code.shortId }}
              </a>
            </td>
            <td class="py-sm">
              <UiBadge :variant="code.instruction ? 'tag-green' : 'tag-orange'">
                {{ code.instruction ? 'Привязан' : 'Свободен' }}
              </UiBadge>
            </td>
            <td class="py-sm text-body-sm">
              <template v-if="code.firstPrintedAt">
                <UiBadge variant="tag-purple">{{ lastDesign(code) || 'Напечатан' }}</UiBadge>
                <span class="ml-xs text-caption text-steel">{{ fmtDate(code.lastPrintedAt) }}</span>
              </template>
              <span v-else class="text-caption text-steel">Не печатался</span>
            </td>
            <td class="py-sm text-body-sm text-charcoal">
              <template v-if="code.instruction">
                {{ code.instruction.title }}
                <span class="block text-caption text-steel">ШК {{ code.instruction.productBarcode || '—' }}</span>
              </template>
              <span v-else class="text-steel">Не привязан</span>
            </td>
            <td class="py-sm text-right text-caption text-steel">{{ fmtDate(code.createdAt) }}</td>
            <td class="py-sm text-right">
              <NuxtLink
                :to="`/dashboard/qr-codes/${code.id}`"
                class="inline-flex h-8 w-8 items-center justify-center rounded-md text-steel hover:bg-surface hover:text-ink"
                aria-label="Открыть QR"
              >
                <Icon name="lucide:chevron-right" class="h-4 w-4" />
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-else class="py-md text-body text-steel">
        Пока нет QR-кодов в выбранном фильтре.
      </p>

      <p v-if="codes.length" class="mt-md text-caption text-steel">
        Показано {{ codes.length }} из {{ totalShown }}
      </p>
    </UiCard>
    </div>
  </div>
</template>
