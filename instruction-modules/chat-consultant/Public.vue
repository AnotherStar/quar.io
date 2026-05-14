<script setup lang="ts">
const props = defineProps<{
  instructionId: string
  config: Record<string, any>
  viewerSessionId: string
}>()

const botUsername = computed(() => String(props.config?.botUsername ?? '').replace(/^@/, ''))
const buttonLabel = computed(() => String(props.config?.buttonLabel ?? 'Задать вопрос в Telegram'))
const workingHours = computed(() => String(props.config?.workingHours ?? ''))
const deepLink = computed(() => {
  if (!botUsername.value) return ''
  return `https://t.me/${botUsername.value}?start=instruction_${props.instructionId}`
})
const storageKey = computed(() => `quar-support-ticket:${props.instructionId}:${props.viewerSessionId}`)
const open = ref(false)
const ticketId = ref<string | null>(null)
const status = ref<'idle' | 'loading' | 'error'>('idle')
const errorMsg = ref<string | null>(null)
const messages = ref<Array<{
  id: string
  sender: 'customer' | 'operator' | 'system'
  text: string | null
  mediaKind: 'text' | 'photo' | 'document'
  mediaFileName: string | null
  mediaUrl: string | null
  createdAt: string
}>>([])
let eventSource: EventSource | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

async function loadMessages() {
  if (!ticketId.value) return
  const res = await $fetch<{ ticket: { messages: typeof messages.value } }>(
    `/api/modules/chat-consultant/site/tickets/${ticketId.value}`,
    { query: { sessionId: props.viewerSessionId } }
  )
  messages.value = res.ticket.messages
}

function startStream() {
  if (!import.meta.client || !ticketId.value || eventSource) return
  eventSource = new EventSource(`/api/modules/chat-consultant/site/tickets/${ticketId.value}/stream?sessionId=${encodeURIComponent(props.viewerSessionId)}`)
  eventSource.addEventListener('messages', (event) => {
    const payload = JSON.parse((event as MessageEvent).data) as { messages: typeof messages.value }
    messages.value = payload.messages
  })
  eventSource.onerror = () => {
    eventSource?.close()
    eventSource = null
    if (!pollTimer) pollTimer = setInterval(() => loadMessages().catch(() => null), 1500)
  }
}

async function submit(messageText: string) {
  if (!messageText.trim()) return
  status.value = 'loading'
  errorMsg.value = null
  try {
    const res = await $fetch<{ ticketId: string }>('/api/modules/chat-consultant/site/messages', {
      method: 'POST',
      body: {
        instructionId: props.instructionId,
        sessionId: props.viewerSessionId,
        text: messageText.trim()
      }
    })
    ticketId.value = res.ticketId
    if (import.meta.client) localStorage.setItem(storageKey.value, res.ticketId)
    await loadMessages()
    startStream()
    open.value = true
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage ?? 'Не удалось отправить сообщение'
    status.value = 'error'
    return
  }
  status.value = 'idle'
}

onMounted(() => {
  ticketId.value = localStorage.getItem(storageKey.value)
  if (ticketId.value) {
    loadMessages().catch(() => null)
    startStream()
  }
})

onBeforeUnmount(() => {
  eventSource?.close()
  if (pollTimer) clearInterval(pollTimer)
  if (import.meta.client) document.body.style.overflow = ''
})

watch(open, (value) => {
  if (!import.meta.client) return
  document.body.style.overflow = value ? 'hidden' : ''
})
</script>

<template>
  <section class="my-lg rounded-lg border border-hairline bg-canvas p-xl" data-module="chat-consultant">
    <div class="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
      <div class="min-w-0">
        <h3 class="text-h4 text-ink">Поддержка</h3>
        <p v-if="workingHours" class="mt-1 text-body-sm text-steel">
          Часы работы: {{ workingHours }}
        </p>
        <p class="mt-1 text-body-sm text-steel">
          Напишите вопрос здесь на странице<span v-if="deepLink"> или в Telegram</span>.
        </p>
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2">
        <UiButton variant="primary" @click="open = true">
          <Icon name="lucide:message-circle" class="h-4 w-4" />
          Открыть чат
        </UiButton>
        <UiButton
          v-if="deepLink"
          :href="deepLink"
          variant="secondary"
          target="_blank"
          rel="noopener"
        >
          <Icon name="lucide:send" class="h-4 w-4" />
          {{ buttonLabel }}
        </UiButton>
      </div>
    </div>

    <ClientOnly>
      <Teleport to="body">
        <div
          v-if="open"
          class="chat-support-modal z-[9999] flex items-end justify-center bg-black/25 p-0 sm:items-center sm:p-md"
          role="dialog"
          aria-modal="true"
          aria-label="Чат поддержки"
          @click.self="open = false"
        >
          <div class="chat-support-modal__panel flex w-full flex-col overflow-hidden bg-canvas shadow-modal sm:h-[min(720px,calc(100dvh-48px))] sm:max-w-[560px] sm:rounded-xl">
          <header class="sticky top-0 z-10 flex shrink-0 items-start justify-between gap-md border-b border-hairline bg-canvas px-md pb-sm pt-md">
            <div class="min-w-0">
              <h3 class="text-h5 text-ink">Поддержка</h3>
              <p v-if="workingHours" class="mt-0.5 text-caption text-steel">
                {{ workingHours }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <UiButton
                v-if="deepLink"
                :href="deepLink"
                size="sm"
                variant="ghost"
                target="_blank"
                rel="noopener"
              >
                <Icon name="lucide:send" class="h-4 w-4" />
                Telegram
              </UiButton>
              <button
                type="button"
                class="inline-flex h-8 items-center gap-1 rounded-md bg-surface px-sm text-body-sm-md text-charcoal transition-colors hover:bg-hairline-soft"
                aria-label="Закрыть чат"
                @click="open = false"
              >
                <Icon name="lucide:x" class="h-4 w-4" />
                Закрыть
              </button>
            </div>
          </header>

          <div class="min-h-0 flex-1 overflow-hidden p-md">
            <SupportChat
              :messages="messages"
              own-sender="customer"
              :loading="status === 'loading'"
              :error="errorMsg"
              fill
              placeholder="Напишите вопрос по товару"
              @submit="submit"
            />
          </div>
          </div>
        </div>
      </Teleport>
    </ClientOnly>
  </section>
</template>

<style scoped>
.chat-support-modal {
  position: fixed;
  inset: 0;
  width: 100vw;
  /* Fallback for browsers without dvh support, then progressive enhancement. */
  height: 100vh;
  height: 100dvh;
}

/* На мобильном панель должна занимать всю высоту вьюпорта.
 * На десктопе высоту задаёт `sm:h-[...]` из шаблона. */
@media (max-width: 639px) {
  .chat-support-modal__panel {
    height: 100vh;
    height: 100dvh;
  }
}
</style>
