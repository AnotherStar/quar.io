<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

interface ModuleRow {
  id: string
  code: string
  allowedByPlan: boolean
  tenantConfig: { id: string; enabled: boolean; config: Record<string, any> } | null
}

interface SupportTicketListItem {
  id: string
  status: 'open' | 'pending' | 'closed'
  assignedOperatorName: string | null
  createdAt: string
  updatedAt: string
  customer: {
    telegramUserId: string
    username: string | null
    firstName: string | null
    lastName: string | null
  }
  instruction: { id: string; title: string; slug: string } | null
  lastMessage: { text: string | null; mediaKind: string; createdAt: string } | null
}

interface SupportTicketDetails {
  id: string
  status: 'open' | 'pending' | 'closed'
  assignedOperatorName: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  customer: {
    telegramUserId: string
    username: string | null
    firstName: string | null
    lastName: string | null
  }
  instruction: { id: string; title: string; slug: string } | null
  messages: Array<{
    id: string
    sender: 'customer' | 'operator' | 'system'
    text: string | null
    mediaKind: 'text' | 'photo' | 'document'
    mediaFileName: string | null
    mediaUrl: string | null
    operatorName: string | null
    createdAt: string
  }>
}

const DEFAULTS = {
  botToken: '',
  botUsername: '',
  supportChatId: '',
  workingHours: 'Пн–Пт 10:00–19:00',
  buttonLabel: 'Задать вопрос в Telegram',
  welcomeMessage: 'Здравствуйте! Напишите ваш вопрос, мы ответим здесь.',
  closedMessage: 'Спасибо за обращение! Если вопрос останется, напишите нам снова.'
}

const api = useApi()
const { currentTenant } = useAuthState()
const modulesKey = computed(() => `support-module-${currentTenant.value?.id ?? 'none'}`)
const ticketsKey = computed(() => `support-tickets-${currentTenant.value?.id ?? 'none'}`)

const { data: modulesData, refresh: refreshModules } = await useAsyncData(
  modulesKey,
  () => api<{ modules: ModuleRow[] }>('/api/modules'),
  { default: () => ({ modules: [] }), watch: [() => currentTenant.value?.id] }
)
const { data: ticketsData, refresh: refreshTickets } = await useAsyncData(
  ticketsKey,
  () => api<{ items: SupportTicketListItem[] }>('/api/modules/chat-consultant/tickets').catch(() => ({ items: [] })),
  { default: () => ({ items: [] }), watch: [() => currentTenant.value?.id] }
)

const module_ = computed(() => modulesData.value?.modules.find((m) => m.code === 'chat-consultant') ?? null)
const tab = ref<'tickets' | 'settings'>('tickets')
const selectedId = ref<string | null>(null)
const selected = ref<SupportTicketDetails | null>(null)
const loadingTicket = ref(false)
const enabled = ref(false)
const form = reactive({ ...DEFAULTS })
const saveError = ref<string | null>(null)
const saveOk = ref(false)
const saving = ref(false)
const webhookSaving = ref(false)
const webhookOk = ref(false)
const replyError = ref<string | null>(null)
const sending = ref(false)
const selectedFile = ref<File | null>(null)
let ticketStream: EventSource | null = null
let ticketPollTimer: ReturnType<typeof setInterval> | null = null
let listPollTimer: ReturnType<typeof setInterval> | null = null

watchEffect(() => {
  const cfg = module_.value?.tenantConfig
  enabled.value = Boolean(cfg?.enabled)
  Object.assign(form, DEFAULTS, cfg?.config ?? {})
})

watch(
  () => ticketsData.value.items[0]?.id,
  (id) => {
    if (!selectedId.value && id) selectTicket(id)
  },
  { immediate: true }
)

const webhookUrl = computed(() => String(module_.value?.tenantConfig?.config?.webhookUrl ?? ''))

function customerName(ticket: SupportTicketListItem | SupportTicketDetails) {
  const parts = [ticket.customer.firstName, ticket.customer.lastName].filter(Boolean)
  return parts.join(' ') || (ticket.customer.username ? `@${ticket.customer.username}` : `ID ${ticket.customer.telegramUserId}`)
}

function statusLabel(status: string) {
  if (status === 'open') return 'Новый'
  if (status === 'pending') return 'В работе'
  return 'Закрыт'
}

function statusVariant(status: string) {
  if (status === 'open') return 'tag-orange'
  if (status === 'pending') return 'tag-blue'
  return 'tag-gray'
}

async function selectTicket(id: string) {
  selectedId.value = id
  loadingTicket.value = true
  stopTicketStream()
  try {
    const res = await api<{ ticket: SupportTicketDetails }>(`/api/modules/chat-consultant/tickets/${id}`)
    selected.value = res.ticket
    startTicketStream(id)
  } finally {
    loadingTicket.value = false
  }
}

function applyStreamTicket(ticket: SupportTicketDetails) {
  selected.value = ticket
}

function stopTicketStream() {
  ticketStream?.close()
  ticketStream = null
  if (ticketPollTimer) clearInterval(ticketPollTimer)
  ticketPollTimer = null
}

function startTicketStream(id: string) {
  if (!import.meta.client || !currentTenant.value?.id) return
  ticketStream = new EventSource(`/api/modules/chat-consultant/tickets/${id}/stream?tenantId=${encodeURIComponent(currentTenant.value.id)}`)
  ticketStream.addEventListener('ticket', (event) => {
    const payload = JSON.parse((event as MessageEvent).data) as { ticket: SupportTicketDetails }
    applyStreamTicket(payload.ticket)
  })
  ticketStream.onerror = () => {
    ticketStream?.close()
    ticketStream = null
    if (!ticketPollTimer) {
      ticketPollTimer = setInterval(() => {
        if (selectedId.value) selectTicket(selectedId.value).catch(() => null)
      }, 1500)
    }
  }
}

async function save() {
  saving.value = true
  saveError.value = null
  saveOk.value = false
  try {
    await api('/api/modules/chat-consultant', {
      method: 'PUT',
      body: { enabled: enabled.value, config: { ...form } }
    })
    saveOk.value = true
    await refreshModules()
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage ?? 'Не удалось сохранить настройки'
  } finally {
    saving.value = false
  }
}

async function setWebhook() {
  webhookSaving.value = true
  saveError.value = null
  webhookOk.value = false
  try {
    await api('/api/modules/chat-consultant/webhook', { method: 'POST' })
    webhookOk.value = true
  } catch (e: any) {
    saveError.value = e?.data?.statusMessage ?? 'Не удалось установить webhook'
  } finally {
    webhookSaving.value = false
  }
}

async function sendReply(messageText: string) {
  if (!selected.value || (!messageText.trim() && !selectedFile.value)) return
  sending.value = true
  replyError.value = null
  try {
    let mediaAssetId: string | undefined
    if (selectedFile.value) {
      const uploaded = await uploadFile(selectedFile.value)
      mediaAssetId = uploaded.assetId
    }
    await api(`/api/modules/chat-consultant/tickets/${selected.value.id}/messages`, {
      method: 'POST',
      body: { text: messageText.trim() || undefined, mediaAssetId }
    })
    selectedFile.value = null
    await Promise.all([refreshTickets(), selectTicket(selected.value.id)])
  } catch (e: any) {
    replyError.value = e?.data?.statusMessage ?? 'Не удалось отправить сообщение'
  } finally {
    sending.value = false
  }
}

async function closeTicket() {
  if (!selected.value) return
  await api(`/api/modules/chat-consultant/tickets/${selected.value.id}/close`, { method: 'POST' })
  await Promise.all([refreshTickets(), selectTicket(selected.value.id)])
}

function setAttachment(file: File | null) {
  selectedFile.value = file
}

// Сбрасываем счётчик новых тикетов в сайдбар-бейдже — оператор зашёл в
// раздел поддержки, всё что было до этого момента считаем просмотренным.
const moduleBadges = useModuleBadges()

onMounted(() => {
  listPollTimer = setInterval(() => refreshTickets().catch(() => null), 5000)
  moduleBadges.markSeen('chat-consultant')
})

onBeforeUnmount(() => {
  stopTicketStream()
  if (listPollTimer) clearInterval(listPollTimer)
})
</script>

<template>
  <div>
    <PageHeader icon="lucide:messages-square" title="Поддержка" />

    <UiAlert v-if="!module_" kind="warning" title="Модуль не найден" class="mt-sm">
      Запустите <code>pnpm db:seed</code>, чтобы синхронизировать манифесты модулей.
    </UiAlert>

    <template v-else>
      <div class="mt-sm flex flex-wrap items-center justify-between gap-md">
        <UiSegmentedTabs
          v-model="tab"
          :tabs="[
            { value: 'tickets', label: 'Обращения', count: ticketsData.items.length },
            { value: 'settings', label: 'Настройки' }
          ]"
        />
        <UiBadge v-if="module_.tenantConfig?.enabled" variant="tag-green">Модуль включён</UiBadge>
        <UiBadge v-else variant="tag-gray">Модуль выключен</UiBadge>
      </div>

      <div v-if="tab === 'tickets'" class="mt-xl grid gap-xl lg:grid-cols-[360px_1fr]">
        <div class="min-h-[520px] rounded-lg bg-surface p-md">
          <button
            v-for="ticket in ticketsData.items"
            :key="ticket.id"
            type="button"
            class="mb-2 w-full rounded-md px-md py-sm text-left transition-colors hover:bg-canvas"
            :class="selectedId === ticket.id ? 'bg-canvas shadow-soft' : ''"
            @click="selectTicket(ticket.id)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-body-sm-md text-ink">{{ customerName(ticket) }}</span>
              <UiBadge :variant="statusVariant(ticket.status)">{{ statusLabel(ticket.status) }}</UiBadge>
            </div>
            <p class="mt-1 truncate text-body-sm text-steel">
              {{ ticket.lastMessage?.text || (ticket.lastMessage?.mediaKind === 'photo' ? 'Фото' : ticket.lastMessage ? 'Файл' : 'Нет сообщений') }}
            </p>
            <p class="mt-1 truncate text-caption text-hairline-strong">{{ ticket.instruction?.title || 'Инструкция не определена' }}</p>
          </button>
          <p v-if="!ticketsData.items.length" class="p-md text-body-sm text-steel">
            Обращений пока нет. Они появятся после первого сообщения покупателя в Telegram-бот.
          </p>
        </div>

        <div class="min-h-[520px] rounded-lg bg-surface p-md">
          <div v-if="loadingTicket" class="p-md text-body-sm text-steel">Загружаем обращение…</div>
          <template v-else-if="selected">
            <div class="flex flex-wrap items-start justify-between gap-md border-b border-hairline pb-md">
              <div>
                <h2 class="text-h4 text-ink">{{ customerName(selected) }}</h2>
                <p class="mt-1 text-body-sm text-steel">
                  {{ selected.instruction?.title || 'Инструкция не определена' }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UiBadge :variant="statusVariant(selected.status)">{{ statusLabel(selected.status) }}</UiBadge>
                <UiButton v-if="selected.status !== 'closed'" size="sm" variant="secondary" @click="closeTicket">
                  <Icon name="lucide:check" class="h-4 w-4" />
                  Закрыть
                </UiButton>
              </div>
            </div>

            <SupportChat
              :messages="selected.messages"
              own-sender="operator"
              :loading="sending"
              :disabled="selected.status === 'closed'"
              :error="replyError"
              :allow-attachments="selected.status !== 'closed'"
              :attachment-name="selectedFile?.name"
              placeholder="Ответ покупателю"
              submit-label="Отправить"
              @attach="setAttachment"
              @submit="sendReply"
            />
          </template>
          <p v-else class="p-md text-body-sm text-steel">Выберите обращение слева.</p>
        </div>
      </div>

      <div v-else class="mt-xl rounded-lg bg-surface p-xl">
        <form class="space-y-md" @submit.prevent="save">
          <label class="flex items-center gap-2 text-body-md text-ink">
            <input v-model="enabled" type="checkbox" class="h-4 w-4 rounded border-hairline" />
            Модуль включён
          </label>

          <div class="grid gap-md md:grid-cols-2">
            <UiInput v-model="form.botToken" label="Токен Telegram-бота" placeholder="123456:ABC..." />
            <UiInput v-model="form.botUsername" label="Имя бота в Telegram" placeholder="my_company_support_bot" prefix="@" />
            <UiInput v-model="form.supportChatId" label="ID группы поддержки" placeholder="-1001234567890" />
            <UiInput v-model="form.workingHours" label="Часы работы" />
          </div>
          <UiInput v-model="form.buttonLabel" label="Текст публичной кнопки" />
          <UiInput v-model="form.welcomeMessage" label="Приветствие в боте" />
          <UiInput v-model="form.closedMessage" label="Сообщение после закрытия тикета" />

          <div v-if="webhookUrl" class="rounded-md bg-canvas p-md">
            <p class="text-body-sm-md text-ink">Webhook URL</p>
            <p class="mt-1 break-all text-body-sm text-steel">{{ webhookUrl }}</p>
            <div class="mt-sm flex flex-wrap items-center gap-2">
              <UiButton type="button" size="sm" variant="secondary" :loading="webhookSaving" @click="setWebhook">
                <Icon name="lucide:plug-zap" class="h-4 w-4" />
                Установить webhook
              </UiButton>
              <span v-if="webhookOk" class="text-caption text-brand-green">Webhook установлен.</span>
            </div>
          </div>

          <UiAlert v-if="saveError" kind="error">{{ saveError }}</UiAlert>
          <UiAlert v-if="saveOk" kind="success">Настройки сохранены.</UiAlert>

          <UiButton type="submit" :loading="saving">Сохранить</UiButton>
        </form>

        <div class="mt-xl border-t border-hairline pt-md">
          <h3 class="text-h5 text-ink">Как подключить Telegram</h3>
          <ol class="mt-sm list-decimal space-y-2 pl-5 text-body-sm text-charcoal">
            <li>Создайте бота в <span class="text-ink">@BotFather</span> и сохраните выданный токен и имя бота.</li>
            <li>Создайте закрытую группу поддержки, добавьте в неё бота и разрешите ему читать сообщения.</li>
            <li>Узнайте идентификатор группы — например, через сервис <span class="text-ink">@getidsbot</span> или другую утилиту для получения chat id.</li>
            <li>Сохраните настройки на этой странице и нажмите «Установить webhook».</li>
            <li>Оператор отвечает покупателю, нажимая «Ответить» на нужное сообщение в группе.</li>
          </ol>
        </div>
      </div>
    </template>
  </div>
</template>
