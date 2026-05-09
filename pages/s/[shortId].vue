<script setup lang="ts">
definePageMeta({ layout: 'public' })

const route = useRoute()
const shortId = route.params.shortId as string
const { data, error, refresh } = await useFetch<any>(`/api/public/short/${shortId}`)
if (error.value || !data.value) throw createError({ statusCode: 404, fatal: true })

if (data.value.kind === 'instruction' || data.value.kind === 'boundQr') {
  await navigateTo(`/${data.value.tenant.slug}/${data.value.instruction.slug}`, { redirectCode: 302 })
}

const barcode = ref('')
const binding = ref(false)
const bindError = ref<string | null>(null)
const cameraError = ref<string | null>(null)
const scanning = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)

let stream: MediaStream | null = null
let frameId: number | null = null
let detector: any = null

const activation = computed(() => data.value?.kind === 'activationQr' ? data.value : null)
const canBind = computed(() => !!activation.value?.canBind)

onMounted(async () => {
  if (canBind.value) await startScanner()
})

onBeforeUnmount(stopScanner)

async function startScanner() {
  if (!import.meta.client || scanning.value) return
  if (!(window as any).BarcodeDetector) {
    cameraError.value = 'Камера доступна, но браузер не поддерживает распознавание ШК. Введите код вручную.'
    return
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = 'Браузер не дал доступ к камере. Введите ШК вручную.'
    return
  }

  try {
    detector = new (window as any).BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf']
    })
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    })
    if (!videoRef.value) return
    videoRef.value.srcObject = stream
    await videoRef.value.play()
    scanning.value = true
    scanFrame()
  } catch (e: any) {
    cameraError.value = e?.message ?? 'Не удалось запустить камеру. Введите ШК вручную.'
    stopScanner()
  }
}

async function scanFrame() {
  if (!scanning.value || !videoRef.value || !detector) return
  try {
    const matches = await detector.detect(videoRef.value)
    const value = matches?.[0]?.rawValue
    if (value) {
      barcode.value = value
      await bind()
      return
    }
  } catch {
    cameraError.value = 'Не удалось распознать ШК с камеры. Можно ввести код вручную.'
  }
  frameId = window.requestAnimationFrame(scanFrame)
}

function stopScanner() {
  scanning.value = false
  if (frameId !== null && import.meta.client) window.cancelAnimationFrame(frameId)
  frameId = null
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
}

async function bind() {
  const value = barcode.value.trim()
  if (!value || binding.value) return

  binding.value = true
  bindError.value = null
  stopScanner()

  try {
    const result = await $fetch<any>(`/api/public/short/${shortId}/bind`, {
      method: 'POST',
      body: { barcode: value }
    })
    const tenantSlug = activation.value?.tenant.slug
    await refresh()
    await navigateTo(`/${tenantSlug}/${result.instruction.slug}`)
  } catch (e: any) {
    bindError.value = e?.data?.statusMessage ?? 'Не удалось привязать QR'
    binding.value = false
    await startScanner()
  }
}
</script>

<template>
  <main class="min-h-screen bg-surface-soft">
    <div class="container-page flex min-h-screen items-center justify-center py-section">
      <UiCard class="w-full max-w-[560px]">
        <div v-if="activation" class="space-y-lg">
          <div>
            <div class="mb-sm inline-flex h-10 w-10 items-center justify-center rounded-md bg-tint-mint text-ink">
              <Icon name="lucide:scan-barcode" class="h-5 w-5" />
            </div>
            <h1 class="text-h3 text-ink">QR ещё не привязан</h1>
            <p class="mt-2 text-body text-slate">
              {{ activation.tenant.name }} сможет связать его с инструкцией по штрихкоду товара.
            </p>
          </div>

          <template v-if="canBind">
            <div class="overflow-hidden rounded-md border border-hairline bg-ink">
              <video ref="videoRef" class="aspect-[4/3] w-full object-cover" muted playsinline />
            </div>

            <UiAlert v-if="cameraError" kind="warning">{{ cameraError }}</UiAlert>
            <UiAlert v-if="bindError" kind="error">{{ bindError }}</UiAlert>

            <form class="flex flex-col gap-sm sm:flex-row" @submit.prevent="bind">
              <UiInput
                v-model="barcode"
                class="flex-1"
                label="ШК товара"
                placeholder="Например 4601234567890"
                autocomplete="off"
              />
              <UiButton class="self-end" :loading="binding" :disabled="!barcode.trim()">
                <Icon name="lucide:link" class="h-4 w-4" />
                Привязать
              </UiButton>
            </form>
          </template>

          <template v-else>
            <UiAlert kind="info">
              Этот QR напечатан заранее, но пока не связан с товаром. Для привязки нужно войти в аккаунт владельца.
            </UiAlert>
            <UiButton to="/auth/login" variant="secondary">
              <Icon name="lucide:log-in" class="h-4 w-4" />
              Войти
            </UiButton>
          </template>
        </div>
      </UiCard>
    </div>
  </main>
</template>
