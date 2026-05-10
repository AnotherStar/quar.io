<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const { currentTenant, currentRole, user, refresh } = useAuthState()

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
    await navigateTo('/auth/login')
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
</script>

<template>
  <div class="space-y-xl">
    <h1 class="text-h2 text-ink">Настройки</h1>
    <UiCard>
      <div class="flex flex-col gap-md md:flex-row md:items-start md:justify-between">
        <div>
          <h3 class="text-h4 mb-2">Профиль</h3>
          <p class="text-body">Email: {{ user?.email }}</p>
          <p class="text-body">Имя: {{ user?.name ?? '—' }}</p>
        </div>
        <UiButton variant="secondary" :loading="loggingOut" @click="logout">
          <Icon name="lucide:log-out" class="h-4 w-4" />
          Выйти из аккаунта
        </UiButton>
      </div>
    </UiCard>
    <UiCard>
      <h3 class="text-h4 mb-2">Компания</h3>
      <p class="text-body">{{ currentTenant?.name }} · /{{ currentTenant?.slug }}</p>
    </UiCard>
    <UiCard>
      <div class="flex flex-col gap-lg">
        <div>
          <h3 class="text-h4 mb-2">Юридический профиль оператора</h3>
          <p class="text-body-sm text-steel">
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
    </UiCard>
    <UiCard>
      <div class="flex flex-col gap-lg md:flex-row md:items-start md:justify-between">
        <div>
          <h3 class="text-h4 mb-2">Брендинг</h3>
          <p class="text-body text-charcoal">Логотип компании</p>
          <p class="mt-1 text-caption text-steel">PNG, JPG, WebP или SVG до 5 МБ.</p>
        </div>

        <div class="w-full max-w-sm space-y-md">
          <div class="flex min-h-24 items-center justify-center rounded-md border border-hairline bg-surface p-md">
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
    </UiCard>
  </div>
</template>
