<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
import { EMPTY_DOC } from '~~/shared/types/instruction'
import { streamInstructionFromFile } from '~/composables/useInstructionStreaming'
import type { AiBlock } from '~~/server/utils/aiInstructionGenerator'

const route = useRoute()
const id = route.params.id as string
const api = useApi()
const { currentTenant, currentRole } = useAuthState()
const instructionKey = computed(() => `instruction-${currentTenant.value?.id ?? 'none'}-${id}`)

const { data, refresh, pending, error } = await useAsyncData(
  instructionKey,
  () => api<{ instruction: any }>(`/api/instructions/${id}`),
  {
    default: () => ({ instruction: null }),
    watch: [() => currentTenant.value?.id]
  }
)

const instr = computed(() => data.value?.instruction ?? null)
const title = ref('')
const slug = ref('')
const description = ref('')
const draft = ref<object>(EMPTY_DOC)
const saving = ref(false)
const lastSavedAt = ref<Date | null>(null)
const slugError = ref<string | null>(null)
const publishing = ref(false)

let saveTimer: any = null
let suppressAutosave = false
let hydratedInstructionId: string | null = null
let originalSlug = ''

function hydrateInstruction(next: any) {
  if (!next || hydratedInstructionId === next.id) return
  suppressAutosave = true
  hydratedInstructionId = next.id
  originalSlug = next.slug
  title.value = next.title
  slug.value = next.slug
  description.value = next.description ?? ''
  draft.value = next.draftContent ?? EMPTY_DOC
  nextTick(() => {
    suppressAutosave = false
  })
}

hydrateInstruction(instr.value)
watch(instr, hydrateInstruction)

function scheduleSave() {
  if (suppressAutosave) return
  if (!instr.value) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    saving.value = true; slugError.value = null
    try {
      // Only send slug if changed and looks valid — invalid slugs are rejected
      // server-side and we don't want to spam the user with errors mid-typing.
      const cleanSlug = slug.value.trim()
      const slugChanged = cleanSlug !== originalSlug
      const slugValid = /^[a-z0-9-]+$/.test(cleanSlug) && cleanSlug.length >= 1
      const body: any = {
        title: title.value,
        description: description.value,
        draftContent: draft.value
      }
      if (slugChanged && slugValid) body.slug = cleanSlug
      await api(`/api/instructions/${id}`, { method: 'PATCH', body })
      lastSavedAt.value = new Date()
      if (slugChanged && slugValid) originalSlug = cleanSlug
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

const publicUrl = computed(() => `/${currentTenant.value?.slug ?? ''}/${instr.value?.slug ?? slug.value}`)
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
const generationStatus = ref('')
const generationUsage = ref<any | null>(null)
const generationImages = ref({ extracted: 0, uploaded: 0 })

const generationUsageText = computed(() => {
  const u = generationUsage.value
  if (!u) return ''
  const cost = typeof u.estimatedCostUsd === 'number'
    ? ` · ≈ $${u.estimatedCostUsd.toFixed(u.estimatedCostUsd < 0.01 ? 4 : 3)}`
    : ''
  return `${formatNumber(u.totalTokens)} токенов${cost}`
})

function aiBlockToTipTapNode(b: AiBlock): any {
  switch (b.type) {
    case 'heading':
      return { type: 'heading', attrs: { level: b.level }, content: textToTipTapContent(b.text, b.links) }
    case 'paragraph':
      return { type: 'paragraph', content: textToTipTapContent(b.text, b.links) }
    case 'bullet_list':
      return {
        type: 'bulletList',
        content: b.items.map((it) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: textToTipTapContent(it, b.links) }]
        }))
      }
    case 'numbered_list':
      return {
        type: 'orderedList',
        content: b.items.map((it) => ({
          type: 'listItem',
          content: [{ type: 'paragraph', content: textToTipTapContent(it, b.links) }]
        }))
      }
    case 'task_list':
      return {
        type: 'taskList',
        content: b.taskItems.map((it) => ({
          type: 'taskItem',
          attrs: { checked: it.checked },
          content: [{ type: 'paragraph', content: textToTipTapContent(it.text, b.links) }]
        }))
      }
    case 'quote':
      return { type: 'blockquote', content: [{ type: 'paragraph', content: textToTipTapContent(b.text, b.links) }] }
    case 'code_block':
      return { type: 'codeBlock', attrs: b.codeLanguage ? { language: b.codeLanguage } : {}, content: b.text ? [{ type: 'text', text: b.text }] : [] }
    case 'table':
      return tableBlockToTipTapNode(b.rows, b.hasHeaderRow)
    case 'safety':
      return { type: 'safetyBlock', attrs: { severity: b.severity }, content: textToTipTapContent(b.text, b.links) }
    case 'image':
      return { type: 'image', attrs: { src: b.url, alt: b.description || '' } }
    case 'image_placeholder':
      return { type: 'safetyBlock', attrs: { severity: 'info' }, content: [{ type: 'text', text: `📷 ${b.description}` }] }
    case 'youtube':
      return { type: 'youtube', attrs: { src: b.url } }
  }
}

function tableBlockToTipTapNode(rows: string[][], hasHeaderRow: boolean): any {
  const width = Math.max(1, ...rows.map((row) => row.length))
  const normalizedRows = rows.length ? rows : [['']]

  return {
    type: 'table',
    content: normalizedRows.map((row, rowIndex) => ({
      type: 'tableRow',
      content: Array.from({ length: width }, (_, colIndex) => ({
        type: hasHeaderRow && rowIndex === 0 ? 'tableHeader' : 'tableCell',
        content: [
          {
            type: 'paragraph',
            content: row[colIndex] ? [{ type: 'text', text: row[colIndex] }] : []
          }
        ]
      }))
    }))
  }
}

function textToTipTapContent(text: string, links: Array<{ text: string; url: string }> = []): any[] {
  if (!text) return []

  const ranges = collectLinkRanges(text, links)
  const content: any[] = []
  let cursor = 0

  for (const range of ranges) {
    if (range.start > cursor) {
      content.push({ type: 'text', text: text.slice(cursor, range.start) })
    }
    content.push({
      type: 'text',
      text: text.slice(range.start, range.end),
      marks: [{ type: 'link', attrs: { href: range.url } }]
    })
    cursor = range.end
  }

  if (cursor < text.length) {
    content.push({ type: 'text', text: text.slice(cursor) })
  }

  return content
}

function collectLinkRanges(text: string, links: Array<{ text: string; url: string }>) {
  const ranges: Array<{ start: number; end: number; url: string }> = []

  for (const link of links) {
    const label = link.text.trim()
    const url = normalizeHref(link.url)
    if (!label || !url) continue

    const start = text.indexOf(label)
    if (start < 0) continue
    ranges.push({ start, end: start + label.length, url })
  }

  const urlRe = /\bhttps?:\/\/[^\s<>"')]+/gi
  for (const match of text.matchAll(urlRe)) {
    const rawUrl = match[0]
    const start = match.index ?? 0
    const end = start + rawUrl.length
    if (ranges.some((range) => overlaps(start, end, range.start, range.end))) continue
    ranges.push({ start, end, url: rawUrl })
  }

  return ranges
    .sort((a, b) => a.start - b.start)
    .filter((range, index, sorted) => index === 0 || range.start >= sorted[index - 1].end)
}

function normalizeHref(url: string) {
  const value = url.trim()
  if (!value) return ''
  if (/^(https?:|mailto:)/i.test(value)) return value
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`
  return value
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd
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
  generationStatus.value = 'Готовлю файл к чтению'
  generationUsage.value = null
  generationImages.value = { extracted: 0, uploaded: 0 }
  isStreaming.value = true
  suppressAutosave = true
  // Wipe editor — blocks will appear as they stream
  ed.commands.setContent({ type: 'doc', content: [] }, false)

  // Buffer streamed blocks and rebuild the whole doc on each new block.
  // Avoids the "nested-into-previous-list" bug from insertContent at cursor.
  const streamedNodes: any[] = []
  const browserUploadedImages: any[] = []
  let firstDonePayload: any = null
  let finalDonePayload: any = null

  const generationHandlers = {
    onMeta: (m: any) => {
      console.log('[gen] meta', m)
      if (m.title) title.value = m.title
      if (m.description !== undefined) description.value = m.description
    },
    onBlock: (b: AiBlock) => {
      console.log('[gen] block', b)
      streamedNodes.push(aiBlockToTipTapNode(b))
      ed.commands.setContent({ type: 'doc', content: streamedNodes }, false)
      generationStatus.value = `Пишу инструкцию: ${streamedNodes.length} блоков`
    },
    onProgress: (payload: any) => {
      console.log('[gen] progress', payload)
      updateGenerationStatus(payload)
    },
    onUsage: (payload: any) => {
      console.log('[gen] usage', payload)
      generationUsage.value = payload
      generationStatus.value = `Посчитано: ${formatNumber(payload.totalTokens)} токенов`
    },
    onError: (msg: string) => { console.error('[gen] error', msg); streamError.value = msg; generationStatus.value = 'Ошибка генерации' }
  }

  try {
    console.log('[gen] POSTing to /api/instructions/' + id + '/generate-stream')
    await streamInstructionFromFile(id, file, {
      ...generationHandlers,
      onExtractedImage: async (payload) => {
        console.log('[gen] extracted image for browser upload', {
          index: payload.index,
          page: payload.page,
          width: payload.width,
          height: payload.height,
          hash: payload.hash,
          sizeBytes: payload.sizeBytes
        })
        generationStatus.value = `Загружаю изображение ${payload.index}`
        const file = await fileFromDataUrl(payload.dataUrl, payload.filename, payload.mimeType)
        const uploaded = await uploadFile(file)
        browserUploadedImages.push({ ...payload, dataUrl: undefined, url: uploaded.url, assetId: uploaded.assetId })
        generationImages.value.uploaded = browserUploadedImages.length
        generationStatus.value = `Загружено изображений: ${browserUploadedImages.length}`
        console.log('[gen] browser image uploaded', {
          index: payload.index,
          page: payload.page,
          url: uploaded.url,
          assetId: uploaded.assetId
        })
      },
      onDone: (payload) => {
        firstDonePayload = payload
        console.log('[gen] done', { ...payload, browserUploadedImages })
      }
    })

    if (firstDonePayload?.browserUploadRequired && browserUploadedImages.length) {
      const imageLibrary = browserUploadedImages.map((img) => ({
        index: img.index,
        url: img.url,
        page: img.page,
        width: img.width,
        height: img.height,
        hash: img.hash
      }))
      console.log('[gen] starting AI stream with browser-uploaded images', {
        count: imageLibrary.length,
        images: imageLibrary
      })
      generationStatus.value = `Запускаю ИИ с изображениями: ${imageLibrary.length}`
      await streamInstructionFromFile(
        id,
        file,
        {
          ...generationHandlers,
          onDone: (payload) => {
            finalDonePayload = payload
            console.log('[gen] done with AI', { ...payload, browserUploadedImages })
          }
        },
        undefined,
        { imageLibrary }
      )
    } else {
      finalDonePayload = firstDonePayload
    }

    // Editor content matches what server already persisted; refresh from DB so
    // we have a consistent view (versions, etc).
    await refresh()
    draft.value = ed.getJSON()
    console.log('[gen] final payload', finalDonePayload)
    if (generationUsage.value) {
      generationStatus.value = 'Генерация завершена'
    }
  } finally {
    isStreaming.value = false
    suppressAutosave = false
  }
}

function updateGenerationStatus(payload: any) {
  switch (payload?.stage) {
    case 'extracting-images':
      generationStatus.value = 'Извлекаю изображения из PDF'
      break
    case 'extracting-images-progress':
      generationImages.value.extracted = payload.found ?? generationImages.value.extracted
      generationStatus.value = payload.page
        ? `Извлекаю изображения: страница ${payload.page} из ${payload.pages}, найдено ${payload.found ?? 0}`
        : `Извлекаю изображения: найдено страниц ${payload.pages ?? '...'}`
      break
    case 'images-extracted':
      generationImages.value.extracted = payload.count ?? 0
      generationStatus.value = `Найдено изображений: ${payload.count ?? 0}`
      break
    case 'image-library-provided':
      generationStatus.value = `Передаю ИИ изображения: ${payload.count ?? 0}`
      break
    case 'images-extract-failed':
      generationStatus.value = 'Не удалось извлечь изображения'
      break
    default:
      if (!generationUsage.value) generationStatus.value = 'ИИ читает файл и пишет инструкцию'
  }
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU').format(value || 0)
}

async function fileFromDataUrl(dataUrl: string, filename: string, mimeType: string): Promise<File> {
  const blob = await fetch(dataUrl).then((res) => res.blob())
  return new File([blob], filename, { type: mimeType || blob.type || 'application/octet-stream' })
}
</script>

<template>
  <div class="space-y-xl">
    <UiCard v-if="(pending || !currentTenant) && !instr">
      <p class="py-md text-body text-steel">Загружаю инструкцию…</p>
    </UiCard>
    <UiAlert v-else-if="error && !instr" kind="error" title="Не удалось загрузить инструкцию">
      Проверьте подключение и обновите страницу.
    </UiAlert>

    <template v-else-if="instr">
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
          <span v-if="isStreaming">{{ generationStatus || 'ИИ генерирует…' }}</span>
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

    <div v-if="isStreaming || streamError || generationUsage" class="flex items-center gap-2">
      <span v-if="isStreaming" class="flex items-center gap-2 text-caption-bold text-primary">
        <span class="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
        {{ generationStatus || 'ИИ читает файл и пишет инструкцию…' }}
      </span>
      <span v-if="generationUsageText" class="text-caption text-steel">
        {{ generationUsageText }}
      </span>
      <span v-else-if="generationImages.extracted" class="text-caption text-steel">
        Изображения: {{ generationImages.uploaded }}/{{ generationImages.extracted }}
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
    </template>
  </div>
</template>
