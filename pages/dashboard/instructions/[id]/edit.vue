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
const productBarcode = ref('')
const draft = ref<object>(EMPTY_DOC)
const saving = ref(false)
const lastSavedAt = ref<Date | null>(null)
const slugError = ref<string | null>(null)
const saveError = ref<string | null>(null)
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
  productBarcode.value = next.productBarcode ?? ''
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
    saveError.value = null
    try {
      // Only send slug if changed and looks valid — invalid slugs are rejected
      // server-side and we don't want to spam the user with errors mid-typing.
      const cleanSlug = slug.value.trim()
      const slugChanged = cleanSlug !== originalSlug
      const slugValid = /^[a-z0-9-]+$/.test(cleanSlug) && cleanSlug.length >= 1
      const body: any = {
        title: title.value,
        description: description.value,
        productBarcode: productBarcode.value.trim() || null,
        draftContent: draft.value
      }
      if (slugChanged && slugValid) body.slug = cleanSlug
      await api(`/api/instructions/${id}`, { method: 'PATCH', body })
      lastSavedAt.value = new Date()
      if (slugChanged && slugValid) originalSlug = cleanSlug
    } catch (e: any) {
      const msg = e?.data?.statusMessage ?? 'Ошибка сохранения'
      if (msg.toLowerCase().includes('slug')) slugError.value = msg
      else saveError.value = msg
    } finally { saving.value = false }
  }, 800)
}

watch([title, slug, description, productBarcode, draft], scheduleSave, { deep: true })

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
  editorInstance.value = ed
}

const isStreaming = ref(false)
const streamError = ref<string | null>(null)
const generationStatus = ref('')
const generationUsage = ref<any | null>(null)
const generationImages = ref({ extracted: 0, uploaded: 0 })
const generationAbortController = shallowRef<AbortController | null>(null)
const isCancellingGeneration = ref(false)
const generationOverlayTitleId = useId()
let generationScrollFrame: number | null = null

const generationUsageText = computed(() => {
  const u = generationUsage.value
  if (!u) return ''
  const cost = typeof u.estimatedCostUsd === 'number'
    ? ` · ≈ $${u.estimatedCostUsd.toFixed(u.estimatedCostUsd < 0.01 ? 4 : 3)}`
    : ''
  return `${formatNumber(u.totalTokens)} токенов${cost}`
})

const generationOverlayDetails = computed(() => {
  if (generationUsageText.value) return generationUsageText.value
  if (generationImages.value.extracted) {
    return `Изображения: ${generationImages.value.uploaded}/${generationImages.value.extracted}`
  }
  return 'Страница заблокирована до завершения процесса'
})

function cancelGeneration() {
  if (!isStreaming.value) return
  isCancellingGeneration.value = true
  generationStatus.value = 'Прерываю процесс…'
  generationAbortController.value?.abort()
}

onBeforeUnmount(() => {
  if (import.meta.client && generationScrollFrame !== null) window.cancelAnimationFrame(generationScrollFrame)
})

function aiBlockToTipTapNode(
  b: AiBlock,
  imageDimensions: Map<string, { width: number; height: number }> = new Map()
): any {
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
    case 'image': {
      const dimensions = imageDimensions.get(b.url)
      return {
        type: 'image',
        attrs: {
          src: b.url,
          alt: b.description || '',
          intrinsicWidth: dimensions?.width ?? null,
          intrinsicHeight: dimensions?.height ?? null
        }
      }
    }
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

const genModalOpen = ref(false)

async function onGenerateSubmit(payload: { files: File[]; prompt: string }) {
  if (!payload.files.length && !payload.prompt.trim()) return
  if (isStreaming.value) return
  if (!isEditorEmpty()) {
    if (!confirm('Содержимое будет заменено результатом ИИ. Продолжить?')) return
  }
  genModalOpen.value = false
  await runStream(payload.files, payload.prompt)
}

function isEditorEmpty(): boolean {
  const ed = editorInstance.value
  if (!ed) return true
  const json = ed.getJSON()
  return !json.content || json.content.length === 0 ||
    (json.content.length === 1 && json.content[0].type === 'paragraph' && !json.content[0].content?.length)
}

async function runStream(files: File[], userPrompt: string) {
  const ed = editorInstance.value
  if (!ed) return
  const abortController = new AbortController()
  generationAbortController.value = abortController
  isCancellingGeneration.value = false
  streamError.value = null
  generationStatus.value = files.length === 0
    ? 'Генерирую инструкцию по описанию'
    : files.length > 1
      ? `Готовлю ${files.length} файлов к чтению`
      : 'Готовлю файл к чтению'
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
  const imageDimensions = new Map<string, { width: number; height: number }>()
  let firstDonePayload: any = null
  let finalDonePayload: any = null

  // ── Pre-upload user-attached image files to S3 so AI can reference them
  // by URL. PDF-embedded images are extracted server-side and uploaded later.
  type LibEntry = { index: number; url: string; page: number; width: number; height: number; hash?: string }
  const userImageLibrary: LibEntry[] = []
  const userImageFiles = files.filter((f) => !isPdfFile(f))
  try {
    for (const imageFile of userImageFiles) {
      if (abortController.signal.aborted) throw createGenerationAbortError()
      const userIndex = userImageLibrary.length + 1
      generationStatus.value = userImageFiles.length > 1
        ? `Загружаю иллюстрацию ${userIndex} из ${userImageFiles.length}`
        : 'Загружаю иллюстрацию'
      const dim = await readImageDimensions(imageFile)
      const uploaded = await uploadFile(imageFile, undefined, { signal: abortController.signal })
      userImageLibrary.push({
        index: userIndex,
        url: uploaded.url,
        page: 0,
        width: dim.width,
        height: dim.height
      })
      imageDimensions.set(uploaded.url, { width: dim.width, height: dim.height })
    }
  } catch (e: any) {
    if (isGenerationAbortError(e)) {
      streamError.value = null
      generationStatus.value = 'Процесс прерван'
      isStreaming.value = false
      isCancellingGeneration.value = false
      generationAbortController.value = null
      suppressAutosave = false
      return
    }
    console.error('[gen] user image upload failed', e)
    streamError.value = e?.message || 'Не удалось загрузить иллюстрации'
    generationStatus.value = 'Ошибка загрузки иллюстраций'
    isStreaming.value = false
    isCancellingGeneration.value = false
    generationAbortController.value = null
    suppressAutosave = false
    return
  }

  const generationHandlers = {
    onMeta: (m: any) => {
      if (m.title) title.value = m.title
      if (m.description !== undefined) description.value = m.description
    },
    onBlock: (b: AiBlock) => {
      const node = aiBlockToTipTapNode(b, imageDimensions)
      streamedNodes.push(node)
      appendNodeToEditor(ed, node)
      scrollGenerationToEnd()
      generationStatus.value = `Пишу инструкцию: ${streamedNodes.length} блоков`
    },
    onProgress: (payload: any) => {
      updateGenerationStatus(payload)
    },
    onUsage: (payload: any) => {
      generationUsage.value = payload
      generationStatus.value = `Посчитано: ${formatNumber(payload.totalTokens)} токенов`
    },
    onError: (msg: string) => { streamError.value = msg; generationStatus.value = 'Ошибка генерации' }
  }

  try {
    await streamInstructionFromFile(id, files, {
      ...generationHandlers,
      onExtractedImage: async (payload) => {
        generationStatus.value = `Загружаю изображение ${payload.index}`
        const file = await fileFromDataUrl(payload.dataUrl, payload.filename, payload.mimeType, abortController.signal)
        const uploaded = await uploadFile(file, undefined, { signal: abortController.signal })
        browserUploadedImages.push({ ...payload, dataUrl: undefined, url: uploaded.url, assetId: uploaded.assetId })
        imageDimensions.set(uploaded.url, { width: payload.width, height: payload.height })
        generationImages.value.uploaded = browserUploadedImages.length
        generationStatus.value = `Загружено изображений: ${browserUploadedImages.length}`
      },
      onDone: (payload) => {
        firstDonePayload = payload
      }
    }, abortController.signal, {
      userPrompt,
      imageLibrary: userImageLibrary.length ? userImageLibrary : undefined
    })

    if (firstDonePayload?.browserUploadRequired && browserUploadedImages.length) {
      if (abortController.signal.aborted) throw createGenerationAbortError()
      // Combine pre-uploaded user images with PDF-extracted images. Renumber
      // indices so each library entry is uniquely identifiable in the prompt.
      const combinedLibrary: LibEntry[] = [
        ...userImageLibrary.map((img, i) => ({ ...img, index: i + 1 })),
        ...browserUploadedImages.map((img, i) => ({
          index: userImageLibrary.length + i + 1,
          url: img.url,
          page: img.page,
          width: img.width,
          height: img.height,
          hash: img.hash
        }))
      ]
      generationStatus.value = `Запускаю ИИ с изображениями: ${combinedLibrary.length}`
      await streamInstructionFromFile(
        id,
        files,
        {
          ...generationHandlers,
          onDone: (payload) => {
            finalDonePayload = payload
          }
        },
        abortController.signal,
        { imageLibrary: combinedLibrary, userPrompt, skipExtraction: true }
      )
    } else {
      finalDonePayload = firstDonePayload
    }

    // Editor content matches what server already persisted; refresh from DB so
    // we have a consistent view (versions, etc).
    await refresh()
    draft.value = ed.getJSON()
    if (generationUsage.value) {
      generationStatus.value = 'Генерация завершена'
    }
  } catch (e: any) {
    if (isGenerationAbortError(e)) {
      streamError.value = null
      generationStatus.value = 'Процесс прерван'
      draft.value = ed.getJSON()
      return
    }
    console.error('[gen] failed', e?.message || e)
    streamError.value = e?.message || 'Ошибка генерации'
    generationStatus.value = 'Ошибка генерации'
  } finally {
    isStreaming.value = false
    isCancellingGeneration.value = false
    if (generationAbortController.value === abortController) {
      generationAbortController.value = null
    }
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

function appendNodeToEditor(ed: any, node: any) {
  ed.chain()
    .insertContentAt(ed.state.doc.content.size, node, { updateSelection: false })
    .run()
}

async function scrollGenerationToEnd() {
  if (!import.meta.client) return
  await nextTick()
  if (generationScrollFrame !== null) window.cancelAnimationFrame(generationScrollFrame)
  generationScrollFrame = window.requestAnimationFrame(() => {
    generationScrollFrame = null
    const editorEl = document.querySelector('.tiptap.ProseMirror')
    const target = editorEl?.lastElementChild as HTMLElement | null
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'end' })
    } else {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
    }
  })
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ru-RU').format(value || 0)
}

async function fileFromDataUrl(dataUrl: string, filename: string, mimeType: string, signal?: AbortSignal): Promise<File> {
  const blob = await fetch(dataUrl, { signal }).then((res) => res.blob())
  return new File([blob], filename, { type: mimeType || blob.type || 'application/octet-stream' })
}

function isPdfFile(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (!import.meta.client) { resolve({ width: 0, height: 0 }); return }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ width: 0, height: 0 })
    }
    img.src = url
  })
}

function createGenerationAbortError() {
  if (typeof DOMException !== 'undefined') return new DOMException('Generation aborted', 'AbortError')
  const error = new Error('Generation aborted')
  error.name = 'AbortError'
  return error
}

function isGenerationAbortError(error: any) {
  return error?.name === 'AbortError'
}
</script>

<template>
  <div>
    <UiCard v-if="(pending || !currentTenant) && !instr">
      <p class="py-md text-body text-steel">Загружаю инструкцию…</p>
    </UiCard>
    <UiAlert v-else-if="error && !instr" kind="error" title="Не удалось загрузить инструкцию">
      Проверьте подключение и обновите страницу.
    </UiAlert>

    <template v-else-if="instr">
    <!-- Header-row: иконка + title-input + actions. Выровнен с brand-row
         сайдбара (min-h-16 + items-center). На мобиле icon+title сдвинуты
         вправо через pl-[52px], чтобы не пересекаться с кнопкой-гамбургером. -->
    <div class="flex min-h-16 items-center justify-between gap-md">
      <div class="flex min-w-0 flex-1 items-center gap-3 pl-[52px] md:pl-0">
        <Icon name="lucide:file-text" class="h-6 w-6 shrink-0 text-navy opacity-50" />
        <input
          v-model="title"
          class="-mx-2 block w-full rounded-md bg-transparent px-2 py-1 text-h3 text-navy outline-none transition-colors hover:bg-surface focus:bg-surface focus:ring-2 focus:ring-primary/15"
          placeholder="Название инструкции"
        >
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <span class="hidden text-caption text-steel md:inline">
          <span v-if="saving">Сохранение…</span>
          <span v-else-if="lastSavedAt">Сохранено {{ lastSavedAt.toLocaleTimeString() }}</span>
        </span>

        <!-- AI fill-from-file: primary blue gradient with subtle glow -->
        <button
          type="button"
          :class="[
            'group relative inline-flex h-10 items-center gap-2 rounded-lg px-[18px] text-body-sm-md font-medium text-white transition-all',
            'bg-gradient-to-r from-primary via-brand-purple to-brand-pink',
            'shadow-[0_2px_12px_-2px_rgba(12,63,233,0.45)]',
            'hover:shadow-[0_4px_20px_-2px_rgba(12,63,233,0.65)] hover:brightness-110',
            'disabled:cursor-not-allowed disabled:opacity-60'
          ]"
          :disabled="isStreaming"
          @click="genModalOpen = true"
        >
          <Icon
            name="lucide:sparkles"
            class="h-4 w-4 transition-transform group-hover:scale-110"
          />
          Заполнить из файла
        </button>

        <!-- Share popover: status, URL editing, publish, open, copy link -->
        <div ref="shareRef" class="relative">
          <UiButton
            variant="secondary"
            :disabled="isStreaming"
            @click="shareOpen = !shareOpen"
          >
            <Icon name="lucide:share-2" class="h-4 w-4" />
            Поделиться
            <Icon :name="shareOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="h-3.5 w-3.5" />
          </UiButton>

          <div
            v-if="shareOpen"
            v-keep-in-viewport
            class="popover-menu absolute right-0 top-full z-30 mt-2 w-[420px] rounded-xl p-md"
          >
            <!-- Status header -->
            <div class="flex items-center justify-between gap-md">
              <div>
                <p class="text-caption-bold uppercase tracking-wide text-steel">Статус</p>
                <div class="mt-1.5 flex items-center gap-2">
                  <UiBadge :variant="instr.status === 'PUBLISHED' ? 'tag-green' : instr.status === 'ARCHIVED' ? 'tag-orange' : 'tag-gray'">
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

            <hr class="my-md border-hairline-soft">

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

            <hr class="my-md border-hairline-soft">

            <!-- Штрих-код товара — нужен для авто-привязки свободного QR. -->
            <UiInput
              v-model="productBarcode"
              label="ШК товара"
              placeholder="Например 4601234567890"
              hint="По этому коду свободный QR привяжется к инструкции"
            />

            <hr class="my-md border-hairline-soft">

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

    <UiAlert v-if="instr.status === 'ARCHIVED'" kind="warning" title="Инструкция в архиве" class="mt-md">
      Публичная страница не открывается. Данные и ссылки сохранены.
      <button class="ml-2 underline" @click="unarchive">Восстановить</button>
    </UiAlert>
    <UiAlert v-if="saveError" kind="error" class="mt-md">{{ saveError }}</UiAlert>

    <div v-if="streamError || generationUsage" class="mt-md flex items-center gap-2">
      <span v-if="generationUsageText" class="text-caption text-steel">
        {{ generationUsageText }}
      </span>
      <span v-else-if="generationImages.extracted" class="text-caption text-steel">
        Изображения: {{ generationImages.uploaded }}/{{ generationImages.extracted }}
      </span>
    </div>
    <UiAlert v-if="streamError" kind="error" class="mt-md">{{ streamError }}</UiAlert>

    <div class="mt-sm space-y-xl">
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
    </div>
    </template>

    <GenerateFromFilesModal
      v-model:open="genModalOpen"
      :busy="isStreaming"
      @submit="onGenerateSubmit"
    />

    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="isStreaming"
          class="fixed inset-0 z-[190] flex items-center justify-center bg-canvas/60 p-md backdrop-blur-[2px]"
        >
          <section
            class="w-full max-w-md rounded-lg border border-hairline bg-canvas p-lg shadow-modal"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="generationOverlayTitleId"
          >
            <div class="flex items-start gap-md">
              <div class="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon name="lucide:sparkles" class="h-5 w-5 animate-pulse" />
              </div>
              <div class="min-w-0 flex-1">
                <p :id="generationOverlayTitleId" class="text-caption-bold uppercase tracking-wide text-steel">
                  {{ isCancellingGeneration ? 'Останавливаю' : 'Заполняю инструкцию' }}
                </p>
                <p class="mt-1 text-body-sm-md text-ink" aria-live="polite">
                  {{ generationStatus || 'ИИ читает файл и пишет инструкцию…' }}
                </p>
                <p class="mt-1 text-caption text-steel">
                  {{ generationOverlayDetails }}
                </p>
              </div>
            </div>

            <div class="mt-md h-1.5 overflow-hidden rounded-full bg-surface">
              <div class="h-full w-1/2 animate-pulse rounded-full bg-primary" />
            </div>

            <div class="mt-lg flex justify-end">
              <UiButton
                variant="secondary"
                size="sm"
                :disabled="isCancellingGeneration"
                @click="cancelGeneration"
              >
                <Icon name="lucide:x" class="h-4 w-4" />
                {{ isCancellingGeneration ? 'Прерываю…' : 'Прервать' }}
              </UiButton>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
