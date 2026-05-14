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

type StatusFilter = 'bound' | 'unbound'
const status = ref<StatusFilter>('bound')
const search = ref('')
const debouncedSearch = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(search, (v) => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => { debouncedSearch.value = v }, 250)
})

const countToCreate = ref(100)
const creating = ref(false)
const createError = ref<string | null>(null)

// Модалка генерации новых QR. Открывается из кнопки «+ Создать» в header'е.
const createModalOpen = ref(false)
function openCreateModal() {
  createError.value = null
  createModalOpen.value = true
}

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
    createModalOpen.value = false
  } catch (e: any) {
    createError.value = e?.data?.statusMessage ?? 'Не удалось создать QR-коды'
  } finally {
    creating.value = false
  }
}

function shortUrl(code: QrCodeRow) {
  const appUrl = useRuntimeConfig().public.appUrl.replace(/\/$/, '')
  return `${appUrl}/s/${code.shortId}`
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
    <PageHeader icon="lucide:qr-code" title="QR-коды">
      <template #actions>
        <UiButton variant="primary" @click="openCreateModal">
          <Icon name="lucide:plus" class="h-4 w-4" />
          Создать
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm space-y-xl">

    <div class="flex flex-wrap items-center justify-between gap-md">
      <!-- Pill-tabs: Привязанные (по умолчанию) / Свободные. -->
      <UiSegmentedTabs
        v-model="status"
        :tabs="[
          { value: 'bound', label: 'Привязанные', count: stats.bound },
          { value: 'unbound', label: 'Свободные', count: stats.unbound }
        ]"
      />
      <div class="relative w-full md:max-w-sm">
        <Icon name="lucide:search" class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
        <input
          v-model="search"
          type="text"
          placeholder="Поиск по shortId, названию, ШК…"
          class="h-10 w-full rounded-lg border border-transparent bg-surface px-md pl-9 text-body-sm-md placeholder:text-hairline-strong outline-none focus:border-primary focus:bg-canvas focus:ring-2 focus:ring-primary/20"
        >
      </div>
    </div>

    <div>
      <!-- Хедер таблицы рендерится всегда, чтобы при обновлении (фильтр /
           поиск / refresh) контент не «прыгал». Tbody обёрнут в Transition
           c key=status — при смене pill-таба содержимое уезжает влево, новое
           приезжает справа (тот же tab-content transition, что в /dashboard/
           instructions). Состояние pending и пустой результат показываются
           как одна строка <tr colspan="7"> внутри того же tbody. -->
      <UiTable min-width="720px">
        <thead>
          <tr>
            <th class="w-8">
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate.prop="someSelected"
                :disabled="pending || !codes.length"
                aria-label="Выбрать все"
                @change="toggleAll"
              >
            </th>
            <th class="text-left">QR</th>
            <th class="text-left">Статус</th>
            <th class="text-left">Печать</th>
            <th class="text-left">Инструкция</th>
            <th class="text-right">Создан</th>
            <th class="w-10" />
          </tr>
        </thead>
        <Transition name="tab-content" mode="out-in">
        <tbody :key="status">
          <tr v-if="pending">
            <td :colspan="7" class="py-xl">
              <div class="flex items-center justify-center gap-2 text-body-sm text-steel">
                <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
                Загружаю QR-коды…
              </div>
            </td>
          </tr>
          <tr v-else-if="!codes.length">
            <td :colspan="7" class="py-xl text-center text-body-sm text-steel">
              Пока нет QR-кодов в выбранном фильтре.
            </td>
          </tr>
          <tr
            v-for="code in codes"
            v-else
            :key="code.id"
          >
            <td>
              <input
                type="checkbox"
                :checked="selected.has(code.id)"
                :aria-label="`Выбрать ${code.shortId}`"
                @change="toggleOne(code.id)"
              >
            </td>
            <td>
              <a :href="shortUrl(code)" target="_blank" rel="noopener" class="text-body-sm-md text-link hover:underline">
                /s/{{ code.shortId }}
              </a>
            </td>
            <td>
              <UiBadge :variant="code.instruction ? 'tag-green' : 'tag-orange'">
                {{ code.instruction ? 'Привязан' : 'Свободен' }}
              </UiBadge>
            </td>
            <td class="text-body-sm">
              <template v-if="code.firstPrintedAt">
                <UiBadge variant="tag-gray">{{ lastDesign(code) || 'Напечатан' }}</UiBadge>
                <span class="ml-xs text-caption text-steel">{{ fmtDate(code.lastPrintedAt) }}</span>
              </template>
              <span v-else class="text-caption text-steel">Не печатался</span>
            </td>
            <td class="text-body-sm text-charcoal">
              <template v-if="code.instruction">
                {{ code.instruction.title }}
                <span class="block text-caption text-steel">ШК {{ code.instruction.productBarcode || '—' }}</span>
              </template>
              <span v-else class="text-steel">Не привязан</span>
            </td>
            <td class="text-right text-caption text-steel">{{ fmtDate(code.createdAt) }}</td>
            <td class="text-right">
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
        </Transition>
      </UiTable>

      <p v-if="!pending && codes.length" class="mt-md text-caption text-steel">
        Показано {{ codes.length }} из {{ totalShown }}
      </p>
    </div>
    </div>

    <!-- Модалка генерации QR. Open'ится из «+ Создать» в header'е. Создаёт
         пачку записей в БД, размер стикера выбирается отдельно при печати. -->
    <UiModal
      :open="createModalOpen"
      size="sm"
      :close-on-backdrop="!creating"
      :close-on-esc="!creating"
      @update:open="(v) => (createModalOpen = v)"
    >
      <template #header>
        <div class="flex items-center gap-3">
          <Icon name="lucide:qr-code" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Создать QR-коды</h2>
        </div>
      </template>

      <div class="space-y-md">
        <UiInput
          v-model="countToCreate"
          label="Сколько QR создать"
          type="number"
          hint="От 1 до 5000 за раз. Это просто записи в БД — размер выберете при печати."
        />
        <UiAlert v-if="createError" kind="error">{{ createError }}</UiAlert>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-md">
          <UiButton
            variant="secondary"
            :disabled="creating"
            @click="createModalOpen = false"
          >
            Отмена
          </UiButton>
          <UiButton
            variant="primary"
            :loading="creating"
            :disabled="creating || Number(countToCreate) < 1"
            @click="createBatch"
          >
            <Icon name="lucide:plus" class="h-4 w-4" />
            Сгенерировать
          </UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>
