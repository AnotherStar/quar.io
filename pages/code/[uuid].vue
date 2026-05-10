<script setup lang="ts">
// Public entry point for a QR sticker. Decides what to do with the code:
// - bound to a published instruction → redirect to it
// - free + scanner is the tenant owner/editor → mobile linker
// - free + outsider/anonymous → "not configured" stub with owner contacts
// - unknown id → generic stub
definePageMeta({ layout: 'public' })

const route = useRoute()
const uuid = route.params.uuid as string

const { data } = await useFetch<any>(`/api/public/short/${uuid}`, {
  // 404 should still render the stub instead of throwing
  onResponseError({ response }) {
    if (response.status === 404) response._data = { kind: 'unknown' }
  }
})

const payload = computed(() => data.value ?? { kind: 'unknown' })

if (payload.value.kind === 'instruction' || payload.value.kind === 'boundQr') {
  await navigateTo(`/${payload.value.tenant.slug}/${payload.value.instruction.slug}`, { redirectCode: 302 })
} else if (payload.value.kind === 'activationQr' && payload.value.canBind) {
  await navigateTo(`/qr-codes/link?qr=${encodeURIComponent(uuid)}`, { redirectCode: 302 })
}

const tenant = computed(() => payload.value.kind === 'activationQr' ? payload.value.tenant : null)
const hasContacts = computed(() => {
  const t = tenant.value
  return !!(t?.supportEmail || t?.supportPhone || t?.supportTelegram)
})
</script>

<template>
  <main class="min-h-screen bg-surface-soft">
    <div class="container-page flex min-h-screen items-center justify-center py-section">
      <UiCard class="w-full max-w-[560px]">
        <div class="space-y-lg">
          <div class="flex items-center gap-md">
            <div
              v-if="tenant?.brandingLogoUrl"
              class="grid h-12 w-12 place-items-center overflow-hidden rounded-md border border-hairline bg-canvas"
            >
              <img :src="tenant.brandingLogoUrl" :alt="tenant.name" class="h-full w-full object-contain" >
            </div>
            <div
              v-else
              class="grid h-12 w-12 place-items-center rounded-md bg-tint-peach text-charcoal"
            >
              <Icon name="lucide:scan-line" class="h-5 w-5" />
            </div>
            <div>
              <p v-if="tenant" class="text-caption uppercase text-steel">{{ tenant.name }}</p>
              <h1 class="text-h3 text-ink">Кажется, произошла ошибка</h1>
            </div>
          </div>

          <p class="text-body text-slate">
            <template v-if="payload.kind === 'activationQr'">
              Этот QR-код ещё не настроен. Обратитесь за помощью к владельцу — указали контакты ниже.
            </template>
            <template v-else>
              Мы не нашли инструкцию по этому QR-коду. Возможно, он ещё не настроен или ссылка неверная.
            </template>
          </p>

          <div v-if="hasContacts" class="rounded-md border border-hairline bg-canvas p-md">
            <p class="mb-sm text-caption uppercase text-steel">Контакты владельца</p>
            <ul class="space-y-xs text-body">
              <li v-if="tenant?.supportEmail" class="flex items-center gap-sm">
                <Icon name="lucide:mail" class="h-4 w-4 text-steel" />
                <a :href="`mailto:${tenant.supportEmail}`" class="text-link hover:underline">{{ tenant.supportEmail }}</a>
              </li>
              <li v-if="tenant?.supportPhone" class="flex items-center gap-sm">
                <Icon name="lucide:phone" class="h-4 w-4 text-steel" />
                <a :href="`tel:${tenant.supportPhone}`" class="text-link hover:underline">{{ tenant.supportPhone }}</a>
              </li>
              <li v-if="tenant?.supportTelegram" class="flex items-center gap-sm">
                <Icon name="lucide:send" class="h-4 w-4 text-steel" />
                <a :href="`https://t.me/${tenant.supportTelegram.replace(/^@/, '')}`" target="_blank" rel="noopener" class="text-link hover:underline">
                  @{{ tenant.supportTelegram.replace(/^@/, '') }}
                </a>
              </li>
            </ul>
          </div>

          <div class="rounded-md bg-surface px-md py-sm text-body-sm text-steel">
            Ваш код: <span class="font-mono text-charcoal">{{ uuid }}</span>
          </div>
        </div>
      </UiCard>
    </div>
  </main>
</template>
