<script setup lang="ts">
interface SupportChatMessage {
  id: string
  sender: 'customer' | 'operator' | 'system'
  text: string | null
  mediaKind: 'text' | 'photo' | 'document'
  mediaFileName: string | null
  mediaUrl: string | null
  operatorName?: string | null
  createdAt: string
}

const props = withDefaults(defineProps<{
  messages: SupportChatMessage[]
  ownSender: 'customer' | 'operator'
  placeholder?: string
  loading?: boolean
  disabled?: boolean
  error?: string | null
  submitLabel?: string
  allowAttachments?: boolean
  attachmentName?: string | null
  showContactFields?: boolean
  fill?: boolean
  name?: string
  email?: string
}>(), {
  placeholder: 'Сообщение',
  submitLabel: 'Отправить',
  error: null,
  attachmentName: null,
  name: '',
  email: ''
})

const emit = defineEmits<{
  submit: [text: string]
  attach: [file: File | null]
  'update:name': [value: string]
  'update:email': [value: string]
}>()

const draft = ref('')
const scrollRef = ref<HTMLElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const orderedMessages = computed(() => props.messages ?? [])

function senderLabel(message: SupportChatMessage) {
  if (message.sender === 'customer') return 'Покупатель'
  if (message.sender === 'operator') return message.operatorName || 'Оператор'
  return 'Система'
}

function submit() {
  const value = draft.value.trim()
  if (!value && !props.attachmentName) return
  emit('submit', value)
  draft.value = ''
}

function onFileChange(event: Event) {
  emit('attach', (event.target as HTMLInputElement).files?.[0] ?? null)
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollRef.value
    if (!el) return
    el.scrollTop = el.scrollHeight
  })
}

watch(() => orderedMessages.value.length, scrollToBottom)
onMounted(scrollToBottom)
</script>

<template>
  <div class="support-chat" :class="fill ? 'support-chat--fill' : ''">
    <div ref="scrollRef" class="support-chat__messages">
      <div
        v-for="message in orderedMessages"
        :key="message.id"
        class="support-chat__row"
        :class="[
          message.sender === ownSender ? 'support-chat__row--own' : '',
          message.sender === 'system' ? 'support-chat__row--system' : ''
        ]"
      >
        <div
          class="support-chat__bubble"
          :class="[
            message.sender === ownSender ? 'support-chat__bubble--own' : 'support-chat__bubble--other',
            message.sender === 'system' ? 'support-chat__bubble--system' : ''
          ]"
        >
          <p v-if="message.text" class="support-chat__text">{{ message.text }}</p>
          <a
            v-if="message.mediaUrl && message.mediaKind === 'photo'"
            :href="message.mediaUrl"
            target="_blank"
            rel="noopener"
            class="support-chat__image-link"
          >
            <img :src="message.mediaUrl" :alt="message.mediaFileName || 'Фото'" class="support-chat__image" />
          </a>
          <a
            v-else-if="message.mediaUrl"
            :href="message.mediaUrl"
            target="_blank"
            rel="noopener"
            class="support-chat__file"
          >
            <Icon name="lucide:file" class="h-3.5 w-3.5" />
            {{ message.mediaFileName || 'Файл' }}
          </a>
          <span v-else-if="message.mediaKind !== 'text'" class="support-chat__file">
            <Icon :name="message.mediaKind === 'photo' ? 'lucide:image' : 'lucide:file'" class="h-3.5 w-3.5" />
            {{ message.mediaFileName || (message.mediaKind === 'photo' ? 'Фото' : 'Файл') }}
          </span>
          <p class="support-chat__meta">
            {{ senderLabel(message) }} · {{ new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}
          </p>
        </div>
      </div>

      <p v-if="!orderedMessages.length" class="px-sm py-md text-body-sm text-steel">
        Сообщений пока нет.
      </p>
    </div>

    <form class="support-chat__form" @submit.prevent="submit">
      <div v-if="showContactFields" class="grid gap-2 sm:grid-cols-2">
        <UiInput
          :model-value="name"
          label="Имя"
          placeholder="Как к вам обращаться"
          @update:model-value="$emit('update:name', $event)"
        />
        <UiInput
          :model-value="email"
          type="email"
          label="Email"
          placeholder="Если уйдёте со страницы"
          @update:model-value="$emit('update:email', $event)"
        />
      </div>

      <textarea
        v-model="draft"
        rows="2"
        :disabled="disabled || loading"
        class="support-chat__textarea"
        :placeholder="placeholder"
      />

      <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <label v-if="allowAttachments" class="support-chat__attach">
          <Icon name="lucide:paperclip" class="h-4 w-4" />
          <span class="truncate">{{ attachmentName || 'Файл или фото' }}</span>
          <input ref="fileInput" type="file" class="hidden" @change="onFileChange" />
        </label>
        <span v-else />

        <UiButton type="submit" size="sm" :loading="loading" :disabled="disabled || (!draft.trim() && !attachmentName)">
          <Icon name="lucide:send" class="h-4 w-4" />
          {{ submitLabel }}
        </UiButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.support-chat {
  @apply flex min-h-0 flex-col overflow-hidden;
}

.support-chat--fill {
  @apply h-full;
}

.support-chat__messages {
  @apply flex max-h-[420px] min-h-[180px] flex-col gap-1.5 overflow-y-auto overscroll-contain rounded-md bg-surface p-sm;
  -webkit-overflow-scrolling: touch;
}

.support-chat--fill .support-chat__messages {
  @apply max-h-none min-h-0 flex-1 basis-0;
}

.support-chat__row {
  @apply flex;
}

.support-chat__row--own {
  @apply justify-end;
}

.support-chat__row--system {
  @apply justify-center;
}

.support-chat__bubble {
  @apply max-w-[78%] rounded-md px-sm py-xs;
}

.support-chat__bubble--own {
  background: #efe1c7;
  color: var(--color-charcoal);
}

.support-chat__bubble--other {
  @apply bg-canvas text-charcoal;
}

.support-chat__bubble--system {
  @apply bg-tint-gray text-steel;
}

.support-chat__text {
  @apply whitespace-pre-line text-body-sm leading-snug;
}

.support-chat__meta {
  @apply mt-1 text-[11px] leading-none opacity-60;
}

.support-chat__image-link {
  @apply mt-1 block overflow-hidden rounded-sm bg-canvas;
}

.support-chat__image {
  @apply block max-h-48 max-w-full object-contain;
}

.support-chat__file {
  @apply mt-1 inline-flex max-w-full items-center gap-1 truncate text-body-sm underline;
}

.support-chat__form {
  @apply mt-sm grid shrink-0 gap-2;
}

.support-chat__textarea {
  @apply w-full resize-y rounded-md border border-hairline bg-canvas px-md py-sm text-body-sm outline-none focus:border-primary;
}

.support-chat__attach {
  @apply inline-flex max-w-[240px] cursor-pointer items-center gap-2 text-body-sm text-charcoal;
}
</style>
