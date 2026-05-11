<script setup lang="ts">
// Раздел dashboard'а: QR-активатор. Пользователь наводит камеру на
// QR-наклейку и штрихкод товара (в любом порядке). Каждое удачное
// распознавание делает thumbnail-кадр и «улетает» в угол — QR в верхний
// левый, ШК в верхний правый. После обоих захватов вызывается
// /api/public/short/<shortId>/bind.
//
// Страница встроена в dashboard-layout. На мобильной версии sidebar
// скрыт (виден только бургер-toggle), поэтому камерная панель занимает
// почти весь экран — то же поведение, что было у прошлого fullscreen-
// варианта. Короткая инструкция и QR-handoff («открыть на телефоне»)
// вынесены в модалку «Как работает активация».
//
// Может быть открыт с ?qr=<shortId> (редирект из /code/[uuid]) — в этом
// случае QR-слот предзаполнен плейсхолдером и сканируется только ШК.
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

import type { QrPrintRunEntry } from '~~/shared/schemas/qrCode'

interface InstructionLite {
  id: string
  slug: string
  title: string
  description: string | null
  status: string
  productBarcode: string | null
  publishedAt?: string | null
}

const route = useRoute()
const router = useRouter()
const api = useApi()

const initialQr = String(route.query.qr ?? '').trim() || null

// ─── Camera state ──────────────────────────────────────────────────────
const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const cameraError = ref<string | null>(null)
const scanning = ref(false)

// ZXing controls; created lazily inside startScanner so the library is only
// loaded on this page (~150KB gz).
let scannerControls: { stop(): void } | null = null

// ─── Linking state ─────────────────────────────────────────────────────
const qrId = ref<string | null>(null)
const qrShortId = ref<string | null>(null)
const qrThumbnail = ref<string | null>(null)
const barcodeValue = ref<string | null>(null)
const barcodeThumbnail = ref<string | null>(null)
const matchedInstruction = ref<InstructionLite | null>(null)
const tenantSlug = ref<string | null>(null)
// 'barcode' = ШК was scanned but not found; 'manual' = user clicked the
// placeholder because they don't have a barcode handy
const pickerMode = ref<'barcode' | 'manual'>('barcode')

const status = ref<'scanning' | 'picking-instruction' | 'binding' | 'success' | 'error' | 'bound-conflict' | 'replace-confirm'>('scanning')
const errorMsg = ref<string | null>(null)

// When the user scans a QR that's already pointed at an instruction we don't
// auto-redirect — we show a modal so they can either go to it or unbind here.
const boundConflict = ref<{
  qrId: string
  shortId: string
  thumbnail: string | null
  tenantSlug: string
  instruction: { id: string; slug: string; title: string }
} | null>(null)
const unbinding = ref(false)
const unbindError = ref<string | null>(null)
// shortIds the user has dismissed via "X" / backdrop on the bound-conflict
// modal — we don't re-prompt for the same code while it's still in frame.
const dismissedBoundQrs = new Set<string>()

// When a different QR is seen while we already have one captured, prompt
// the user to either replace or keep the current one.
const qrReplaceCandidate = ref<{
  qrId: string
  shortId: string
  thumbnail: string | null
  tenantSlug: string
} | null>(null)

// ─── Instruction picker modal ──────────────────────────────────────────
const showPicker = ref(false)
const search = ref('')
const debouncedSearch = ref('')
let searchDebounce: ReturnType<typeof setTimeout> | null = null
watch(search, (v) => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => { debouncedSearch.value = v }, 250)
})
const pickerResults = ref<InstructionLite[]>([])
const pickerLoading = ref(false)
const previewInstruction = ref<InstructionLite | null>(null)

watch([showPicker, debouncedSearch], async ([open]) => {
  if (!open) return
  pickerLoading.value = true
  try {
    const res = await api<{ instructions: InstructionLite[] }>(
      `/api/instructions/search?q=${encodeURIComponent(debouncedSearch.value)}&take=50`
    )
    pickerResults.value = res.instructions
  } finally {
    pickerLoading.value = false
  }
})

// ─── Help modal: «Как работает активация» ──────────────────────────────
// Открывается из header-кнопки рядом с заголовком. Внутри — короткая
// инструкция в 3 шага и QR-код, по которому открыть этот же раздел
// на телефоне (handoff). QR генерируется лениво при первом открытии
// модалки, чтобы не тянуть библиотеку qrcode, если справка не нужна.
const showHelp = ref(false)
const handoffQrDataUrl = ref<string | null>(null)
const handoffUrl = ref<string>('')
const handoffLoading = ref(false)

async function generateHandoffQr() {
  if (!import.meta.client || handoffQrDataUrl.value || handoffLoading.value) return
  handoffLoading.value = true
  try {
    handoffUrl.value = `${window.location.origin}/qr-codes/link`
    const QRCode = await import('qrcode')
    handoffQrDataUrl.value = await QRCode.toDataURL(handoffUrl.value, {
      width: 360,
      margin: 1,
      color: { dark: '#0c0c0c', light: '#ffffff' }
    })
  } catch (e) {
    console.warn('[linker] failed to render handoff QR', e)
  } finally {
    handoffLoading.value = false
  }
}

watch(showHelp, (open) => {
  if (open) generateHandoffQr()
})

// ─── Lifecycle ─────────────────────────────────────────────────────────
onMounted(async () => {
  if (initialQr) {
    // Validate ownership of the prefilled QR before the user wastes a scan
    try {
      const data = await $fetch<any>(`/api/public/short/${initialQr}`)
      if (data.kind === 'boundQr') {
        if (!data.canManage) {
          status.value = 'error'
          errorMsg.value = 'Этот QR уже настроен в другом аккаунте.'
          return
        }
        boundConflict.value = {
          qrId: data.qrCode.id,
          shortId: data.qrCode.shortId,
          thumbnail: '/images/qr-code.png',
          tenantSlug: data.tenant.slug,
          instruction: data.instruction
        }
        status.value = 'bound-conflict'
        return
      }
      if (data.kind === 'activationQr') {
        if (!data.canBind) {
          status.value = 'error'
          errorMsg.value = 'Этот QR принадлежит другому аккаунту.'
          return
        }
        tenantSlug.value = data.tenant.slug
        qrId.value = data.qrCode.id
        qrShortId.value = initialQr
        qrThumbnail.value = '/images/qr-code.png'
      } else {
        status.value = 'error'
        errorMsg.value = 'QR-код не найден.'
        return
      }
    } catch {
      status.value = 'error'
      errorMsg.value = 'Не удалось проверить QR-код.'
      return
    }
  }
  await startScanner()
})

onBeforeUnmount(stopScanner)

async function startScanner() {
  if (!import.meta.client || scanning.value) return
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'Браузер не дал доступ к камере.'
    return
  }
  if (!videoRef.value) return

  try {
    const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
      import('@zxing/browser'),
      import('@zxing/library')
    ])

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.ITF
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)

    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 100 })

    scannerControls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      videoRef.value,
      (result, _err) => {
        if (!result || status.value !== 'scanning') return
        const text = result.getText()
        const format = result.getBarcodeFormat()
        if (format === BarcodeFormat.QR_CODE) {
          const detected = extractShortId(text)
          if (!qrShortId.value) {
            onQrDetected(text)
          } else if (detected && detected !== qrShortId.value) {
            // A different QR is in front of the camera — ask before replacing
            onQrReplaceDetected(text)
          }
        } else if (!barcodeValue.value) {
          onBarcodeDetected(text)
        }
      }
    )
    scanning.value = true
  } catch (e: any) {
    cameraError.value = e?.message ?? 'Не удалось запустить камеру.'
    stopScanner()
  }
}

function stopScanner() {
  scanning.value = false
  scannerControls?.stop()
  scannerControls = null
}

function captureFrame(): string | null {
  if (!videoRef.value || !canvasRef.value) return null
  const video = videoRef.value
  const canvas = canvasRef.value
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return null
  // shrink to ~256px wide for a small thumbnail data url
  const scale = Math.min(1, 256 / w)
  canvas.width = Math.round(w * scale)
  canvas.height = Math.round(h * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.85)
}

function vibrate(pattern: number | number[]) {
  if (import.meta.client && navigator.vibrate) navigator.vibrate(pattern as number)
}

async function onQrDetected(rawValue: string) {
  // Accept either the absolute /code/<id> URL or the bare short id
  const shortId = extractShortId(rawValue)
  if (!shortId) return

  // Avoid re-firing if we already locked this code in
  if (qrShortId.value === shortId) return

  // Validate it belongs to this tenant
  try {
    const data = await $fetch<any>(`/api/public/short/${shortId}`)
    if (data.kind === 'boundQr') {
      // Already bound — show conflict modal instead of auto-redirecting
      if (!data.canManage) return
      if (dismissedBoundQrs.has(shortId)) return
      boundConflict.value = {
        qrId: data.qrCode.id,
        shortId: data.qrCode.shortId,
        thumbnail: captureFrame(),
        tenantSlug: data.tenant.slug,
        instruction: data.instruction
      }
      status.value = 'bound-conflict'
      vibrate(40)
      return
    }
    if (data.kind !== 'activationQr' || !data.canBind) {
      // Wrong tenant or unknown — ignore and keep scanning
      return
    }
    tenantSlug.value = data.tenant.slug
    qrId.value = data.qrCode.id
  } catch {
    return
  }

  qrShortId.value = shortId
  qrThumbnail.value = captureFrame()
  vibrate(40)
  await maybeAdvance()
}

async function onQrReplaceDetected(rawValue: string) {
  const shortId = extractShortId(rawValue)
  if (!shortId || shortId === qrShortId.value) return
  if (qrReplaceCandidate.value?.shortId === shortId) return

  // Validate the new candidate before bothering the user
  let data: any
  try {
    data = await $fetch<any>(`/api/public/short/${shortId}`)
  } catch {
    return
  }
  // We only offer "replace" for fresh, owned activation QRs. If the new code
  // is bound to something else or belongs to a different tenant — ignore it.
  if (data.kind !== 'activationQr' || !data.canBind) return

  qrReplaceCandidate.value = {
    qrId: data.qrCode.id,
    shortId,
    thumbnail: captureFrame(),
    tenantSlug: data.tenant.slug
  }
  status.value = 'replace-confirm'
  vibrate(40)
}

async function confirmReplace() {
  if (!qrReplaceCandidate.value) return
  qrId.value = qrReplaceCandidate.value.qrId
  qrShortId.value = qrReplaceCandidate.value.shortId
  qrThumbnail.value = qrReplaceCandidate.value.thumbnail
  tenantSlug.value = qrReplaceCandidate.value.tenantSlug
  qrReplaceCandidate.value = null
  status.value = 'scanning'
  // If ШК was already captured, the new pair is complete — bind right away
  await maybeAdvance()
}

function keepCurrentQr() {
  qrReplaceCandidate.value = null
  status.value = 'scanning'
}

async function onBarcodeDetected(rawValue: string) {
  if (barcodeValue.value === rawValue) return
  // Validate format quickly — productBarcodeSchema accepts 3-64 chars
  const trimmed = rawValue.trim()
  if (trimmed.length < 3 || trimmed.length > 64) return

  let lookup: { instruction: InstructionLite | null }
  try {
    lookup = await api<{ instruction: InstructionLite | null }>(
      `/api/instructions/lookup?barcode=${encodeURIComponent(trimmed)}`
    )
  } catch {
    return
  }

  barcodeValue.value = trimmed
  barcodeThumbnail.value = captureFrame()
  matchedInstruction.value = lookup.instruction
  vibrate(40)

  if (!lookup.instruction) {
    // Stop the camera loop while the user picks an instruction
    pickerMode.value = 'barcode'
    status.value = 'picking-instruction'
    showPicker.value = true
    return
  }
  await maybeAdvance()
}

function extractShortId(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  // Match /code/<id> or /s/<id> or just a bare token
  const match = trimmed.match(/(?:\/(?:code|s)\/)([A-Za-z0-9_-]+)/)
  if (match) return match[1]
  if (/^[A-Za-z0-9_-]{4,}$/.test(trimmed)) return trimmed
  return null
}

async function maybeAdvance() {
  if (!qrShortId.value) return
  if (!barcodeValue.value) return
  if (status.value === 'picking-instruction' && !matchedInstruction.value) return
  await performBind()
}

async function performBind() {
  if (!qrShortId.value || !barcodeValue.value) return
  status.value = 'binding'
  stopScanner()
  try {
    const result = await $fetch<any>(`/api/public/short/${qrShortId.value}/bind`, {
      method: 'POST',
      body: {
        barcode: barcodeValue.value,
        instructionId: matchedInstruction.value?.id
      }
    })
    matchedInstruction.value = result.instruction
    status.value = 'success'
    vibrate([60, 30, 80])
  } catch (e: any) {
    status.value = 'error'
    errorMsg.value = e?.data?.statusMessage ?? 'Не удалось связать QR с инструкцией.'
  }
}

const transientHint = ref<string | null>(null)
let transientTimer: ReturnType<typeof setTimeout> | null = null
function flashHint(msg: string) {
  transientHint.value = msg
  if (transientTimer) clearTimeout(transientTimer)
  transientTimer = setTimeout(() => { transientHint.value = null }, 2500)
}

function openManualPicker() {
  if (!qrId.value) {
    flashHint('Сначала отсканируйте QR-стикер')
    return
  }
  pickerMode.value = 'manual'
  status.value = 'picking-instruction'
  showPicker.value = true
}

function pickInstruction(instr: InstructionLite) {
  previewInstruction.value = instr
}

async function confirmInstruction() {
  if (!previewInstruction.value) return
  if (previewInstruction.value.status !== 'PUBLISHED') {
    errorMsg.value = 'Можно выбрать только опубликованную инструкцию.'
    return
  }
  if (pickerMode.value === 'manual') {
    await manualBind()
    return
  }
  matchedInstruction.value = previewInstruction.value
  showPicker.value = false
  previewInstruction.value = null
  status.value = 'scanning'
  await performBind()
}

async function manualBind() {
  if (!qrId.value || !previewInstruction.value) return
  status.value = 'binding'
  showPicker.value = false
  stopScanner()
  try {
    await api(`/api/qr-codes/${qrId.value}`, {
      method: 'PATCH',
      body: { instructionId: previewInstruction.value.id }
    })
    matchedInstruction.value = previewInstruction.value
    previewInstruction.value = null
    status.value = 'success'
    vibrate([60, 30, 80])
  } catch (e: any) {
    status.value = 'error'
    errorMsg.value = e?.data?.statusMessage ?? 'Не удалось привязать инструкцию.'
  }
}

function cancelPicker() {
  const wasManual = pickerMode.value === 'manual'
  showPicker.value = false
  previewInstruction.value = null
  pickerMode.value = 'barcode'
  if (!wasManual) {
    // Barcode-mode cancel: clear the failed scan so the user can rescan
    barcodeValue.value = null
    barcodeThumbnail.value = null
    matchedInstruction.value = null
  }
  status.value = 'scanning'
  startScanner()
}

function dismissBoundConflict() {
  if (boundConflict.value) dismissedBoundQrs.add(boundConflict.value.shortId)
  boundConflict.value = null
  unbindError.value = null
  status.value = 'scanning'
}

async function goToBound() {
  if (!boundConflict.value) return
  stopScanner()
  await navigateTo(`/${boundConflict.value.tenantSlug}/${boundConflict.value.instruction.slug}`)
}

async function unbindAndContinue() {
  if (!boundConflict.value || unbinding.value) return
  unbinding.value = true
  unbindError.value = null
  try {
    await api(`/api/qr-codes/${boundConflict.value.qrId}`, {
      method: 'PATCH',
      body: { instructionId: null }
    })
    // Promote the conflict QR to the active scan slot, then keep scanning for ШК
    qrId.value = boundConflict.value.qrId
    qrShortId.value = boundConflict.value.shortId
    qrThumbnail.value = boundConflict.value.thumbnail
    tenantSlug.value = boundConflict.value.tenantSlug
    boundConflict.value = null
    status.value = 'scanning'
  } catch (e: any) {
    unbindError.value = e?.data?.statusMessage ?? 'Не удалось отвязать QR'
  } finally {
    unbinding.value = false
  }
}

async function continueAfterSuccess() {
  // Wipe scan slots and resume scanning so the operator can do another sticker
  qrId.value = null
  qrShortId.value = null
  qrThumbnail.value = null
  barcodeValue.value = null
  barcodeThumbnail.value = null
  matchedInstruction.value = null
  errorMsg.value = null
  status.value = 'scanning'
  await startScanner()
}

function reset() {
  qrShortId.value = initialQr
  qrThumbnail.value = initialQr ? '/images/qr-code.png' : null
  barcodeValue.value = null
  barcodeThumbnail.value = null
  matchedInstruction.value = null
  errorMsg.value = null
  status.value = 'scanning'
  startScanner()
}

const hint = computed(() => {
  if (status.value === 'binding') return 'Связываем QR с инструкцией…'
  if (status.value === 'success') return 'Готово! Открываем инструкцию.'
  if (status.value === 'error') return errorMsg.value ?? 'Ошибка'
  if (qrShortId.value && barcodeValue.value) return 'Готовим связку…'
  return ''
})
</script>

<template>
  <div>
    <PageHeader icon="lucide:arrow-left-right" title="Активация QR-кодов">
      <template #actions>
        <UiButton
          variant="secondary"
          aria-label="Как работает активация"
          @click="showHelp = true"
        >
          <Icon name="lucide:circle-help" class="h-4 w-4" />
          <span class="hidden sm:inline">Как работает активация</span>
        </UiButton>
      </template>
    </PageHeader>

    <!-- Активатор-карточка. На десктопе занимает ~ширину контента и
         высоту вьюпорта минус header + paddings; на мобиле сайдбар
         скрыт, поэтому карточка занимает почти всё доступное место.
         .linker-* стили теперь относительны самой карточке (была
         position: fixed; inset: 0). -->
    <div class="mt-sm linker">
    <!-- Camera background -->
    <video
      ref="videoRef"
      class="linker-video"
      muted
      playsinline
      autoplay
    />
    <canvas ref="canvasRef" class="hidden" />

    <!-- Dark gradient overlay for readability -->
    <div class="linker-vignette" />

    <!-- Scanning frame -->
    <div v-if="status === 'scanning'" class="linker-frame">
      <div class="linker-frame-corner tl" />
      <div class="linker-frame-corner tr" />
      <div class="linker-frame-corner bl" />
      <div class="linker-frame-corner br" />
    </div>

    <!-- Reset, появляется когда уже что-то захвачено -->
    <button
      v-if="qrShortId || barcodeValue"
      class="linker-icon-btn linker-reset"
      aria-label="Сбросить"
      @click="reset"
    >
      <Icon name="lucide:refresh-ccw" class="h-5 w-5" />
    </button>

    <!-- QR slot (top-left): captured thumbnail or placeholder -->
    <div v-if="qrThumbnail" class="linker-thumb tl">
      <img :src="qrThumbnail" alt="QR" >
      <div class="linker-thumb-label">
        <Icon name="lucide:qr-code" class="h-3.5 w-3.5" />
        QR
      </div>
    </div>
    <div v-else class="linker-thumb tl is-placeholder is-static">
      <div class="linker-placeholder-inner">
        <Icon name="lucide:qr-code" class="h-6 w-6" />
        <span>Отсканируйте<br>QR</span>
      </div>
    </div>

    <!-- ШК slot (top-right): captured thumbnail or always-clickable placeholder -->
    <div v-if="barcodeThumbnail" class="linker-thumb tr">
      <img :src="barcodeThumbnail" alt="ШК" >
      <div class="linker-thumb-label">
        <Icon name="lucide:scan-barcode" class="h-3.5 w-3.5" />
        ШК
      </div>
    </div>
    <button
      v-else
      class="linker-thumb tr is-placeholder"
      type="button"
      aria-label="Привязать вручную"
      @click="openManualPicker"
    >
      <div class="linker-placeholder-inner">
        <Icon name="lucide:scan-barcode" class="h-6 w-6" />
        <span>Отсканируйте<br>ШК</span>
      </div>
    </button>

    <!-- Hint / status text — only shown when there is something to say -->
    <div v-if="hint || cameraError || transientHint" class="linker-hint">
      <p v-if="transientHint" class="linker-hint-flash">{{ transientHint }}</p>
      <p v-else-if="hint">{{ hint }}</p>
      <p v-if="cameraError" class="linker-hint-error">{{ cameraError }}</p>
    </div>

    <!-- Success overlay — click anywhere to start the next link -->
    <Transition name="fade">
      <button
        v-if="status === 'success'"
        type="button"
        class="linker-success"
        @click="continueAfterSuccess"
      >
        <div class="linker-success-icon">
          <Icon name="lucide:check" class="h-10 w-10" />
        </div>
        <h2>QR привязан!</h2>
        <p v-if="matchedInstruction">{{ matchedInstruction.title }}</p>
        <p class="linker-success-hint">Нажмите, чтобы привязать следующий</p>
      </button>
    </Transition>

    <!-- Binding spinner -->
    <Transition name="fade">
      <div v-if="status === 'binding'" class="linker-binding">
        <div class="linker-spinner" />
      </div>
    </Transition>

    <!-- Error overlay -->
    <Transition name="fade">
      <div v-if="status === 'error'" class="linker-error">
        <Icon name="lucide:alert-triangle" class="h-10 w-10" />
        <h2>Не получилось</h2>
        <p>{{ errorMsg }}</p>
        <button class="linker-cta" @click="reset">Попробовать ещё раз</button>
      </div>
    </Transition>

    <!-- Replace QR modal: another QR appeared in front of the camera -->
    <UiModal
      :open="!!qrReplaceCandidate"
      :close-on-backdrop="false"
      :close-on-esc="false"
      size="sm"
    >
      <template #header>
        <h2 class="text-h4 text-ink">Найден другой QR</h2>
      </template>

      <div class="space-y-md">
        <p class="text-body text-slate">
          В кадре оказался другой QR-код. Заменить текущий выбор?
        </p>
        <div class="grid grid-cols-2 gap-sm">
          <div class="rounded-md border border-hairline bg-surface p-sm text-center">
            <p class="mb-1 text-caption uppercase text-steel">Текущий</p>
            <p class="font-mono text-body-sm text-charcoal">{{ qrShortId }}</p>
          </div>
          <div class="rounded-md border-2 border-primary bg-tint-lavender p-sm text-center">
            <p class="mb-1 text-caption uppercase text-steel">Новый</p>
            <p class="font-mono text-body-sm text-charcoal">{{ qrReplaceCandidate?.shortId }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-col gap-sm sm:flex-row sm:justify-end">
          <UiButton variant="secondary" @click="keepCurrentQr">
            Оставить текущий
          </UiButton>
          <UiButton @click="confirmReplace">
            <Icon name="lucide:repeat" class="h-4 w-4" /> Заменить
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- Already-bound modal: don't auto-redirect, let the user choose -->
    <UiModal
      :open="!!boundConflict"
      size="sm"
      @close="dismissBoundConflict"
    >
      <template #header>
        <h2 class="text-h4 text-ink">QR уже настроен</h2>
      </template>

      <div class="space-y-md">
        <p class="text-body text-slate">
          Этот QR-код ведёт на инструкцию:
        </p>
        <div class="rounded-md border border-hairline bg-surface px-md py-sm">
          <p class="text-body-md text-ink">{{ boundConflict?.instruction.title }}</p>
          <p class="text-caption text-steel">/{{ boundConflict?.tenantSlug }}/{{ boundConflict?.instruction.slug }}</p>
        </div>
        <UiAlert v-if="unbindError" kind="error">{{ unbindError }}</UiAlert>
      </div>

      <template #footer>
        <div class="flex flex-col gap-sm sm:flex-row sm:justify-end">
          <UiButton variant="secondary" :loading="unbinding" @click="unbindAndContinue">
            <Icon name="lucide:unlink" class="h-4 w-4" /> Отвязать
          </UiButton>
          <UiButton @click="goToBound">
            <Icon name="lucide:external-link" class="h-4 w-4" /> Перейти
          </UiButton>
        </div>
      </template>
    </UiModal>

    <!-- Instruction picker modal -->
    <UiModal v-model:open="showPicker" :close-on-backdrop="false" :close-on-esc="false" size="lg">
      <template #header>
        <h2 class="text-h4 text-ink">
          {{ pickerMode === 'manual' ? 'Выбрать инструкцию' : 'ШК ещё не привязан' }}
        </h2>
      </template>

      <div v-if="!previewInstruction" class="space-y-md">
        <p v-if="pickerMode === 'manual'" class="text-body-sm text-steel">
          Привяжите QR-код к опубликованной инструкции вручную, без сканирования штрихкода.
        </p>
        <p v-else class="text-body-sm text-steel">
          Штрихкод <span class="font-mono text-charcoal">{{ barcodeValue }}</span> не найден.
          Выберите инструкцию, которой он должен принадлежать — мы запишем ШК в неё.
        </p>
        <UiInput v-model="search" placeholder="Поиск по названию или slug…" autocomplete="off" />
        <p v-if="pickerLoading" class="text-body-sm text-steel">Ищу…</p>
        <div v-else-if="pickerResults.length" class="max-h-[320px] overflow-y-auto">
          <button
            v-for="instr in pickerResults"
            :key="instr.id"
            class="flex w-full flex-col items-start gap-1 border-b border-hairline-soft px-md py-sm text-left hover:bg-surface"
            @click="pickInstruction(instr)"
          >
            <span class="text-body-md text-ink">{{ instr.title }}</span>
            <span class="text-caption text-steel">
              {{ instr.slug }} · {{ instr.status }}{{ instr.productBarcode ? ` · ШК ${instr.productBarcode}` : '' }}
            </span>
          </button>
        </div>
        <p v-else class="text-body-sm text-steel">Ничего не найдено.</p>
      </div>

      <div v-else class="space-y-md">
        <h3 class="text-h5 text-ink">{{ previewInstruction.title }}</h3>
        <p v-if="previewInstruction.description" class="text-body text-slate">{{ previewInstruction.description }}</p>
        <UiAlert v-if="previewInstruction.status !== 'PUBLISHED'" kind="warning">
          Эта инструкция ещё не опубликована — сначала опубликуйте её, тогда QR можно будет связать.
        </UiAlert>
        <UiAlert v-else-if="pickerMode === 'manual'" kind="info">
          QR будет привязан к этой инструкции. ШК у инструкции
          <template v-if="previewInstruction.productBarcode"> сохранится — <b>{{ previewInstruction.productBarcode }}</b>.</template>
          <template v-else> можно будет указать позже в редакторе.</template>
        </UiAlert>
        <UiAlert v-else-if="previewInstruction.productBarcode" kind="warning">
          У инструкции уже указан ШК {{ previewInstruction.productBarcode }} — он не совпадает со сканированным.
        </UiAlert>
        <UiAlert v-else kind="info">
          Подтвердите выбор — мы запишем ШК <b>{{ barcodeValue }}</b> в эту инструкцию и привяжем QR.
        </UiAlert>
      </div>

      <template #footer>
        <div class="flex justify-between gap-sm">
          <UiButton variant="ghost" @click="cancelPicker">Отмена</UiButton>
          <div class="flex gap-sm">
            <UiButton v-if="previewInstruction" variant="secondary" @click="previewInstruction = null">
              Назад к списку
            </UiButton>
            <UiButton
              v-if="previewInstruction"
              :disabled="
                previewInstruction.status !== 'PUBLISHED' ||
                (pickerMode === 'barcode' && !!previewInstruction.productBarcode)
              "
              @click="confirmInstruction"
            >
              Это та инструкция
            </UiButton>
          </div>
        </div>
      </template>
    </UiModal>
    </div>

    <!-- Help-модалка: «Как работает активация» — 3 шага + handoff QR
         для запуска того же flow на смартфоне. -->
    <UiModal v-model:open="showHelp" size="md">
      <template #header>
        <div class="flex items-center gap-3">
          <Icon name="lucide:circle-help" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Как работает активация</h2>
        </div>
      </template>

      <div class="space-y-lg">
        <p class="text-body text-charcoal">
          Активация привязывает свободный QR-код с упаковки к конкретной
          инструкции в один проход на смартфоне или планшете — последовательно
          наводите камеру на QR-наклейку и штрихкод товара.
        </p>

        <ol class="help-steps">
          <li>
            <span class="help-step-num">1</span>
            <div>
              <p class="text-body-md text-ink">Откройте на телефоне</p>
              <p class="text-body-sm text-steel">Отсканируйте QR-код справа любым приложением «Камера».</p>
            </div>
          </li>
          <li>
            <span class="help-step-num">2</span>
            <div>
              <p class="text-body-md text-ink">Камеру — на QR-наклейку</p>
              <p class="text-body-sm text-steel">Превью улетит в верхний-левый угол.</p>
            </div>
          </li>
          <li>
            <span class="help-step-num">3</span>
            <div>
              <p class="text-body-md text-ink">Затем — на штрихкод товара</p>
              <p class="text-body-sm text-steel">Связка создаётся автоматически после двух удачных захватов.</p>
            </div>
          </li>
        </ol>

        <div class="help-qr">
          <div class="help-qr-frame">
            <img
              v-if="handoffQrDataUrl"
              :src="handoffQrDataUrl"
              alt="QR для открытия активации на телефоне"
              width="200"
              height="200"
            >
            <div v-else class="help-qr-placeholder">
              <Icon name="lucide:loader-2" class="h-6 w-6 animate-spin text-steel" />
            </div>
          </div>
          <div class="help-qr-copy">
            <p class="text-caption-bold uppercase tracking-wide text-steel">Открыть на телефоне</p>
            <p class="mt-1 text-body-sm text-charcoal">
              Сканируйте этот QR-код камерой смартфона — раздел откроется в
              том же аккаунте.
            </p>
            <p v-if="handoffUrl" class="mt-2 break-all font-mono text-caption text-steel">{{ handoffUrl }}</p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UiButton variant="primary" @click="showHelp = false">Понятно</UiButton>
        </div>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
/* Камера-активатор: карточка внутри dashboard-content, не fullscreen.
 * Высота = высота small viewport'а минус всё, что над/под карточкой:
 * 12px dashboard-content padding-top + 64px PageHeader + 12px mt-sm
 * + 24px dashboard-content padding-bottom = 112px, плюс
 * env(safe-area-inset-bottom) под home-indicator iOS.
 *
 * Берём именно svh (а не dvh): body / html в global.css ограничены
 * 100svh, и если карточка ориентируется на dvh, она «выпирает» за body
 * когда URL-бар Safari скрывается (dvh > svh) — отсюда был вертикальный
 * скролл всей страницы.
 *
 * На мобиле sidebar скрыт — карточка занимает почти весь экран, тот же
 * эффект, что у прежнего fullscreen-варианта. Все дочерние .linker-*
 * остаются absolute-позиционированными относительно этой карточки. */
.linker {
  position: relative;
  width: 100%;
  height: calc(100svh - 112px - env(safe-area-inset-bottom, 0px) - env(safe-area-inset-top, 0px));
  border-radius: 16px;
  background: #000;
  color: #fff;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}

.linker-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.linker-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.55) 100%),
    linear-gradient(to bottom, rgba(0, 0, 0, 0.45) 0%, transparent 25%, transparent 70%, rgba(0, 0, 0, 0.6) 100%);
}

.linker-icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.15s;
}
.linker-icon-btn:hover {
  background: rgba(0, 0, 0, 0.65);
}

/* Reset — нижний правый угол, чтобы не пересекаться с тумба-плашками
 * сверху (tl/tr). Появляется только когда что-то уже захвачено. */
.linker-reset {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 10;
}

.linker-frame {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.linker-frame::before {
  content: '';
  width: min(70vw, 70vh);
  height: min(70vw, 70vh);
  border: 2px dashed rgba(255, 255, 255, 0.4);
  border-radius: 24px;
}

.linker-frame-corner {
  position: absolute;
  width: 40px;
  height: 40px;
  border: 4px solid #fff;
  border-radius: 6px;
}
.linker-frame-corner.tl {
  top: calc(50% - min(35vw, 35vh));
  left: calc(50% - min(35vw, 35vh));
  border-right: 0;
  border-bottom: 0;
}
.linker-frame-corner.tr {
  top: calc(50% - min(35vw, 35vh));
  right: calc(50% - min(35vw, 35vh));
  border-left: 0;
  border-bottom: 0;
}
.linker-frame-corner.bl {
  bottom: calc(50% - min(35vw, 35vh));
  left: calc(50% - min(35vw, 35vh));
  border-right: 0;
  border-top: 0;
}
.linker-frame-corner.br {
  bottom: calc(50% - min(35vw, 35vh));
  right: calc(50% - min(35vw, 35vh));
  border-left: 0;
  border-top: 0;
}

.linker-thumb {
  position: absolute;
  width: 96px;
  height: 96px;
  border-radius: 16px;
  overflow: hidden;
  border: 2px solid #fff;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
  background: #000;
  z-index: 5;
}
.linker-thumb.tl {
  top: 16px;
  left: 16px;
}
.linker-thumb.tr {
  top: 16px;
  right: 16px;
}
.linker-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.linker-thumb.is-placeholder {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  border: 2px dashed rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: 0;
  color: #fff;
  transition: background 0.15s, transform 0.15s;
}
.linker-thumb.is-placeholder:not(.is-static):hover,
.linker-thumb.is-placeholder:not(.is-static):active {
  background: rgba(0, 0, 0, 0.6);
  transform: scale(1.05);
}
.linker-thumb.is-placeholder.is-static {
  cursor: default;
  border-style: dashed;
  opacity: 0.85;
}
.linker-placeholder-inner {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}

.linker-thumb-label {
  position: absolute;
  bottom: 4px;
  left: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.65);
  color: #fff;
  border-radius: 8px;
  padding: 2px 6px;
  backdrop-filter: blur(4px);
}

.thumb-enter-active {
  animation: thumb-fly 0.5s cubic-bezier(0.2, 0.8, 0.3, 1.2);
}
.thumb-enter-from {
  transform: translate(0, 0) scale(2.5);
  opacity: 0;
}
@keyframes thumb-fly {
  0% { transform: scale(2.6); opacity: 0; }
  35% { transform: scale(1.6); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.linker-hint {
  position: absolute;
  bottom: 24px;
  left: 16px;
  right: 16px;
  text-align: center;
  font-size: 16px;
  line-height: 1.4;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
  z-index: 4;
}
.linker-hint-error {
  margin-top: 8px;
  color: #ffb4b4;
  font-size: 14px;
}
.linker-hint-flash {
  display: inline-block;
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 8px 14px;
  border-radius: 9999px;
  backdrop-filter: blur(8px);
  animation: flash-in 0.2s ease;
}
@keyframes flash-in {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.linker-success,
.linker-error,
.linker-binding {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  z-index: 20;
  text-align: center;
  padding: 24px;
}
.linker-success-icon {
  width: 96px;
  height: 96px;
  border-radius: 9999px;
  background: #10b981;
  display: grid;
  place-items: center;
  animation: pop 0.5s cubic-bezier(0.2, 0.8, 0.3, 1.2);
}
.linker-success {
  cursor: pointer;
  border: 0;
  color: #fff;
  width: 100%;
}
.linker-success h2 {
  font-size: 28px;
  font-weight: 600;
}
.linker-success p {
  font-size: 16px;
  opacity: 0.8;
}
.linker-success-hint {
  margin-top: 16px;
  font-size: 14px !important;
  opacity: 0.6 !important;
}
@keyframes pop {
  0% { transform: scale(0); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.linker-spinner {
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  border: 4px solid rgba(255, 255, 255, 0.15);
  border-top-color: #fff;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

.linker-error h2 {
  font-size: 22px;
  font-weight: 600;
}
.linker-error p {
  font-size: 15px;
  opacity: 0.8;
  max-width: 320px;
}
.linker-cta {
  margin-top: 8px;
  padding: 10px 20px;
  border-radius: 9999px;
  background: #fff;
  color: #000;
  font-weight: 500;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.hidden { display: none; }

/* ─── Help modal: «Как работает активация» ──────────────────────────── */
.help-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.help-steps li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.help-step-num {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-navy);
  font-weight: 600;
  font-size: 13px;
}

.help-qr {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: var(--color-surface);
}

/* На мобиле / планшете прячем «Открыть на телефоне» — пользователь уже
 * там, handoff-QR ему не нужен. Детектируем через touch-only pointer:
 * сюда попадают iOS/Android-смартфоны и планшеты в touch-режиме и не
 * попадают MacBook'и с трекпадом, даже если у них есть тач-экран. */
@media (hover: none) and (pointer: coarse) {
  .help-qr { display: none; }
}
.help-qr-frame {
  width: 168px;
  height: 168px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 8px;
  display: grid;
  place-items: center;
  padding: 8px;
}
.help-qr-frame img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.help-qr-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
}
.help-qr-copy {
  min-width: 0;
  flex: 1;
}

@media (max-width: 480px) {
  .help-qr { flex-direction: column; align-items: stretch; }
  .help-qr-frame { width: 100%; height: auto; aspect-ratio: 1 / 1; max-width: 220px; margin: 0 auto; }
}
</style>
