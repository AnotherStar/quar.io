<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
import { EMPTY_DOC } from '~~/shared/types/instruction'
import { streamInstructionFromFile } from '~/composables/useInstructionStreaming'
import type { AiBlock } from '~~/server/utils/aiInstructionGenerator'

const route = useRoute()
const id = route.params.id as string
const api = useApi()
const { currentTenant, currentRole } = useAuthState()

const { data, refresh } = await useAsyncData(`instruction-${id}`, () => api<{ instruction: any }>(`/api/instructions/${id}`))

// Snapshot of the initial fetch — kept around so the page survives transient
// data.value=null states (HMR, refetches, slow navigations) without throwing.
const initial = data.value?.instruction
if (!initial) {
  throw createError({ statusCode: 404, statusMessage: 'Инструкция не найдена', fatal: true })
}
const instr = computed(() => data.value?.instruction ?? initial)

const title = ref(initial.title)
const slug = ref(initial.slug)
const description = ref(initial.description ?? '')
const draft = ref<object>(initial.draftContent ?? EMPTY_DOC)
const saving = ref(false)
const lastSavedAt = ref<Date | null>(null)
const slugError = ref<string | null>(null)
const publishing = ref(false)

let saveTimer: any = null
let suppressAutosave = false

function scheduleSave() {
  if (suppressAutosave) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    saving.value = true; slugError.value = null
    try {
      // Only send slug if changed and looks valid — invalid slugs are rejected
      // server-side and we don't want to spam the user with errors mid-typing.
      const cleanSlug = slug.value.trim()
      const slugChanged = cleanSlug !== initial.slug
      const slugValid = /^[a-z0-9-]+$/.test(cleanSlug) && cleanSlug.length >= 1
      const body: any = {
        title: title.value,
        description: description.value,
        draftContent: draft.value
      }
      if (slugChanged && slugValid) body.slug = cleanSlug
      await api(`/api/instructions/${id}`, { method: 'PATCH', body })
      lastSavedAt.value = new Date()
      if (slugChanged && slugValid) initial.slug = cleanSlug
    } catch (e: any) {
      const msg = e?.data?.statusMessage ?? 'Ошибка сохранения'
      if (msg.toLowerCase().includes('slug')) slugError.value = msg
    } finally { saving.value = false }
  }, 800)
}

watch([title, slug, description, draft], scheduleSave, { deep: true })

async function publish() {
  publishing.value = true
  try {
    await api(`/api/instructions/${id}/publish`, { method: 'POST' })
    await refresh()
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? 'Не удалось опубликовать')
  } finally { publishing.value = false }
}

async function unarchive() {
  await api(`/api/instructions/${id}/unarchive`, { method: 'POST' }).catch((e: any) => {
    alert(e?.data?.statusMessage ?? 'Не удалось восстановить')
  })
  await refresh()
}

const publicUrl = computed(() => `/${currentTenant.value?.slug}/${instr.value.slug}`)
const fullPublicUrl = computed(() => {
  const cfg = useRuntimeConfig().public
  return `${cfg.appUrl}${publicUrl.value}`
})

// Share popover. Copy/QR live inside UiCopyableUrl — no helpers needed here.
const shareOpen = ref(false)
const shareRef = ref<HTMLElement | null>(null)
onClickOutside(shareRef, () => { shareOpen.value = false })

// ---- AI streaming generation ("Заполнить из файла") ---------------------
// editorInstance is set when InstructionEditor emits @ready — that's more
// reliable than template refs through <ClientOnly>.
const editorInstance = shallowRef<any>(null)
function onEditorReady(ed: any) {
  console.log('[gen] editor ready', !!ed)
  editorInstance.value = ed
}

const isStreaming = ref(false)
const streamError = ref<string | null>(null)

function aiBlockToTipTapNode(b: AiBlock): any {
  switch (b.type) {
    case 'heading':
      return { type: 'heading', attrs: { level: b.level }, content: [{ type: 'text', text: b.text }] }
    case 'paragraph':
      return { type: 'paragraph', content: b.text ? [{ type: 'text', text: b.text }] : [] }
    case 'bullet_list':
      return {
        type: 'bulletList',
        content: b.items.map((it) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: it }] }]
        }))
      }
    case 'numbered_list':
      return {
        type: 'orderedList',
        content: b.items.map((it) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: it }] }]
        }))
      }
    case 'safety':
      return { type: 'safetyBlock', attrs: { severity: b.severity }, content: [{ type: 'text', text: b.text }] }
    case 'image':
      return { type: 'image', attrs: { src: b.url, alt: b.description || '' } }
    case 'image_placeholder':
      return { type: 'safetyBlock', attrs: { severity: 'info' }, content: [{ type: 'text', text: `📷 ${b.description}` }] }
  }
}

// Native <input type="file"> + <label> approach — most reliable across
// browsers and avoids programmatic input.click() which is sometimes blocked.
const fileInputRef = ref<HTMLInputElement | null>(null)

async function handleFileSelected(e: Event) {
  console.log('[gen] handleFileSelected fired', e)
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  console.log('[gen] file:', file?.name, file?.size, file?.type)
  input.value = ''
  if (!file) { console.log('[gen] no file picked'); return }
  if (isStreaming.value) { console.log('[gen] already streaming, abort'); return }
  if (!isEditorEmpty()) {
    if (!confirm('Содержимое будет заменено результатом ИИ. Продолжить?')) {
      console.log('[gen] user cancelled overwrite')
      return
    }
  }
  console.log('[gen] starting stream')
  await runStream(file)
}

function isEditorEmpty(): boolean {
  const ed = editorInstance.value
  if (!ed) return true
  const json = ed.getJSON()
  return !json.content || json.content.length === 0 ||
    (json.content.length === 1 && json.content[0].type === 'paragraph' && !json.content[0].content?.length)
}

async function runStream(file: File) {
  console.log('[gen] runStream entered, getting editor')
  const ed = editorInstance.value
  console.log('[gen] editor instance:', ed)
  if (!ed) { console.warn('[gen] no editor instance — aborting'); return }
  streamError.value = null
  isStreaming.value = true
  suppressAutosave = true
  // Wipe editor — blocks will appear as they stream
  ed.commands.setContent({ type: 'doc', content: [] }, false)

  // Buffer streamed blocks and rebuild the whole doc on each new block.
  // Avoids the "nested-into-previous-list" bug from insertContent at cursor.
  const streamedNodes: any[] = []
  try {
    console.log('[gen] POSTing to /api/instructions/' + id + '/generate-stream')
    await streamInstructionFromFile(id, file, {
      onMeta: (m) => { console.log('[gen] meta', m); if (m.title) title.value = m.title; if (m.description !== undefined) description.value = m.description },
      onBlock: (b) => {
        console.log('[gen] block', b)
        streamedNodes.push(aiBlockToTipTapNode(b))
        ed.commands.setContent({ type: 'doc', content: streamedNodes }, false)
      },
      onError: (msg) => { console.error('[gen] error', msg); streamError.value = msg },
      onDone: () => { console.log('[gen] done') }
    })
    // Editor content matches what server already persisted; refresh from DB so
    // we have a consistent view (versions, etc).
    await refresh()
    draft.value = ed.getJSON()
  } finally {
    isStreaming.value = false
    suppressAutosave = false
  }
}
</script>

<template>
  <div class="space-y-xl">
    <div class="flex items-center justify-between gap-md">
      <div class="min-w-0 flex-1">
        <input
          v-model="title"
          class="block w-full rounded-md bg-transparent px-2 py-1 -mx-2 text-h3 text-ink outline-none transition-colors hover:bg-surface focus:bg-surface focus:ring-2 focus:ring-primary/30"
          placeholder="Название инструкции"
        >
      </div>
      <div class="flex items-center gap-2">
        <span class="text-caption text-steel">
          <span v-if="isStreaming">ИИ генерирует…</span>
          <span v-else-if="saving">Сохранение…</span>
          <span v-else-if="lastSavedAt">Сохранено {{ lastSavedAt.toLocaleTimeString() }}</span>
        </span>

        <!-- AI fill-from-file: primary purple gradient with subtle glow -->
        <label
          :class="[
            'group relative inline-flex cursor-pointer items-center gap-2 rounded-md px-md py-sm text-body-sm-md font-medium text-white transition-all',
            'bg-gradient-to-r from-primary via-brand-purple to-brand-pink',
            'shadow-[0_2px_12px_-2px_rgba(86,69,212,0.45)]',
            'hover:shadow-[0_4px_20px_-2px_rgba(86,69,212,0.65)] hover:brightness-110',
            isStreaming && 'pointer-events-none opacity-60'
          ]"
        >
          <Icon
            name="lucide:sparkles"
            class="h-4 w-4 transition-transform group-hover:scale-110"
          />
          Заполнить из файла
          <input
            ref="fileInputRef"
            type="file"
            accept="application/pdf,image/*"
            class="hidden"
            :disabled="isStreaming"
            @change="handleFileSelected"
          >
        </label>

        <!-- Share popover: status, URL editing, publish, open, copy link -->
        <div ref="shareRef" class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-md border border-hairline-strong bg-canvas px-md py-sm text-body-sm-md text-charcoal transition-colors hover:bg-surface disabled:opacity-50"
            :disabled="isStreaming"
            @click="shareOpen = !shareOpen"
          >
            <Icon name="lucide:share-2" class="h-4 w-4 text-steel" />
            Поделиться
            <Icon :name="shareOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3.5 w-3.5 text-steel" />
          </button>

          <div
            v-if="shareOpen"
            class="absolute right-0 top-full z-30 mt-2 w-[420px] rounded-lg border border-hairline bg-canvas p-md shadow-modal"
          >
            <!-- Status header -->
            <div class="flex items-center justify-between gap-md">
              <div>
                <p class="text-caption text-steel uppercase tracking-wide">Статус</p>
                <div class="mt-1 flex items-center gap-2">
                  <UiBadge :variant="instr.status === 'PUBLISHED' ? 'tag-green' : instr.status === 'ARCHIVED' ? 'tag-orange' : 'tag-purple'">
                    {{ instr.status === 'PUBLISHED' ? 'Опубликована' : instr.status === 'ARCHIVED' ? 'В архиве' : 'Черновик' }}
                  </UiBadge>
                  <span v-if="instr.publishedAt" class="text-caption text-steel">
                    {{ new Date(instr.publishedAt).toLocaleDateString() }}
                  </span>
                </div>
              </div>
              <UiButton variant="secondary" size="sm" :to="publicUrl" target="_blank">
                <Icon name="lucide:external-link" class="h-3.5 w-3.5" />
                Открыть
              </UiButton>
            </div>

            <hr class="my-md border-hairline">

            <!-- URL editor -->
            <UiInput
              v-model="slug"
              label="Ссылка инструкции"
              :prefix="`${currentTenant?.slug}/`"
              hint="Латиница, цифры, дефис"
              :error="slugError ?? undefined"
            />

            <!-- Public link: copy + QR download. Self-contained, see UiCopyableUrl. -->
            <UiCopyableUrl class="mt-sm" :url="fullPublicUrl" :qr-filename="`${currentTenant?.slug}-${slug}`" />

            <hr class="my-md border-hairline">

            <!-- Publish action -->
            <UiButton
              variant="primary"
              block
              :loading="publishing"
              :disabled="isStreaming || instr.status === 'ARCHIVED'"
              @click="publish"
            >
              <Icon name="lucide:rocket" class="h-4 w-4" />
              {{ instr.status === 'PUBLISHED' ? 'Опубликовать новую версию' : 'Опубликовать' }}
            </UiButton>

            <p v-if="instr.status === 'PUBLISHED'" class="mt-sm text-caption text-steel">
              Текущая версия зафиксирована и продолжит работать по этой ссылке. Новая публикация создаст ещё одну неизменяемую версию.
            </p>
          </div>
        </div>
      </div>
    </div>

    <UiAlert v-if="instr.status === 'ARCHIVED'" kind="warning" title="Инструкция в архиве">
      Публичная страница не открывается. Данные и ссылки сохранены.
      <button class="ml-2 underline" @click="unarchive">Восстановить</button>
    </UiAlert>

    <div v-if="isStreaming || streamError" class="flex items-center gap-2">
      <span v-if="isStreaming" class="flex items-center gap-2 text-caption-bold text-primary">
        <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
        ИИ читает файл и пишет инструкцию…
      </span>
    </div>
    <UiAlert v-if="streamError" kind="error">{{ streamError }}</UiAlert>

    <UiCard class="p-lg">
      <ClientOnly>
        <InstructionEditor
          v-model="draft"
          placeholder="Введите «/» для команд или «Заполнить из файла»..."
          @ready="onEditorReady"
        />
        <template #fallback>
          <div class="min-h-[400px] animate-pulse rounded-md bg-surface" />
        </template>
      </ClientOnly>
    </UiCard>
  </div>
</template>
