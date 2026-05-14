<script setup lang="ts">
// Публичный landing для коротких ссылок /s/<shortId>. Сам по себе экран
// почти ничего не рисует — это маршрутизатор:
//
//   • QR с привязанной опубликованной инструкцией → редирект на публичную
//     страницу инструкции
//   • QR без инструкции + у viewer'а есть права на этот tenant → редирект
//     в дашборд-активатор /qr-codes/link?qr=<shortId>
//   • QR без инструкции + viewer залогинен, но в другом tenant'е →
//     «Это не ваш ШК»
//   • QR без инструкции + viewer аноним → «ШК не привязан к инструкции»
definePageMeta({ layout: 'public' })

const route = useRoute()
const shortId = route.params.shortId as string
const { data, error } = await useFetch<any>(`/api/public/short/${shortId}`)
if (error.value || !data.value) throw createError({ statusCode: 404, fatal: true })

if (data.value.kind === 'instruction' || data.value.kind === 'boundQr') {
  await navigateTo(`/${data.value.tenant.slug}/${data.value.instruction.slug}`, { redirectCode: 302 })
}

// Для kind === 'activationQr' решаем по полям, выданным API:
//   canBind=true            → залогинен И принадлежит tenant'у QR
//   viewerAuthenticated     → залогинен (вне зависимости от tenant'а)
const activation = computed(() => data.value?.kind === 'activationQr' ? data.value : null)

if (activation.value?.canBind) {
  await navigateTo(`/qr-codes/link?qr=${encodeURIComponent(shortId)}`, { redirectCode: 302 })
}

const isAuthenticated = computed(() => !!activation.value?.viewerAuthenticated)
</script>

<template>
  <main class="min-h-screen bg-surface">
    <div class="container-page flex min-h-screen items-center justify-center py-section">
      <UiCard class="w-full max-w-[560px]">
        <div v-if="activation" class="space-y-lg">
          <template v-if="isAuthenticated">
            <!-- Залогинен, но это чужой tenant. -->
            <div>
              <div class="mb-sm inline-flex h-10 w-10 items-center justify-center rounded-md bg-tint-peach text-ink">
                <Icon name="lucide:shield-x" class="h-5 w-5" />
              </div>
              <h1 class="text-h3 text-ink">Это не ваш ШК</h1>
              <p class="mt-2 text-body text-steel">
                Этот QR-код принадлежит другой компании. Активировать его может только владелец аккаунта «{{ activation.tenant.name }}».
              </p>
            </div>
            <UiButton to="/dashboard" variant="secondary">
              <Icon name="lucide:arrow-left" class="h-4 w-4" />
              В дашборд
            </UiButton>
          </template>

          <template v-else>
            <!-- Аноним: QR ещё не привязан к инструкции, показывать нечего. -->
            <div>
              <div class="mb-sm inline-flex h-10 w-10 items-center justify-center rounded-md bg-tint-sky text-ink">
                <Icon name="lucide:link-2-off" class="h-5 w-5" />
              </div>
              <h1 class="text-h3 text-ink">ШК не привязан к инструкции</h1>
              <p class="mt-2 text-body text-steel">
                Этот QR-код напечатан заранее, но владелец ещё не связал его с инструкцией к товару.
              </p>
            </div>
            <UiButton :to="`/auth/login?return=${encodeURIComponent(`/s/${shortId}`)}`" variant="secondary">
              <Icon name="lucide:log-in" class="h-4 w-4" />
              Войти как владелец
            </UiButton>
          </template>
        </div>
      </UiCard>
    </div>
  </main>
</template>
