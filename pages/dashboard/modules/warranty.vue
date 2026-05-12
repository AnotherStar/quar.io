<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

interface ModuleRow {
  id: string
  code: string
  name: string
  description: string | null
  allowedByPlan: boolean
  tenantConfig: { id: string; enabled: boolean; config: Record<string, any> } | null
}

interface WarrantyConfig {
  title: string
  description: string
  recipientEmail: string
  successMessage: string
  requireFio: boolean
  requirePhone: boolean
  requireEmail: boolean
  requireSerialNumber: boolean
  requirePurchaseDate: boolean
}

const DEFAULTS: WarrantyConfig = {
  title: 'Регистрация гарантии',
  description: 'Активируйте расширенную гарантию на ваш товар — заполните форму, мы пришлём подтверждение на email.',
  recipientEmail: '',
  successMessage: 'Спасибо! Ваша регистрация принята.',
  requireFio: true,
  requirePhone: false,
  requireEmail: true,
  requireSerialNumber: true,
  requirePurchaseDate: true
}

const api = useApi()
const { currentTenant } = useAuthState()

const warrantyKey = computed(() => `warranty-regs-${currentTenant.value?.id ?? 'none'}`)
const { data } = await useAsyncData(
  warrantyKey,
  () => api<{ items: any[] }>('/api/modules/warranty/registrations'),
  {
    default: () => ({ items: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

const warrantyModuleKey = computed(() => `warranty-module-${currentTenant.value?.id ?? 'none'}`)
const { data: modulesData, refresh: refreshModules } = await useAsyncData(
  warrantyModuleKey,
  () => api<{ modules: ModuleRow[] }>('/api/modules'),
  {
    default: () => ({ modules: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

const module_ = computed(() => modulesData.value?.modules.find((m) => m.code === 'warranty-registration') ?? null)

const tab = ref<'registrations' | 'settings'>('registrations')
const enabled = ref(false)
const form = reactive<WarrantyConfig>({ ...DEFAULTS })
const saving = ref(false)
const saveError = ref<string | null>(null)
const saveOk = ref(false)

watchEffect(() => {
  const cfg = module_.value?.tenantConfig
  if (cfg) {
    enabled.value = cfg.enabled
    Object.assign(form, DEFAULTS, cfg.config ?? {})
  } else {
    enabled.value = false
    Object.assign(form, DEFAULTS)
  }
})

async function save() {
  if (!module_.value) return
  saving.value = true
  saveError.value = null
  saveOk.value = false
  try {
    await api('/api/modules/warranty-registration', {
      method: 'PUT',
      body: { enabled: enabled.value, config: { ...form } }
    })
    saveOk.value = true
    await refreshModules()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage ?? 'Не удалось сохранить'
  } finally {
    saving.value = false
  }
}

function downloadCsv() {
  const items = data.value?.items ?? []
  const header = ['createdAt', 'customerName', 'customerEmail', 'customerPhone', 'serialNumber', 'purchaseDate', 'instructionTitle', 'instructionSlug']
  const rows = items.map((r) => [
    new Date(r.createdAt).toISOString(),
    r.customerName ?? '',
    r.customerEmail ?? '',
    r.customerPhone ?? '',
    r.serialNumber ?? '',
    r.purchaseDate ? new Date(r.purchaseDate).toISOString() : '',
    r.instruction?.title ?? '',
    r.instruction?.slug ?? ''
  ])
  const csv = [header, ...rows]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `warranty-registrations-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:shield-check" title="Регистрации гарантии" />

    <UiAlert v-if="!module_" kind="warning" title="Модуль не найден" class="mt-sm">
      Похоже, манифест не загружен в БД. Запустите <code>pnpm prisma db seed</code>.
    </UiAlert>

    <template v-else>
      <!-- Working row: 2 таба — список регистраций и настройки модуля.
           Справа контекстные действия: CSV экспорт / статусный бейдж. -->
      <div class="mt-sm flex flex-wrap items-center justify-between gap-md">
        <UiSegmentedTabs
          v-model="tab"
          :tabs="[
            { value: 'registrations', label: 'Регистрации', count: data?.items.length ?? 0 },
            { value: 'settings', label: 'Настройки' }
          ]"
        />

        <div class="flex flex-1 items-center justify-end gap-md">
          <template v-if="tab === 'registrations'">
            <UiButton variant="secondary" :disabled="!data?.items.length" @click="downloadCsv">
              <Icon name="lucide:download" class="h-4 w-4" />
              Скачать CSV
            </UiButton>
          </template>
          <template v-else>
            <UiBadge v-if="module_.tenantConfig?.enabled" variant="tag-green">Модуль включён</UiBadge>
            <UiBadge v-else variant="tag-gray">Модуль выключен</UiBadge>
          </template>
        </div>
      </div>

      <Transition name="tab-content" mode="out-in">
      <!-- Tab #1 — Регистрации (список). -->
      <div v-if="tab === 'registrations'" key="registrations" class="mt-xl">
        <UiTable v-if="data?.items.length" min-width="860px">
          <thead>
            <tr>
              <th class="text-left">Когда</th>
              <th class="text-left">Клиент</th>
              <th class="text-left">Контакты</th>
              <th class="text-left">Серийный №</th>
              <th class="text-left">Покупка</th>
              <th class="text-left">Инструкция</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in data.items" :key="r.id" class="align-top">
              <td class="text-caption text-steel whitespace-nowrap">
                {{ new Date(r.createdAt).toLocaleString() }}
              </td>
              <td class="text-body-sm-md text-ink">{{ r.customerName }}</td>
              <td class="text-body-sm text-charcoal">
                <div>{{ r.customerEmail }}</div>
                <div v-if="r.customerPhone" class="text-steel">{{ r.customerPhone }}</div>
              </td>
              <td class="text-body-sm font-mono text-charcoal">{{ r.serialNumber || '—' }}</td>
              <td class="text-body-sm text-charcoal">
                {{ r.purchaseDate ? new Date(r.purchaseDate).toLocaleDateString() : '—' }}
              </td>
              <td class="text-body-sm">
                <NuxtLink
                  v-if="r.instruction"
                  :to="`/dashboard/instructions/${r.instruction.id}/edit`"
                  class="text-link hover:underline"
                >
                  {{ r.instruction.title }}
                </NuxtLink>
                <span v-else class="text-steel">—</span>
              </td>
            </tr>
          </tbody>
        </UiTable>
        <p v-else class="py-md text-body text-steel">
          Пока нет регистраций. Они появятся, когда покупатели отправят форму гарантии на опубликованной инструкции.
        </p>
      </div>

      <!-- Tab #2 — Настройки модуля. Структура полей зеркальная feedback'у. -->
      <div v-else key="settings" class="mt-xl rounded-lg bg-surface p-xl">
        <form class="space-y-md" @submit.prevent="save">
          <label class="flex items-center gap-2 text-body-md text-ink">
            <input v-model="enabled" type="checkbox" class="h-4 w-4 rounded border-hairline" />
            Модуль включён
          </label>

          <div class="grid gap-md md:grid-cols-2">
            <UiInput v-model="form.title" label="Заголовок формы" placeholder="Регистрация гарантии" />
            <UiInput v-model="form.recipientEmail" type="email" label="Email получателя" placeholder="warranty@company.ru" />
          </div>

          <UiInput v-model="form.description" label="Подзаголовок" />
          <UiInput v-model="form.successMessage" label="Сообщение об успехе" />

          <fieldset class="space-y-2 rounded-md border border-hairline px-md pb-md pt-[6px]">
            <legend class="px-1 text-body-sm-md text-ink">Обязательные поля формы</legend>
            <label class="flex items-center gap-2 text-body-sm text-charcoal">
              <input v-model="form.requireFio" type="checkbox" class="h-4 w-4 rounded border-hairline" />
              ФИО
            </label>
            <label class="flex items-center gap-2 text-body-sm text-charcoal">
              <input v-model="form.requirePhone" type="checkbox" class="h-4 w-4 rounded border-hairline" />
              Телефон
            </label>
            <label class="flex items-center gap-2 text-body-sm text-charcoal">
              <input v-model="form.requireEmail" type="checkbox" class="h-4 w-4 rounded border-hairline" />
              Email
            </label>
            <label class="flex items-center gap-2 text-body-sm text-charcoal">
              <input v-model="form.requireSerialNumber" type="checkbox" class="h-4 w-4 rounded border-hairline" />
              Серийный номер
            </label>
            <label class="flex items-center gap-2 text-body-sm text-charcoal">
              <input v-model="form.requirePurchaseDate" type="checkbox" class="h-4 w-4 rounded border-hairline" />
              Дата покупки
            </label>
          </fieldset>

          <UiAlert v-if="!module_.allowedByPlan" kind="warning">
            Модуль недоступен на текущем тарифе. Перейдите в <NuxtLink to="/dashboard/billing" class="text-link hover:underline">Тариф и оплата</NuxtLink> чтобы подключить.
          </UiAlert>

          <UiAlert v-if="saveError" kind="error">{{ saveError }}</UiAlert>
          <UiAlert v-if="saveOk" kind="success">Настройки сохранены.</UiAlert>

          <div class="flex items-center gap-2">
            <UiButton type="submit" :loading="saving" :disabled="!module_.allowedByPlan">Сохранить</UiButton>
          </div>
        </form>
      </div>
      </Transition>
    </template>
  </div>
</template>
