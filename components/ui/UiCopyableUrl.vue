<script setup lang="ts">
// Reusable URL row: shows the URL (default slot or plain text), with two
// trailing icon buttons — copy-to-clipboard and download-as-QR-code.
//
// Why a slot: most consumers just need the plain URL, but some surfaces want
// custom rendering (a NuxtLink, a styled badge, truncation rules). The slot
// receives `{ url }` so the consumer can use the same value the buttons act
// on without duplicating it.
//
// QR generation is lazy: the `qrcode` library is dynamically imported on
// first download, so it doesn't bloat the initial dashboard bundle for
// pages that never trigger it.

const props = withDefaults(defineProps<{
  /** The URL used by both copy and QR-download. Required. */
  url: string
  /** Filename for the downloaded PNG (without extension). Defaults to a
   *  slug derived from the URL's pathname. */
  qrFilename?: string
  /** QR PNG size in pixels (square). Default 512 — looks crisp at print
   *  sizes and works fine on mobile screens. */
  qrSize?: number
  /** Hide the QR button entirely (e.g. for non-shareable URLs). */
  hideQr?: boolean
}>(), {
  qrSize: 512,
  hideQr: false
})

const copied = ref(false)
const downloading = ref(false)
const error = ref<string | null>(null)

async function copy() {
  error.value = null
  try {
    await navigator.clipboard.writeText(props.url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch (e) {
    error.value = (e as Error).message
  }
}

function deriveFilename(): string {
  if (props.qrFilename) return props.qrFilename
  try {
    const u = new URL(props.url)
    const slug = u.pathname.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || u.hostname
    return `qr-${slug || 'link'}`
  } catch {
    return 'qr-code'
  }
}

async function downloadQr() {
  error.value = null
  downloading.value = true
  try {
    // Dynamic import keeps qrcode out of the eager dashboard bundle.
    const QRCode = (await import('qrcode')).default
    const dataUrl = await QRCode.toDataURL(props.url, {
      width: props.qrSize,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#1a1a1a', light: '#ffffff' }
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `${deriveFilename()}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch (e) {
    error.value = (e as Error).message ?? 'Не удалось сгенерировать QR'
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center gap-2 rounded-md border border-hairline bg-surface px-sm py-2">
      <div class="flex-1 min-w-0 truncate text-body-sm text-charcoal">
        <slot :url="url">{{ url }}</slot>
      </div>
      <button
        type="button"
        class="inline-flex items-center justify-center rounded-sm p-1.5 text-charcoal transition-colors hover:bg-canvas"
        :title="copied ? 'Скопировано' : 'Копировать ссылку'"
        @click="copy"
      >
        <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="h-4 w-4" />
      </button>
      <button
        v-if="!hideQr"
        type="button"
        class="inline-flex items-center justify-center rounded-sm p-1.5 text-charcoal transition-colors hover:bg-canvas disabled:cursor-wait disabled:opacity-50"
        :title="'Скачать QR-код'"
        :disabled="downloading"
        @click="downloadQr"
      >
        <Icon
          :name="downloading ? 'lucide:loader-circle' : 'lucide:qr-code'"
          class="h-4 w-4"
          :class="downloading ? 'animate-spin' : ''"
        />
      </button>
    </div>
    <p v-if="error" class="mt-1 text-caption text-error">{{ error }}</p>
  </div>
</template>
