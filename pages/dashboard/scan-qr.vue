<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

type QrStatus = 'all' | 'unbound' | 'bound'

const api = useApi()
const { currentTenant } = useAuthState()

const status = ref<QrStatus>('unbound')
const countToCreate = ref(100)
const sizeMm = ref(40)
const creating = ref(false)
const createError = ref<string | null>(null)

const qrKey = computed(() => `qr-codes-${currentTenant.value?.id ?? 'none'}-${status.value}`)
const { data, refresh, pending } = await useAsyncData(
  qrKey,
  () => api<{ stats: any; codes: any[] }>(`/api/qr-codes?status=${status.value}&take=300`),
  {
    default: () => ({ stats: { total: 0, bound: 0, unbound: 0 }, codes: [] }),
    watch: [() => currentTenant.value?.id, status]
  }
)

const stats = computed(() => data.value?.stats ?? { total: 0, bound: 0, unbound: 0 })
const codes = computed(() => data.value?.codes ?? [])

const exportUrl = computed(() => `/api/qr-codes/export?sizeMm=${encodeURIComponent(sizeMm.value)}`)

async function createBatch() {
  creating.value = true
  createError.value = null
  try {
    await api('/api/qr-codes', {
      method: 'POST',
      body: { count: Number(countToCreate.value) }
    })
    status.value = 'unbound'
    await refresh()
  } catch (e: any) {
    createError.value = e?.data?.statusMessage ?? 'Не удалось создать QR-коды'
  } finally {
    creating.value = false
  }
}

function shortUrl(code: any) {
  const appUrl = useRuntimeConfig().public.appUrl.replace(/\/$/, '')
  return `${appUrl}/s/${code.shortId}`
}

function openPdf() {
  if (import.meta.client) window.location.href = exportUrl.value
}

const statusTabs = computed(() => [
  { value: 'unbound' as QrStatus, label: 'Свободные', count: stats.value.unbound },
  { value: 'bound' as QrStatus, label: 'Привязанные', count: stats.value.bound },
  { value: 'all' as QrStatus, label: 'Все', count: stats.value.total }
])
</script>

<template>
  <div>
    <PageHeader icon="lucide:qr-code" title="Пикнуть QR">
      <template #actions>
        <UiButton variant="secondary" size="sm" :disabled="!stats.unbound" @click="openPdf">
          <Icon name="lucide:file-down" class="h-4 w-4" />
          Скачать PDF
        </UiButton>
      </template>
    </PageHeader>

    <p class="mt-1 max-w-2xl text-body-sm text-steel">
      Печатайте свободные QR заранее, а при сборке заказа привязывайте первый попавшийся QR к инструкции по ШК товара.
    </p>

    <div class="mt-sm space-y-2xl">
      <UiAlert v-if="createError" kind="error">{{ createError }}</UiAlert>

      <div class="grid gap-md md:grid-cols-3">
        <UiStatCard label="Всего" size="h3">{{ stats.total }}</UiStatCard>
        <UiStatCard label="Свободные" size="h3">{{ stats.unbound }}</UiStatCard>
        <UiStatCard label="Привязанные" size="h3">{{ stats.bound }}</UiStatCard>
      </div>

      <div class="rounded-lg bg-surface p-xl">
        <SectionHeader icon="lucide:plus" title="Сгенерировать партию QR" />
        <form class="mt-md grid gap-md md:grid-cols-[1fr_1fr_auto]" @submit.prevent="createBatch">
          <UiInput
            v-model="countToCreate"
            label="Сколько QR создать"
            type="number"
            hint="От 1 до 5000 за раз"
          />
          <UiInput
            v-model="sizeMm"
            label="Размер QR в PDF, мм"
            type="number"
            hint="Шаблоны дизайна добавим отдельно"
          />
          <UiButton class="self-end" :loading="creating">
            <Icon name="lucide:plus" class="h-4 w-4" />
            Сгенерировать
          </UiButton>
        </form>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-md">
        <UiSegmentedTabs v-model="status" :tabs="statusTabs" />
        <p class="text-caption text-steel">Показаны последние {{ codes.length }} QR</p>
      </div>

      <p v-if="pending" class="py-md text-body-sm text-steel">Загружаю QR-коды…</p>

      <UiTable v-else-if="codes.length">
        <thead>
          <tr>
            <th class="text-left">QR</th>
            <th class="text-left">Статус</th>
            <th class="text-left">Инструкция</th>
            <th class="text-right">Создан</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="code in codes" :key="code.id">
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
            <td class="text-body-sm text-charcoal">
              <template v-if="code.instruction">
                {{ code.instruction.title }}
                <span class="block text-caption text-steel">ШК {{ code.instruction.productBarcode }}</span>
              </template>
              <span v-else class="text-steel">Ждёт сканирования ШК</span>
            </td>
            <td class="text-right text-caption text-steel">
              {{ new Date(code.createdAt).toLocaleDateString() }}
            </td>
          </tr>
        </tbody>
      </UiTable>

      <p v-else class="py-md text-body-sm text-steel">
        Пока нет QR-кодов в выбранном фильтре.
      </p>
    </div>
  </div>
</template>
