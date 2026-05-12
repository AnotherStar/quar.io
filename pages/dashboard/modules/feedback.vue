<script setup lang="ts">
// Feedback module — tenant-wide settings + submissions list.
// Settings live in TenantModuleConfig.config and apply to every editor block
// of this module across all instructions; the editor itself has no per-block
// config UI on purpose (see instruction-modules/feedback/index.ts).
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

interface ModuleRow {
  id: string
  code: string
  name: string
  description: string | null
  allowedByPlan: boolean
  tenantConfig: { id: string; enabled: boolean; config: Record<string, any> } | null
}

interface FeedbackConfig {
  title: string
  description: string
  recipientEmail: string
  requireFio: boolean
  requirePhone: boolean
  requireEmail: boolean
  requireTelegram: boolean
  requireMessage: boolean
  successMessage: string
}

const DEFAULTS: FeedbackConfig = {
  title: 'Свяжитесь с нами',
  description: 'Оставьте сообщение — мы ответим в течение рабочего дня.',
  recipientEmail: '',
  requireFio: true,
  requirePhone: false,
  requireEmail: true,
  requireTelegram: false,
  requireMessage: true,
  successMessage: 'Спасибо! Ваше сообщение получено.'
}

const api = useApi()
const { currentTenant } = useAuthState()
const feedbackModuleKey = computed(() => `feedback-module-${currentTenant.value?.id ?? 'none'}`)
const feedbackSubmissionsKey = computed(() => `feedback-submissions-${currentTenant.value?.id ?? 'none'}`)
const { data: modulesData, refresh: refreshModules } = await useAsyncData(
  feedbackModuleKey,
  () => api<{ modules: ModuleRow[] }>('/api/modules'),
  {
    default: () => ({ modules: [] }),
    watch: [() => currentTenant.value?.id]
  }
)
const { data: subsData, refresh: refreshSubs } = await useAsyncData(
  feedbackSubmissionsKey,
  () => api<{ items: any[] }>('/api/modules/feedback/submissions').catch(() => ({ items: [] })),
  {
    default: () => ({ items: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

const module_ = computed(() => modulesData.value?.modules.find((m) => m.code === 'feedback') ?? null)

// Local form state — initialised from tenantConfig (or defaults), saved on
// "Сохранить". Until then, edits are not persisted.
const form = reactive<FeedbackConfig>({ ...DEFAULTS })
const enabled = ref(false)

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

const saving = ref(false)
const saveError = ref<string | null>(null)
const saveOk = ref(false)

const tab = ref<'submissions' | 'settings'>('submissions')

async function save() {
  saving.value = true
  saveError.value = null
  saveOk.value = false
  try {
    await api('/api/modules/feedback', {
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
  const items = subsData.value?.items ?? []
  const header = ['createdAt', 'fio', 'phone', 'email', 'telegram', 'message', 'instructionTitle', 'instructionSlug']
  const rows = items.map((r) => [
    new Date(r.createdAt).toISOString(),
    r.fio ?? '',
    r.phone ?? '',
    r.email ?? '',
    r.telegram ?? '',
    (r.message ?? '').replace(/\n/g, ' '),
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
  a.download = `feedback-submissions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:message-square" title="Обратная связь" />

    <UiAlert v-if="!module_" kind="warning" title="Модуль не найден" class="mt-sm">
      Похоже, манифест не загружен в БД. Запустите <code>pnpm prisma db seed</code>.
    </UiAlert>

    <template v-else>
      <!-- Working row: segmented-control + action справа.
           Левый таб — список сообщений, правый — настройки формы. -->
      <div class="mt-sm flex flex-wrap items-center justify-between gap-md">
        <UiSegmentedTabs
          v-model="tab"
          :tabs="[
            { value: 'submissions', label: 'Сообщения', count: subsData?.items.length ?? 0 },
            { value: 'settings', label: 'Настройки' }
          ]"
        />

        <!-- Правый блок: на вкладке «Сообщения» — кнопка экспорта,
             на «Настройках» — статусный бейдж модуля. -->
        <div class="flex flex-1 items-center justify-end gap-md">
          <template v-if="tab === 'submissions'">
            <UiButton variant="secondary" :disabled="!subsData?.items.length" @click="downloadCsv">
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
      <!-- Tab #1 — Сообщения (список). -->
      <div v-if="tab === 'submissions'" key="submissions" class="mt-xl">
        <UiTable v-if="subsData?.items.length" min-width="820px">
          <thead>
            <tr>
              <th class="text-left">Когда</th>
              <th class="text-left">ФИО</th>
              <th class="text-left">Контакты</th>
              <th class="text-left">Сообщение</th>
              <th class="text-left">Инструкция</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in subsData.items" :key="r.id" class="align-top">
              <td class="text-caption text-steel whitespace-nowrap">
                {{ new Date(r.createdAt).toLocaleString() }}
              </td>
              <td class="text-body-sm-md text-ink">{{ r.fio || '—' }}</td>
              <td class="text-body-sm text-charcoal">
                <div v-if="r.email">{{ r.email }}</div>
                <div v-if="r.phone" class="text-steel">{{ r.phone }}</div>
                <div v-if="r.telegram" class="text-steel">{{ r.telegram }}</div>
              </td>
              <td class="text-body-sm text-charcoal">
                <p class="max-w-[400px] whitespace-pre-line">{{ r.message || '—' }}</p>
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
          Пока нет сообщений. Они появятся, когда посетители заполнят форму на опубликованной инструкции.
        </p>
      </div>

      <!-- Tab #2 — Настройки модуля. -->
      <div v-else key="settings" class="mt-xl rounded-lg bg-surface p-xl">
        <form class="space-y-md" @submit.prevent="save">
          <label class="flex items-center gap-2 text-body-md text-ink">
            <input v-model="enabled" type="checkbox" class="h-4 w-4 rounded border-hairline" />
            Модуль включён
          </label>

          <div class="grid gap-md md:grid-cols-2">
            <UiInput v-model="form.title" label="Заголовок формы" placeholder="Свяжитесь с нами" />
            <UiInput v-model="form.recipientEmail" type="email" label="Email получателя" placeholder="hello@company.ru" />
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
              <input v-model="form.requireTelegram" type="checkbox" class="h-4 w-4 rounded border-hairline" />
              Telegram
            </label>
            <label class="flex items-center gap-2 text-body-sm text-charcoal">
              <input v-model="form.requireMessage" type="checkbox" class="h-4 w-4 rounded border-hairline" />
              Сообщение
            </label>
          </fieldset>

          <UiAlert v-if="saveError" kind="error">{{ saveError }}</UiAlert>
          <UiAlert v-if="saveOk" kind="success">Настройки сохранены.</UiAlert>

          <div class="flex items-center gap-2">
            <UiButton type="submit" :loading="saving">Сохранить</UiButton>
          </div>
        </form>
      </div>
      </Transition>
    </template>
  </div>
</template>
