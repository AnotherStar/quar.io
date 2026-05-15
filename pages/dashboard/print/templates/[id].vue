<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

import { uploadFile } from '~~/composables/useMediaUpload'

const api = useApi()
const router = useRouter()
const route = useRoute()

// Режим: 'new' → создание, иначе → редактирование шаблона по id.
// Маршрут один файл [id].vue: /templates/new и /templates/<cuid>.
const templateId = computed(() => String(route.params.id ?? 'new'))
const isEdit = computed(() => templateId.value !== 'new')

const name = ref('Новый стикер')
const widthMm = ref(50)
const heightMm = ref(50)
const backgroundUrl = ref<string | null>(null)
const backgroundMimeType = ref<string | null>(null)
const backgroundWidthPx = ref(0)
const backgroundHeightPx = ref(0)
const backgroundXmm = ref(0)
const backgroundYmm = ref(0)
const backgroundWidthMm = ref(50)
const backgroundHeightMm = ref(50)
const fileInput = ref<HTMLInputElement | null>(null)

const qrXmm = ref(5)
const qrYmm = ref(5)
const qrSizeMm = ref(40)
const qrDarkColor = ref('#000000')
const qrLightColor = ref('#ffffff')
const qrLightTransparent = ref(false)
const qrDataUrl = ref('')

const prompt = ref('Яркий стикер для QR-кода на упаковку, место справа под QR, белая подложка, дружелюбный стиль')
const generating = ref(false)
const uploading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const selectedLayer = ref<'background' | 'qr' | null>(null)
const stageHovered = ref(false)
const dragging = ref(false)
const showOverlay = computed(() => stageHovered.value || dragging.value)

const zoomOuterRef = ref<HTMLElement | null>(null)
const workspaceRef = ref<HTMLElement | null>(null)
const zoom = ref(1)
let zoomObserver: ResizeObserver | null = null

function updateZoom() {
  const outer = zoomOuterRef.value
  const ws = workspaceRef.value
  if (!outer || !ws) return
  const aw = outer.clientWidth
  const ah = outer.clientHeight
  const nw = ws.offsetWidth
  const nh = ws.offsetHeight
  if (!nw || !nh || !aw || !ah) return
  zoom.value = Math.min(1, aw / nw, ah / nh)
}

const dpiX = computed(() => backgroundWidthPx.value / (backgroundWidthMm.value / 25.4))
const dpiY = computed(() => backgroundHeightPx.value / (backgroundHeightMm.value / 25.4))
const effectiveDpi = computed(() => Math.floor(Math.min(dpiX.value || 0, dpiY.value || 0)))
const dpiWarning = computed(() => backgroundUrl.value && effectiveDpi.value > 0 && effectiveDpi.value < 300)
const canSave = computed(() =>
  !!backgroundUrl.value &&
  !!name.value.trim() &&
  qrSizeMm.value >= 8 &&
  qrXmm.value >= 0 &&
  qrYmm.value >= 0 &&
  qrXmm.value + qrSizeMm.value <= widthMm.value &&
  qrYmm.value + qrSizeMm.value <= heightMm.value &&
  backgroundWidthMm.value > 0 &&
  backgroundHeightMm.value > 0 &&
  !saving.value
)

const backgroundStyle = computed(() => ({
  left: `${(backgroundXmm.value / widthMm.value) * 100}%`,
  top: `${(backgroundYmm.value / heightMm.value) * 100}%`,
  width: `${(backgroundWidthMm.value / widthMm.value) * 100}%`,
  height: `${(backgroundHeightMm.value / heightMm.value) * 100}%`
}))

const qrStyle = computed(() => ({
  left: `${(qrXmm.value / widthMm.value) * 100}%`,
  top: `${(qrYmm.value / heightMm.value) * 100}%`,
  width: `${(qrSizeMm.value / widthMm.value) * 100}%`,
  aspectRatio: '1 / 1'
}))
const stickerStyle = computed(() => ({
  width: `${widthMm.value / 10}cm`,
  height: `${heightMm.value / 10}cm`
}))

watch([qrDarkColor, qrLightColor, qrLightTransparent], renderQr, { immediate: true })
watch([widthMm, heightMm], () => {
  backgroundWidthMm.value = Math.max(1, backgroundWidthMm.value)
  backgroundHeightMm.value = Math.max(1, backgroundHeightMm.value)
  clampQr()
})

async function renderQr() {
  const QRCode = await import('qrcode')
  // Прозрачный фон: библиотека qrcode принимает 8-знаковый hex с альфой.
  // '#00000000' = полностью прозрачный. Cветлые модули (quiet-зона тоже)
  // станут прозрачными, под ними проступит фон стикера.
  const light = qrLightTransparent.value ? '#00000000' : qrLightColor.value
  qrDataUrl.value = await QRCode.toDataURL('https://quar.io/s/preview', {
    width: 512,
    margin: 0,
    color: {
      dark: qrDarkColor.value,
      light
    }
  })
}

async function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = null
  uploading.value = true
  try {
    const dims = await readImageDimensions(URL.createObjectURL(file))
    const uploaded = await uploadFile(file)
    backgroundUrl.value = uploaded.url
    backgroundMimeType.value = uploaded.mimeType
    backgroundWidthPx.value = dims.width
    backgroundHeightPx.value = dims.height
    resetBackgroundFrame()
    selectedLayer.value = 'background'
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.message ?? 'Не удалось загрузить изображение'
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function generateBackground() {
  if (!prompt.value.trim()) return
  error.value = null
  generating.value = true
  try {
    const result = await api<{ url: string }>('/api/ai/image-generate', {
      method: 'POST',
      body: {
        prompt: prompt.value.trim(),
        canvasWidth: widthMm.value,
        canvasHeight: heightMm.value
      }
    })
    const dims = await readImageDimensions(result.url)
    backgroundUrl.value = result.url
    backgroundMimeType.value = 'image/png'
    backgroundWidthPx.value = dims.width
    backgroundHeightPx.value = dims.height
    resetBackgroundFrame()
    selectedLayer.value = 'background'
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.message ?? 'Не удалось сгенерировать изображение'
  } finally {
    generating.value = false
  }
}

function readImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Не удалось прочитать размеры изображения'))
    img.src = src
  })
}

function startLayerDrag(layer: 'background' | 'qr', event: PointerEvent) {
  if (!stageRef.value) return
  selectedLayer.value = layer
  dragging.value = true
  const startX = event.clientX
  const startY = event.clientY
  const rect = stageRef.value.getBoundingClientRect()
  const mmPerPxX = widthMm.value / rect.width
  const mmPerPxY = heightMm.value / rect.height
  const start = layer === 'qr'
    ? { x: qrXmm.value, y: qrYmm.value }
    : { x: backgroundXmm.value, y: backgroundYmm.value }

  const move = (e: PointerEvent) => {
    const x = roundMm01(start.x + (e.clientX - startX) * mmPerPxX)
    const y = roundMm01(start.y + (e.clientY - startY) * mmPerPxY)
    if (layer === 'qr') {
      qrXmm.value = x
      qrYmm.value = y
      clampQr()
    } else {
      backgroundXmm.value = x
      backgroundYmm.value = y
    }
  }
  const up = () => {
    dragging.value = false
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up, { once: true })
}

function startLayerResize(layer: 'background' | 'qr', event: PointerEvent) {
  if (!stageRef.value) return
  selectedLayer.value = layer
  dragging.value = true
  const startX = event.clientX
  const startY = event.clientY
  const rect = stageRef.value.getBoundingClientRect()
  const mmPerPxX = widthMm.value / rect.width
  const mmPerPxY = heightMm.value / rect.height
  const start = layer === 'qr'
    ? { w: qrSizeMm.value, h: qrSizeMm.value }
    : { w: backgroundWidthMm.value, h: backgroundHeightMm.value }
  const ratio = start.w / start.h

  const move = (e: PointerEvent) => {
    const deltaX = (e.clientX - startX) * mmPerPxX
    const deltaY = (e.clientY - startY) * mmPerPxY
    if (layer === 'qr') {
      qrSizeMm.value = roundMm(Math.max(8, start.w + Math.max(deltaX, deltaY)))
      clampQr()
    } else {
      const nextW = Math.max(5, start.w + deltaX)
      const nextH = Math.max(5, start.h + deltaY)
      if (event.shiftKey) {
        backgroundWidthMm.value = roundMm(nextW)
        backgroundHeightMm.value = roundMm(nextW / ratio)
      } else {
        backgroundWidthMm.value = roundMm(nextW)
        backgroundHeightMm.value = roundMm(nextH)
      }
    }
  }
  const up = () => {
    dragging.value = false
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up, { once: true })
}

function startStickerResize(event: PointerEvent) {
  if (!stageRef.value) return
  dragging.value = true
  const startX = event.clientX
  const startY = event.clientY
  const startWidth = widthMm.value
  const startHeight = heightMm.value
  const rect = stageRef.value.getBoundingClientRect()
  const mmPerPxX = widthMm.value / rect.width
  const mmPerPxY = heightMm.value / rect.height

  const move = (e: PointerEvent) => {
    widthMm.value = roundMm(Math.max(10, startWidth + (e.clientX - startX) * mmPerPxX))
    heightMm.value = roundMm(Math.max(10, startHeight + (e.clientY - startY) * mmPerPxY))
    clampQr()
  }
  const up = () => {
    dragging.value = false
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up, { once: true })
}

function onKeydown(e: KeyboardEvent) {
  const el = document.activeElement as HTMLElement | null
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return
  if (!selectedLayer.value) return
  const step = e.shiftKey ? 10 : 1
  let dx = 0
  let dy = 0
  if (e.key === 'ArrowLeft') dx = -step
  else if (e.key === 'ArrowRight') dx = step
  else if (e.key === 'ArrowUp') dy = -step
  else if (e.key === 'ArrowDown') dy = step
  else return
  if (selectedLayer.value === 'qr' && !qrDataUrl.value) return
  if (selectedLayer.value === 'background' && !backgroundUrl.value) return
  e.preventDefault()
  if (selectedLayer.value === 'qr') {
    qrXmm.value = roundMm01(qrXmm.value + dx)
    qrYmm.value = roundMm01(qrYmm.value + dy)
    clampQr()
  } else {
    backgroundXmm.value = roundMm01(backgroundXmm.value + dx)
    backgroundYmm.value = roundMm01(backgroundYmm.value + dy)
  }
}

const loadingTemplate = ref(false)

// Eyedropper API (Chrome/Edge 95+). В Firefox/Safari window.EyeDropper нет —
// прячем кнопку. Не делаем canvas-fallback: проще и предсказуемее показать
// only-Chromium-only фичу там, где она есть, чем поддерживать суррогат на
// тех браузерах, где пользователь может тыкать только по миниатюре в редакторе.
const eyeDropperSupported = ref(false)
if (typeof window !== 'undefined' && 'EyeDropper' in window) {
  eyeDropperSupported.value = true
}

async function pickColor(target: 'dark' | 'light') {
  if (!eyeDropperSupported.value) return
  try {
    const ED = (window as any).EyeDropper
    const result = (await new ED().open()) as { sRGBHex: string }
    const hex = result?.sRGBHex
    if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return
    if (target === 'dark') qrDarkColor.value = hex
    else qrLightColor.value = hex
  } catch {
    // Пользователь нажал Escape — это нормально, не показываем ошибку.
  }
}

async function loadExisting() {
  if (!isEdit.value) return
  loadingTemplate.value = true
  error.value = null
  try {
    type TemplateRecord = {
      name: string
      backgroundUrl: string
      backgroundMimeType: string | null
      backgroundWidthPx: number
      backgroundHeightPx: number
      widthMm: number
      heightMm: number
      backgroundXmm: number
      backgroundYmm: number
      backgroundWidthMm: number
      backgroundHeightMm: number
      qrXmm: number
      qrYmm: number
      qrSizeMm: number
      qrDarkColor: string
      qrLightColor: string
      qrLightTransparent: boolean
    }
    const record = await api<TemplateRecord>(`/api/print-templates/custom/${templateId.value}`)
    name.value = record.name
    backgroundUrl.value = record.backgroundUrl
    backgroundMimeType.value = record.backgroundMimeType
    backgroundWidthPx.value = record.backgroundWidthPx
    backgroundHeightPx.value = record.backgroundHeightPx
    widthMm.value = record.widthMm
    heightMm.value = record.heightMm
    backgroundXmm.value = record.backgroundXmm
    backgroundYmm.value = record.backgroundYmm
    backgroundWidthMm.value = record.backgroundWidthMm || record.widthMm
    backgroundHeightMm.value = record.backgroundHeightMm || record.heightMm
    qrXmm.value = record.qrXmm
    qrYmm.value = record.qrYmm
    qrSizeMm.value = record.qrSizeMm
    qrDarkColor.value = record.qrDarkColor
    qrLightColor.value = record.qrLightColor
    qrLightTransparent.value = record.qrLightTransparent
    selectedLayer.value = 'background'
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.message ?? 'Не удалось загрузить шаблон'
  } finally {
    loadingTemplate.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  void loadExisting()
  nextTick(() => {
    if (zoomOuterRef.value && workspaceRef.value) {
      zoomObserver = new ResizeObserver(() => updateZoom())
      zoomObserver.observe(zoomOuterRef.value)
      zoomObserver.observe(workspaceRef.value)
      updateZoom()
    }
  })
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  zoomObserver?.disconnect()
  zoomObserver = null
})

watch([widthMm, heightMm], () => nextTick(updateZoom))

function clampQr() {
  qrSizeMm.value = Math.min(qrSizeMm.value, widthMm.value, heightMm.value)
  qrXmm.value = Math.max(0, Math.min(qrXmm.value, widthMm.value - qrSizeMm.value))
  qrYmm.value = Math.max(0, Math.min(qrYmm.value, heightMm.value - qrSizeMm.value))
}

function resetBackgroundFrame() {
  const px = backgroundWidthPx.value
  const py = backgroundHeightPx.value
  const imgRatio = px && py ? px / py : widthMm.value / heightMm.value
  const canvasRatio = widthMm.value / heightMm.value
  let w: number
  let h: number
  if (imgRatio > canvasRatio) {
    w = widthMm.value
    h = w / imgRatio
  } else {
    h = heightMm.value
    w = h * imgRatio
  }
  backgroundWidthMm.value = roundMm(w)
  backgroundHeightMm.value = roundMm(h)
  backgroundXmm.value = roundMm01((widthMm.value - backgroundWidthMm.value) / 2)
  backgroundYmm.value = roundMm01((heightMm.value - backgroundHeightMm.value) / 2)
}

async function save() {
  if (!canSave.value || !backgroundUrl.value) return
  error.value = null
  saving.value = true
  try {
    const body = {
      name: name.value.trim(),
      backgroundUrl: backgroundUrl.value,
      backgroundMimeType: backgroundMimeType.value,
      backgroundWidthPx: backgroundWidthPx.value,
      backgroundHeightPx: backgroundHeightPx.value,
      widthMm: Number(widthMm.value),
      heightMm: Number(heightMm.value),
      backgroundXmm: Number(backgroundXmm.value),
      backgroundYmm: Number(backgroundYmm.value),
      backgroundWidthMm: Number(backgroundWidthMm.value),
      backgroundHeightMm: Number(backgroundHeightMm.value),
      qrXmm: Number(qrXmm.value),
      qrYmm: Number(qrYmm.value),
      qrSizeMm: Number(qrSizeMm.value),
      qrDarkColor: qrDarkColor.value,
      qrLightColor: qrLightColor.value,
      qrLightTransparent: qrLightTransparent.value
    }
    const result = isEdit.value
      ? await api<{ template: { code: string } }>(`/api/print-templates/custom/${templateId.value}`, {
          method: 'PUT',
          body
        })
      : await api<{ template: { code: string } }>('/api/print-templates/custom', {
          method: 'POST',
          body
        })
    router.push({
      path: '/dashboard/print',
      query: { tab: 'templates' }
    })
    // Preview-кэш на сервере живёт 5 минут — на /print показывается тот же URL,
    // что и в админке, и в браузере он закэширован. Не критично, обновится сам.
    void result
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? e?.message ?? 'Не удалось сохранить шаблон'
  } finally {
    saving.value = false
  }
}

function roundMm(value: number) {
  return Math.round(value)
}

function roundMm01(value: number) {
  return Math.round(value * 10) / 10
}

function onDimensionInput(dim: 'width' | 'height', event: Event) {
  const target = event.target as HTMLInputElement
  const raw = Number(target.value)
  if (!Number.isFinite(raw)) return
  if (raw < 20 || raw > 300) return
  const next = Math.round(raw)
  if (dim === 'width') widthMm.value = next
  else heightMm.value = next
}

function onDimensionChange(dim: 'width' | 'height', event: Event) {
  const target = event.target as HTMLInputElement
  const raw = Number(target.value)
  const fallback = dim === 'width' ? widthMm.value : heightMm.value
  const next = Number.isFinite(raw)
    ? Math.max(20, Math.min(300, Math.round(raw)))
    : fallback
  if (dim === 'width') widthMm.value = next
  else heightMm.value = next
  target.value = String(next)
}

</script>

<template>
  <div class="xl:flex xl:min-h-[calc(100svh-2.25rem)] xl:flex-col">
    <PageHeader
      icon="lucide:palette"
      :title="isEdit ? 'Редактирование шаблона' : 'Новый шаблон'"
    >
      <template #actions>
        <UiButton variant="secondary" to="/dashboard/print?tab=templates">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          <span class="hidden md:inline">К шаблонам</span>
        </UiButton>
      </template>
    </PageHeader>

    <div
      v-if="loadingTemplate"
      class="mt-sm flex items-center gap-2 rounded-md border border-hairline bg-surface px-md py-sm text-body-sm text-steel"
    >
      <Icon name="lucide:loader-2" class="h-4 w-4 animate-spin" />
      Загружаю шаблон…
    </div>

    <div class="mt-sm grid gap-xl rounded-sm bg-surface p-xl xl:flex-1 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section class="min-w-0 space-y-md xl:flex xl:flex-col">
        <div
          ref="zoomOuterRef"
          class="flex items-center justify-center overflow-hidden p-md xl:flex-1 xl:p-0"
        >
            <div
              ref="workspaceRef"
              class="sticker-workspace"
              :style="{ transform: zoom < 1 ? `scale(${zoom})` : undefined }"
              @pointerenter="stageHovered = true"
              @pointerleave="stageHovered = false"
            >
            <div class="relative w-fit max-w-full">
              <div class="absolute left-0 right-0 -top-[1cm] flex h-[1cm] items-center">
                <div class="dimension-line dimension-line-horizontal">
                  <span class="dimension-label bg-surface px-2">
                    <input
                      type="number"
                      min="20"
                      max="300"
                      step="1"
                      class="dimension-input"
                      :value="widthMm"
                      @input="onDimensionInput('width', $event)"
                      @change="onDimensionChange('width', $event)"
                    >
                    мм
                  </span>
                </div>
              </div>

              <div class="absolute top-0 bottom-0 -left-[1cm] flex w-[1cm] justify-center">
                <div class="dimension-line dimension-line-vertical">
                  <span class="dimension-label dimension-label-vertical bg-surface px-2">
                    <input
                      type="number"
                      min="20"
                      max="300"
                      step="1"
                      class="dimension-input"
                      :value="heightMm"
                      @input="onDimensionInput('height', $event)"
                      @change="onDimensionChange('height', $event)"
                    >
                    мм
                  </span>
                </div>
              </div>

              <div
                ref="stageRef"
                class="sticker-stage relative rounded-[2px] bg-white"
                :style="stickerStyle"
              >
                <div class="absolute inset-0 overflow-hidden rounded-[2px]">
                  <button
                    v-if="backgroundUrl"
                    type="button"
                    class="absolute touch-none"
                    :style="backgroundStyle"
                    title="Перетащить фон"
                    @pointerdown.prevent="startLayerDrag('background', $event)"
                  >
                    <img
                      :src="backgroundUrl"
                      alt=""
                      class="h-full w-full select-none object-fill"
                      draggable="false"
                    >
                  </button>

                  <button
                    v-if="qrDataUrl"
                    type="button"
                    class="absolute touch-none"
                    :style="qrStyle"
                    title="Перетащить QR"
                    @pointerdown.prevent="startLayerDrag('qr', $event)"
                  >
                    <img :src="qrDataUrl" alt="QR preview" class="h-full w-full select-none" draggable="false">
                  </button>
                </div>

                <div
                  v-if="backgroundUrl && selectedLayer === 'background' && showOverlay"
                  class="pointer-events-none absolute"
                  :style="backgroundStyle"
                >
                  <span class="absolute -left-2 -right-2 -top-px h-0.5 backdrop-invert" />
                  <span class="absolute -left-2 -right-2 -bottom-px h-0.5 backdrop-invert" />
                  <span class="absolute -top-2 -bottom-2 -left-px w-0.5 backdrop-invert" />
                  <span class="absolute -top-2 -bottom-2 -right-px w-0.5 backdrop-invert" />
                  <span
                    class="pointer-events-auto absolute -bottom-3 -right-3 flex h-6 w-6 cursor-nwse-resize items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/10"
                    title="Изменить размер фона"
                    @pointerdown.stop.prevent="startLayerResize('background', $event)"
                  >
                    <Icon name="lucide:move-diagonal-2" class="h-3.5 w-3.5 text-steel" />
                  </span>
                </div>
                <div
                  v-if="qrDataUrl && selectedLayer === 'qr' && showOverlay"
                  class="pointer-events-none absolute"
                  :style="qrStyle"
                >
                  <span class="absolute -left-2 -right-2 -top-px h-0.5 backdrop-invert" />
                  <span class="absolute -left-2 -right-2 -bottom-px h-0.5 backdrop-invert" />
                  <span class="absolute -top-2 -bottom-2 -left-px w-0.5 backdrop-invert" />
                  <span class="absolute -top-2 -bottom-2 -right-px w-0.5 backdrop-invert" />
                  <span
                    class="pointer-events-auto absolute -bottom-3 -right-3 flex h-6 w-6 cursor-nwse-resize items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/10"
                    title="Изменить размер QR"
                    @pointerdown.stop.prevent="startLayerResize('qr', $event)"
                  >
                    <Icon name="lucide:move-diagonal-2" class="h-3.5 w-3.5 text-steel" />
                  </span>
                </div>
              </div>
              <button
                v-if="showOverlay"
                type="button"
                class="absolute -bottom-6 -right-6 z-20 flex h-6 w-6 cursor-nwse-resize touch-none items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/10"
                title="Изменить размер стикера"
                aria-label="Изменить размер стикера"
                @pointerdown.stop.prevent="startStickerResize"
              >
                <Icon name="lucide:move-diagonal-2" class="h-3.5 w-3.5 text-steel" />
              </button>
            </div>
            </div>
        </div>

        <UiAlert v-if="dpiWarning" kind="warning">
          Разрешение фона примерно {{ effectiveDpi }} DPI. Для качественной печати лучше 300 DPI и выше.
        </UiAlert>
        <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>
      </section>

      <aside class="space-y-lg">
        <section class="space-y-md">
          <h2 class="text-body-md-md text-charcoal">Шаблон</h2>
          <UiInput v-model="name" label="Название" />
          <p v-if="backgroundUrl" class="text-caption text-steel">
            Фон: {{ backgroundWidthPx }}×{{ backgroundHeightPx }} px · {{ effectiveDpi || '—' }} DPI
          </p>
        </section>

        <section class="space-y-md">
          <h2 class="text-body-md-md text-charcoal">Фон</h2>
          <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onFileChange">
          <div class="flex gap-sm">
            <UiButton variant="secondary" type="button" :loading="uploading" @click="fileInput?.click()">
              <Icon name="lucide:upload" class="h-4 w-4" />
              Загрузить
            </UiButton>
            <UiButton variant="secondary" type="button" :loading="generating" @click="generateBackground">
              <Icon name="lucide:sparkles" class="h-4 w-4" />
              Сгенерировать
            </UiButton>
          </div>
          <label class="block">
            <span class="mb-1 block text-body-sm-md text-charcoal">Промпт для генерации</span>
            <textarea
              v-model="prompt"
              rows="4"
              class="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-body-sm text-ink outline-none transition-colors focus:border-primary"
            />
          </label>
        </section>

        <section class="space-y-md">
          <h2 class="text-body-md-md text-charcoal">QR-код</h2>
          <div class="grid grid-cols-2 gap-sm">
            <label class="block">
              <span class="mb-1 block text-body-sm-md text-charcoal">QR</span>
              <div class="flex gap-1">
                <input
                  v-model="qrDarkColor"
                  type="color"
                  class="h-10 w-full rounded-md border border-hairline bg-canvas"
                >
                <button
                  v-if="eyeDropperSupported"
                  type="button"
                  class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-canvas text-steel transition-colors hover:bg-surface hover:text-ink"
                  title="Снять цвет с экрана"
                  @click="pickColor('dark')"
                >
                  <Icon name="lucide:pipette" class="h-4 w-4" />
                </button>
              </div>
            </label>
            <label class="block">
              <span class="mb-1 block text-body-sm-md text-charcoal">Фон QR</span>
              <div class="flex gap-1">
                <input
                  v-model="qrLightColor"
                  type="color"
                  :disabled="qrLightTransparent"
                  class="h-10 w-full rounded-md border border-hairline bg-canvas disabled:opacity-40"
                >
                <button
                  v-if="eyeDropperSupported"
                  type="button"
                  :disabled="qrLightTransparent"
                  class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-canvas text-steel transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-canvas disabled:hover:text-steel"
                  title="Снять цвет с экрана"
                  @click="pickColor('light')"
                >
                  <Icon name="lucide:pipette" class="h-4 w-4" />
                </button>
              </div>
            </label>
          </div>
          <p v-if="!eyeDropperSupported" class="text-caption text-steel">
            «Пипетка» для снятия цвета прямо с экрана работает в Chrome и Edge. В Firefox / Safari
            доступен только обычный цветовой пикер.
          </p>
          <label class="flex cursor-pointer items-center gap-2">
            <input
              v-model="qrLightTransparent"
              type="checkbox"
              class="h-4 w-4 rounded border-hairline text-primary focus:ring-primary/30"
            >
            <span class="text-body-sm text-ink">Прозрачный фон QR</span>
            <span class="text-caption text-steel">
              Подложка не печатается — модули QR ложатся прямо на фон стикера.
            </span>
          </label>
        </section>

        <div class="flex justify-end gap-sm border-t border-hairline pt-md">
          <UiButton
            variant="secondary"
            to="/dashboard/print?tab=templates"
            :disabled="saving"
          >
            Отмена
          </UiButton>
          <UiButton variant="primary" :loading="saving" :disabled="!canSave" @click="save">
            <Icon name="lucide:save" class="h-4 w-4" />
            {{ isEdit ? 'Сохранить изменения' : 'Сохранить шаблон' }}
          </UiButton>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.dimension-line {
  position: relative;
  color: #787671;
  font-size: 12px;
  font-weight: 500;
}

.dimension-line-horizontal {
  width: 100%;
  height: 18px;
  border-top: 1px solid #a4a097;
}

.dimension-line-horizontal::before,
.dimension-line-horizontal::after {
  content: '';
  position: absolute;
  top: -4px;
  width: 7px;
  height: 7px;
  border-top: 1px solid #a4a097;
}

.dimension-line-horizontal::before {
  left: 0;
  border-left: 1px solid #a4a097;
  transform: rotate(-45deg);
}

.dimension-line-horizontal::after {
  right: 0;
  border-right: 1px solid #a4a097;
  transform: rotate(45deg);
}

.dimension-line-vertical {
  width: 18px;
  height: 100%;
  border-left: 1px solid #a4a097;
}

.dimension-line-vertical::before,
.dimension-line-vertical::after {
  content: '';
  position: absolute;
  left: -4px;
  width: 7px;
  height: 7px;
  border-left: 1px solid #a4a097;
}

.dimension-line-vertical::before {
  top: 0;
  border-top: 1px solid #a4a097;
  transform: rotate(45deg);
}

.dimension-line-vertical::after {
  bottom: 0;
  border-bottom: 1px solid #a4a097;
  transform: rotate(-45deg);
}

.dimension-label {
  position: absolute;
  left: 50%;
  top: -10px;
  transform: translateX(-50%);
  white-space: nowrap;
}

.dimension-label-vertical {
  /* left: 0 + translate(-50%, ...) центрирует подпись по вертикальной линии
     независимо от ширины контента (раньше был фиксированный left: -17px,
     рассчитанный под жёсткую ширину). */
  left: 0;
  top: 50%;
  transform: translate(-50%, -50%) rotate(-90deg);
}

.dimension-input {
  field-sizing: content;
  min-width: 1ch;
  padding: 0 0.25rem;
  text-align: center;
  font: inherit;
  color: inherit;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  outline: none;
}

.dimension-input:hover {
  border-color: rgba(120, 118, 113, 0.35);
}

.dimension-input:focus {
  border-color: var(--color-primary, #3b82f6);
  background: #fff;
}

.dimension-input::-webkit-outer-spin-button,
.dimension-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.dimension-input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.sticker-stage {
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.04),
    0 4px 10px rgba(15, 23, 42, 0.05),
    0 12px 24px rgba(15, 23, 42, 0.05);
  transition: width 180ms ease, height 180ms ease;
}

.sticker-workspace {
  /* Симметричный 2см-паддинг во всех направлениях — бумага оказывается ровно
     на узле сетки (2см от края workspace), без сабпиксельной погрешности от
     смешения cm и rem. Подписи размеров висят на бумаге через отрицательные
     оффсеты -1cm, поэтому не требуют дополнительного места в паддинге. */
  padding: 2cm;
  border-radius: 6px;
  background-image:
    linear-gradient(to right, rgba(120, 118, 113, 0.22) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(120, 118, 113, 0.22) 1px, transparent 1px);
  background-size: 1cm 1cm;
  background-position: top left;
  /* «Растворяем» клетки в фон через большую мягкую внутреннюю тень цвета поверхности. */
  box-shadow:
    inset 0 0 24px 12px var(--color-surface),
    inset 0 0 64px 24px var(--color-surface);
}
</style>
