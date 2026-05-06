<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
import { EMPTY_DOC } from '~~/shared/types/instruction'

const route = useRoute()
const id = route.params.id as string
const api = useApi()
const { currentTenant, currentRole } = useAuthState()

const { data, refresh } = await useAsyncData(`instruction-${id}`, () => api<{ instruction: any }>(`/api/instructions/${id}`))
const instr = computed(() => data.value!.instruction)

const title = ref(instr.value.title)
const description = ref(instr.value.description ?? '')
const draft = ref<object>(instr.value.draftContent ?? EMPTY_DOC)
const saving = ref(false)
const lastSavedAt = ref<Date | null>(null)
const publishing = ref(false)
const requestingReview = ref(false)
const changelog = ref('')

const dirty = computed(() => true) // simple — debounced autosave below
let saveTimer: any = null

function scheduleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    saving.value = true
    try {
      await api(`/api/instructions/${id}`, {
        method: 'PATCH',
        body: { title: title.value, description: description.value, draftContent: draft.value }
      })
      lastSavedAt.value = new Date()
    } finally { saving.value = false }
  }, 800)
}

watch([title, description, draft], scheduleSave, { deep: true })

async function publish() {
  publishing.value = true
  try {
    await api(`/api/instructions/${id}/publish`, { method: 'POST', body: { changelog: changelog.value } })
    changelog.value = ''
    await refresh()
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? 'Не удалось опубликовать')
  } finally { publishing.value = false }
}

async function requestReview() {
  requestingReview.value = true
  try {
    await api(`/api/instructions/${id}/review`, { method: 'POST', body: { action: 'request', message: changelog.value } })
    await refresh()
  } finally { requestingReview.value = false }
}

async function decideReview(requestId: string, decision: 'APPROVED' | 'REJECTED') {
  await api(`/api/instructions/${id}/review`, { method: 'POST', body: { action: 'decide', requestId, decision } })
  await refresh()
}

const publicUrl = computed(() => `/${currentTenant.value?.slug}/${instr.value.slug}`)
const shortUrl = computed(() => `/s/${instr.value.shortId}`)
const pendingReview = computed(() => instr.value.reviewRequests?.find((r: any) => r.status === 'PENDING'))
</script>

<template>
  <div class="space-y-xl">
    <div class="flex items-center justify-between gap-md">
      <div class="min-w-0">
        <NuxtLink to="/dashboard/instructions" class="text-caption text-steel hover:text-ink">← Все инструкции</NuxtLink>
        <input
          v-model="title"
          class="mt-1 block w-full bg-transparent text-h2 text-ink outline-none focus:ring-0"
          placeholder="Название инструкции"
        >
      </div>
      <div class="flex items-center gap-2">
        <span class="text-caption text-steel">
          <span v-if="saving">Сохранение…</span>
          <span v-else-if="lastSavedAt">Сохранено {{ lastSavedAt.toLocaleTimeString() }}</span>
        </span>
        <UiButton variant="secondary" size="sm" :to="publicUrl" target="_blank">Открыть</UiButton>
        <UiButton variant="primary" size="sm" :loading="publishing" @click="publish">
          {{ instr.status === 'PUBLISHED' ? 'Опубликовать новую версию' : 'Опубликовать' }}
        </UiButton>
      </div>
    </div>

    <UiAlert v-if="instr.status === 'IN_REVIEW' && pendingReview && currentRole === 'OWNER'" kind="warning">
      Запрошено ревью.
      <button class="ml-2 underline" @click="decideReview(pendingReview.id, 'APPROVED')">Одобрить</button>
      <button class="ml-2 underline" @click="decideReview(pendingReview.id, 'REJECTED')">Отклонить</button>
    </UiAlert>

    <div class="grid grid-cols-1 gap-xl md:grid-cols-[1fr_300px]">
      <div>
        <UiInput v-model="description" placeholder="Краткое описание (показывается в meta)" />
        <UiCard class="mt-md p-lg">
          <ClientOnly>
            <InstructionEditor v-model="draft" placeholder="Введите «/» для команд..." />
            <template #fallback>
              <div class="min-h-[400px] animate-pulse rounded-md bg-surface" />
            </template>
          </ClientOnly>
        </UiCard>
      </div>

      <aside class="space-y-md">
        <UiCard>
          <h3 class="text-h5 mb-2">URL</h3>
          <p class="text-body-sm text-steel">Канонический</p>
          <p class="text-body-sm text-link break-all">{{ publicUrl }}</p>
          <p class="mt-2 text-body-sm text-steel">Короткая ссылка (QR)</p>
          <p class="text-body-sm text-link break-all">{{ shortUrl }}</p>
        </UiCard>

        <UiCard>
          <h3 class="text-h5 mb-2">Публикация</h3>
          <UiInput v-model="changelog" label="Что изменилось (опц.)" />
          <div class="mt-3 grid gap-2">
            <UiButton size="sm" block :loading="publishing" @click="publish">Опубликовать</UiButton>
            <UiButton variant="secondary" size="sm" block :loading="requestingReview" @click="requestReview">
              Отправить на ревью
            </UiButton>
          </div>
        </UiCard>

        <UiCard v-if="instr.versions?.length">
          <h3 class="text-h5 mb-2">История</h3>
          <ul class="space-y-1">
            <li v-for="v in instr.versions" :key="v.id" class="text-body-sm">
              <span class="text-steel">v{{ v.versionNumber }}</span>
              · {{ new Date(v.createdAt).toLocaleString() }}
              <p v-if="v.changelog" class="text-caption text-steel italic">{{ v.changelog }}</p>
            </li>
          </ul>
        </UiCard>

        <UiButton variant="secondary" :to="`/dashboard/instructions/${id}/analytics`" block>Аналитика</UiButton>
      </aside>
    </div>
  </div>
</template>
