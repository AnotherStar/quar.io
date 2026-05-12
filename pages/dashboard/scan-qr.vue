<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const { currentTenant } = useAuthState()

const status = ref<'all' | 'unbound' | 'bound'>('unbound')
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
</script>

<template>
  <div class="space-y-xl">
    <div class="flex flex-col justify-between gap-md md:flex-row md:items-end">
      <div>
        <h1 class="text-h2 text-ink">Пикнуть QR</h1>
        <p class="mt-1 max-w-2xl text-body text-slate">
          Печатайте свободные QR заранее, а при сборке заказа привязывайте первый попавшийся QR к инструкции по ШК товара.
        </p>
      </div>
      <UiButton variant="secondary" :disabled="!stats.unbound" @click="openPdf">
        <Icon name="lucide:file-down" class="h-4 w-4" />
        Скачать PDF
      </UiButton>
    </div>

    <UiAlert v-if="createError" kind="error">{{ createError }}</UiAlert>

    <div class="grid gap-md md:grid-cols-3">
      <UiCard>
        <p class="text-caption text-steel uppercase">Всего</p>
        <p class="mt-1 text-h3 text-ink">{{ stats.total }}</p>
      </UiCard>
      <UiCard tint="mint" :bordered="false">
        <p class="text-caption text-steel uppercase">Свободные</p>
        <p class="mt-1 text-h3 text-ink">{{ stats.unbound }}</p>
      </UiCard>
      <UiCard tint="gray" :bordered="false">
        <p class="text-caption text-steel uppercase">Привязанные</p>
        <p class="mt-1 text-h3 text-ink">{{ stats.bound }}</p>
      </UiCard>
    </div>

    <UiCard>
      <form class="grid gap-md md:grid-cols-[1fr_1fr_auto]" @submit.prevent="createBatch">
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
    </UiCard>

    <div class="flex flex-wrap items-center justify-between gap-md">
      <div class="flex items-center gap-1 border-b border-hairline">
        <button
          :class="['px-md py-sm text-body-sm-md transition-colors',
            status === 'unbound' ? 'border-b-2 border-ink text-ink' : 'border-b-2 border-transparent text-steel hover:text-ink']"
          @click="status = 'unbound'"
        >
          Свободные · {{ stats.unbound }}
        </button>
        <button
          :class="['px-md py-sm text-body-sm-md transition-colors',
            status === 'bound' ? 'border-b-2 border-ink text-ink' : 'border-b-2 border-transparent text-steel hover:text-ink']"
          @click="status = 'bound'"
        >
          Привязанные · {{ stats.bound }}
        </button>
        <button
          :class="['px-md py-sm text-body-sm-md transition-colors',
            status === 'all' ? 'border-b-2 border-ink text-ink' : 'border-b-2 border-transparent text-steel hover:text-ink']"
          @click="status = 'all'"
        >
          Все · {{ stats.total }}
        </button>
      </div>
      <p class="text-caption text-steel">Показаны последние {{ codes.length }} QR</p>
    </div>

    <UiCard>
      <div v-if="pending" class="py-md text-body text-steel">Загружаю QR-коды…</div>

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

      <p v-else class="py-md text-body text-steel">
        Пока нет QR-кодов в выбранном фильтре.
      </p>
    </UiCard>
  </div>
</template>
