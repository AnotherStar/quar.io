<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

/**
 * Раздел «Настройки». Три таба:
 *   - profile — данные пользователя (email, имя, выход из аккаунта)
 *   - company — компания, юридический профиль, брендинг
 *   - billing — тариф и оплата (бывший /dashboard/billing)
 *
 * Активный таб берётся из ?tab= в URL и пишется обратно через router.replace,
 * чтобы deep-link и refresh страницы сохраняли выбор. Старый маршрут
 * /dashboard/billing редиректит сюда с ?tab=billing.
 *
 * Историческое значение `?tab=settings` (когда профиль и компания были в
 * одной вкладке) нормализуется в `profile` — чтобы старые ссылки не
 * приводили на пустую страницу.
 */

const api = useApi()
const { currentTenant, currentRole, user, refresh } = useAuthState()
const route = useRoute()
const router = useRouter()

type SettingsTab = 'profile' | 'company' | 'billing'

function normalizeTab(q: unknown): SettingsTab {
  if (q === 'billing') return 'billing'
  if (q === 'company') return 'company'
  return 'profile'
}

const tab = ref<SettingsTab>(normalizeTab(route.query.tab))

const tabItems: Array<{ value: SettingsTab; label: string }> = [
  { value: 'profile', label: 'Профиль' },
  { value: 'company', label: 'Компания' },
  { value: 'billing', label: 'Тариф' }
]

watch(tab, (next) => {
  const query = { ...route.query }
  if (next === 'profile') delete query.tab
  else query.tab = next
  router.replace({ query })
})

// Если кто-то открыл ?tab=foo — нормализуем в дефолтный без перезагрузки.
watch(
  () => route.query.tab,
  (q) => {
    const next = normalizeTab(q)
    if (next !== tab.value) tab.value = next
  }
)

// ── Settings tab ─────────────────────────────────────────────────────────
const logoInput = ref<HTMLInputElement | null>(null)
const uploadingLogo = ref(false)
const removingLogo = ref(false)
const logoProgress = ref(0)
const logoError = ref<string | null>(null)
const logoSaved = ref(false)
const legalSaved = ref(false)
const legalSaving = ref(false)
const legalError = ref<string | null>(null)
const publishDefaultDocuments = ref(true)
const legalForm = reactive({
  legalName: '',
  inn: '',
  ogrn: '',
  address: '',
  pdEmail: '',
  policyUrl: ''
})

const canManageCompany = computed(() => currentRole.value === 'OWNER')
const logoUrl = computed(() => currentTenant.value?.brandingLogoUrl ?? null)
const legalKey = computed(() => `tenant-legal-${currentTenant.value?.id ?? 'none'}`)
const { data: legalData, refresh: refreshLegal } = await useAsyncData(
  legalKey,
  () => api<{ profile: any | null; documents: any[] }>('/api/settings/legal'),
  {
    default: () => ({ profile: null, documents: [] }),
    watch: [() => currentTenant.value?.id]
  }
)

watch(
  () => legalData.value?.profile,
  (profile) => {
    legalForm.legalName = profile?.legalName ?? ''
    legalForm.inn = profile?.inn ?? ''
    legalForm.ogrn = profile?.ogrn ?? ''
    legalForm.address = profile?.address ?? ''
    legalForm.pdEmail = profile?.pdEmail ?? ''
    legalForm.policyUrl = profile?.policyUrl ?? ''
  },
  { immediate: true }
)

function pickLogo() {
  if (!canManageCompany.value || uploadingLogo.value) return
  logoInput.value?.click()
}

async function onLogoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  logoError.value = null
  logoSaved.value = false

  if (!file.type.startsWith('image/')) {
    logoError.value = 'Выберите файл изображения.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    logoError.value = 'Логотип должен быть меньше 5 МБ.'
    return
  }

  uploadingLogo.value = true
  logoProgress.value = 0
  try {
    const uploaded = await uploadFile(file, (p) => {
      logoProgress.value = Math.round((p.loaded / p.total) * 100)
    })
    if (!uploaded.assetId) throw new Error('Logo asset was not confirmed')

    await api('/api/settings/tenant', {
      method: 'PATCH',
      body: { brandingLogoUrl: uploaded.url, logoAssetId: uploaded.assetId }
    })
    await refresh()
    logoSaved.value = true
  } catch (e: any) {
    logoError.value = e?.data?.statusMessage ?? 'Не удалось загрузить логотип.'
  } finally {
    uploadingLogo.value = false
    logoProgress.value = 0
  }
}

async function removeLogo() {
  if (!canManageCompany.value || !logoUrl.value) return
  logoError.value = null
  logoSaved.value = false
  removingLogo.value = true
  try {
    await api('/api/settings/tenant', {
      method: 'PATCH',
      body: { brandingLogoUrl: null }
    })
    await refresh()
    logoSaved.value = true
  } catch (e: any) {
    logoError.value = e?.data?.statusMessage ?? 'Не удалось удалить логотип.'
  } finally {
    removingLogo.value = false
  }
}

const loggingOut = ref(false)
async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    // Сбрасываем клиентский стейт useAuthState — иначе guest-middleware на
    // /auth/login увидит «залогиненного» пользователя и отбросит обратно
    // в /dashboard, где API-запросы уже падают без сессии.
    await refresh()
    await navigateTo('/')
  } finally {
    loggingOut.value = false
  }
}

async function saveLegalProfile() {
  if (!canManageCompany.value) return
  legalError.value = null
  legalSaved.value = false
  legalSaving.value = true
  try {
    await api('/api/settings/legal', {
      method: 'PATCH',
      body: {
        ...legalForm,
        publishDefaultDocuments: publishDefaultDocuments.value
      }
    })
    await refreshLegal()
    legalSaved.value = true
  } catch (e: any) {
    legalError.value = e?.data?.statusMessage
      ?? e?.data?.message
      ?? e?.statusMessage
      ?? 'Не удалось сохранить юридические настройки. Проверьте заполненные поля.'
  } finally {
    legalSaving.value = false
  }
}

// ── Billing tab ──────────────────────────────────────────────────────────
const billingKey = computed(() => `billing-state-${currentTenant.value?.id ?? 'none'}`)
const { data: billingData, refresh: refreshBilling } = await useAsyncData(
  billingKey,
  () => api<any>('/api/billing/state'),
  {
    watch: [() => currentTenant.value?.id]
  }
)

const activatingTrial = ref(false)
const trialError = ref<string | null>(null)

async function startTrial() {
  if (!confirm('Активировать триал на 30 дней? Доступны все Plus-функции, лимит инструкций (3) сохраняется.')) return
  activatingTrial.value = true
  trialError.value = null
  try {
    await api('/api/billing/trial', { method: 'POST' })
    await Promise.all([refreshBilling(), refresh()])
  } catch (e: any) {
    trialError.value = e?.data?.statusMessage ?? 'Ошибка'
  } finally {
    activatingTrial.value = false
  }
}

const trialBlocked = computed(() =>
  !!billingData.value?.trial?.trialUsedAt
  || (billingData.value?.plan !== 'free' && billingData.value?.status === 'active')
)
</script>

<template>
  <div>
    <PageHeader icon="lucide:settings" title="Настройки" />

    <div class="mt-sm space-y-xl">
      <div class="flex items-center justify-between gap-md">
        <UiSegmentedTabs v-model="tab" :tabs="tabItems" />
      </div>

      <Transition name="tab-content" mode="out-in">
        <!-- ── Tab: Профиль ──────────────────────────────────────────── -->
        <div v-if="tab === 'profile'" key="profile" class="space-y-xl">
          <!-- Плашка «завершите регистрацию / подтвердите email». Раньше висела
               в шапке дашборда; теперь — отдельным блоком над карточкой профиля,
               а в сайдбаре дополнительно горит attention-бейдж. -->
          <DashboardEmailVerifyBanner />

          <div class="rounded-lg bg-surface p-xl">
            <div class="flex flex-col gap-md md:flex-row md:items-start md:justify-between">
              <div>
                <div class="flex items-center gap-3">
                  <Icon name="lucide:user-round" class="h-5 w-5 text-navy opacity-50" />
                  <h3 class="text-h4 text-navy">Профиль</h3>
                </div>
                <p class="mt-md text-body text-charcoal">Email: {{ user?.email || '—' }}</p>
                <p class="text-body text-charcoal">Имя: {{ user?.name ?? '—' }}</p>
              </div>
              <UiButton variant="secondary" :loading="loggingOut" @click="logout">
                <Icon name="lucide:log-out" class="h-4 w-4" />
                Выйти из аккаунта
              </UiButton>
            </div>
          </div>
        </div>

        <!-- ── Tab: Компания ─────────────────────────────────────────── -->
        <div v-else-if="tab === 'company'" key="company" class="space-y-xl">
          <div class="rounded-lg bg-surface p-xl">
            <div class="flex items-center gap-3">
              <Icon name="lucide:building-2" class="h-5 w-5 text-navy opacity-50" />
              <h3 class="text-h4 text-navy">Компания</h3>
            </div>
            <p class="mt-md text-body text-charcoal">{{ currentTenant?.name }} · /{{ currentTenant?.slug }}</p>
          </div>

          <div class="rounded-lg bg-surface p-xl">
            <div class="flex flex-col gap-lg">
              <div>
                <div class="flex items-center gap-3">
                  <Icon name="lucide:shield-check" class="h-5 w-5 text-navy opacity-50" />
                  <h3 class="text-h4 text-navy">Юридический профиль оператора</h3>
                </div>
                <p class="mt-sm text-body-sm text-steel">
                  Эти реквизиты показываются покупателю на публичных QR-формах. quar.io указывается как техническая платформа.
                </p>
              </div>

              <div class="grid gap-md md:grid-cols-2">
                <UiInput v-model="legalForm.legalName" label="Полное наименование / ИП" placeholder="ООО «Компания»" :disabled="!canManageCompany" />
                <UiInput v-model="legalForm.pdEmail" type="email" label="Email для обращений по персональным данным" placeholder="privacy@company.ru" :disabled="!canManageCompany" />
                <UiInput v-model="legalForm.inn" label="ИНН" :disabled="!canManageCompany" />
                <UiInput v-model="legalForm.ogrn" label="ОГРН / ОГРНИП" :disabled="!canManageCompany" />
                <UiInput v-model="legalForm.policyUrl" type="url" label="Ссылка на политику обработки персональных данных" placeholder="https://company.ru/privacy" :disabled="!canManageCompany" />
                <UiInput v-model="legalForm.address" label="Юридический адрес" :disabled="!canManageCompany" />
              </div>

              <label class="flex items-start gap-2 text-body-sm text-charcoal">
                <input v-model="publishDefaultDocuments" type="checkbox" class="mt-1 h-4 w-4 rounded border-hairline-strong" :disabled="!canManageCompany">
                <span>Опубликовать новые типовые версии согласий и cookie-уведомления после сохранения</span>
              </label>

              <div class="flex flex-wrap items-center gap-sm">
                <UiButton :loading="legalSaving" :disabled="!canManageCompany" @click="saveLegalProfile">
                  <Icon name="lucide:shield-check" class="h-4 w-4" />
                  Сохранить юридический профиль
                </UiButton>
                <span class="text-caption text-steel">Активных документов: {{ legalData?.documents.length ?? 0 }}</span>
              </div>

              <UiAlert v-if="legalError" kind="error">{{ legalError }}</UiAlert>
              <UiAlert v-else-if="legalSaved" kind="success">Юридические настройки сохранены.</UiAlert>
              <UiAlert v-else-if="!canManageCompany" kind="warning">Изменять юридический профиль может только владелец.</UiAlert>
            </div>
          </div>

          <div class="rounded-lg bg-surface p-xl">
            <div class="flex flex-col gap-lg md:flex-row md:items-start md:justify-between">
              <div>
                <div class="flex items-center gap-3">
                  <Icon name="lucide:image" class="h-5 w-5 text-navy opacity-50" />
                  <h3 class="text-h4 text-navy">Брендинг</h3>
                </div>
                <p class="mt-md text-body text-charcoal">Логотип компании</p>
                <p class="mt-1 text-caption text-steel">PNG, JPG, WebP или SVG до 5 МБ.</p>
              </div>

              <div class="w-full max-w-sm space-y-md">
                <div class="flex min-h-24 items-center justify-center rounded-md bg-canvas p-md">
                  <img
                    v-if="logoUrl"
                    :src="logoUrl"
                    alt=""
                    class="max-h-16 max-w-full object-contain"
                  >
                  <div v-else class="flex items-center gap-2 text-body-sm text-steel">
                    <Icon name="lucide:image" class="h-4 w-4" />
                    Логотип не загружен
                  </div>
                </div>

                <input
                  ref="logoInput"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  :disabled="!canManageCompany || uploadingLogo"
                  @change="onLogoSelected"
                >

                <div class="flex flex-wrap gap-sm">
                  <UiButton
                    variant="secondary"
                    :loading="uploadingLogo"
                    :disabled="!canManageCompany || removingLogo"
                    @click="pickLogo"
                  >
                    <Icon name="lucide:upload" class="h-4 w-4" />
                    {{ logoUrl ? 'Заменить' : 'Загрузить' }}
                  </UiButton>
                  <UiButton
                    v-if="logoUrl"
                    variant="ghost"
                    :loading="removingLogo"
                    :disabled="!canManageCompany || uploadingLogo"
                    @click="removeLogo"
                  >
                    <Icon name="lucide:trash-2" class="h-4 w-4" />
                    Удалить
                  </UiButton>
                </div>

                <div v-if="uploadingLogo" class="h-1.5 overflow-hidden rounded-full bg-surface">
                  <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${logoProgress}%` }" />
                </div>
                <UiAlert v-if="logoError" kind="error">{{ logoError }}</UiAlert>
                <UiAlert v-else-if="logoSaved" kind="success">Настройки сохранены.</UiAlert>
                <UiAlert v-else-if="!canManageCompany" kind="warning">Изменять настройки компании может только владелец.</UiAlert>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Tab: Тариф ─────────────────────────────────────────────── -->
        <div v-else-if="tab === 'billing'" key="billing" class="space-y-xl">
          <div class="rounded-lg bg-surface p-xl">
            <div class="flex items-start justify-between gap-md">
              <div>
                <p class="text-caption-bold text-steel uppercase tracking-wide">Текущий тариф</p>
                <p class="mt-2 text-h2 capitalize text-navy">{{ billingData?.plan }}</p>
                <div class="mt-2 flex items-center gap-2">
                  <UiBadge v-if="billingData?.status === 'trialing'" variant="tag-orange">TRIAL</UiBadge>
                  <UiBadge v-else-if="billingData?.status === 'active' && billingData?.plan !== 'free'" variant="tag-green">ACTIVE</UiBadge>
                  <UiBadge v-else variant="tag-gray">{{ billingData?.status }}</UiBadge>
                </div>
              </div>
              <div v-if="billingData?.trial?.isTrialing" class="text-right">
                <p class="text-caption-bold text-steel uppercase tracking-wide">Триал заканчивается через</p>
                <p class="mt-2 text-h3 text-navy">{{ billingData.trial.daysLeft }} дн.</p>
                <p class="mt-0.5 text-caption text-steel">{{ new Date(billingData.currentPeriodEnd).toLocaleDateString() }}</p>
              </div>
            </div>
          </div>

          <div v-if="billingData?.trial?.isTrialing" class="rounded-lg bg-surface p-xl">
            <div class="flex items-center gap-3">
              <Icon name="lucide:gift" class="h-5 w-5 text-navy opacity-50" />
              <h3 class="text-h4 text-navy">Что включено в триале</h3>
            </div>
            <ul class="mt-md space-y-1 text-body-sm text-charcoal">
              <li>✓ Кастомные секции</li>
              <li>✓ Модули (warranty-registration, ...)</li>
              <li>✓ Approval workflow</li>
              <li>✓ Расширенная аналитика (1 год)</li>
              <li class="text-steel">⚠️ Лимит инструкций — 3, чтобы по окончании триала ничего не пропало</li>
            </ul>
            <p class="mt-md text-caption text-steel">
              После окончания триала платные функции отключатся. Кастомные секции и модули останутся в БД,
              но перестанут отображаться на публичных страницах до подключения платного пакета.
              Сами инструкции продолжат работать.
            </p>
          </div>

          <div v-else-if="!trialBlocked" class="rounded-lg bg-surface p-xl">
            <div class="flex items-center gap-3">
              <Icon name="lucide:sparkles" class="h-5 w-5 text-navy opacity-50" />
              <h3 class="text-h4 text-navy">Запустить триал Plus на 30 дней</h3>
            </div>
            <p class="mt-sm text-body text-slate">
              Все функции Plus — кастомные секции, модули, workflow одобрения. Лимит инструкций
              остаётся 3, чтобы по окончании триала ничего не пропало.
            </p>
            <UiAlert v-if="trialError" kind="error" class="mt-md">{{ trialError }}</UiAlert>
            <UiButton class="mt-md" :loading="activatingTrial" @click="startTrial">Активировать триал</UiButton>
          </div>

          <div v-else-if="billingData?.trial?.trialUsedAt" class="rounded-lg bg-surface p-xl">
            <div class="flex items-center gap-3">
              <Icon name="lucide:check-circle-2" class="h-5 w-5 text-navy opacity-50" />
              <h3 class="text-h4 text-navy">Триал уже использован</h3>
            </div>
            <p class="mt-sm text-body text-slate">
              Триал был активирован {{ new Date(billingData.trial.trialUsedAt).toLocaleDateString() }}.
              Для постоянного доступа к платным функциям подключите оплату.
            </p>
          </div>

          <UiAlert kind="info" title="Биллинг ещё не подключён">
            Реальная оплата (Stripe / ЮKassa) — в TODO. Сейчас доступен только триал.
          </UiAlert>
        </div>
      </Transition>
    </div>
  </div>
</template>
