<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
import { EMPTY_DOC } from '~~/shared/types/instruction'

const route = useRoute()
const routeId = route.params.id as string
const isNew = routeId === 'new'
const api = useApi()
const { currentTenant } = useAuthState()

// For an existing section: fetch from API.
// For "/new": skip the fetch and start with an empty section in memory.
// On the first autosave we POST to create it, then swap the URL to the
// real id so refresh / share-links work.
const { data } = await useAsyncData(
  computed(() => `section-${currentTenant.value?.id ?? 'none'}-${routeId}`),
  () => isNew ? Promise.resolve({ section: null }) : api<{ section: any }>(`/api/sections/${routeId}`),
  {
    default: () => ({ section: null }),
    watch: [() => currentTenant.value?.id]
  }
)

if (!isNew && !data.value?.section) {
  throw createError({ statusCode: 404, statusMessage: 'Секция не найдена', fatal: true })
}

const initial = data.value?.section ?? { name: 'Без названия', description: '', content: EMPTY_DOC }

// `currentId` starts as null when on /new; once first save creates the row,
// it becomes the real id and subsequent saves are PATCH.
const currentId = ref<string | null>(isNew ? null : routeId)

const name = ref(initial.name)
const description = ref(initial.description ?? '')
const content = ref<object>(initial.content ?? EMPTY_DOC)
const saving = ref(false)
const deleting = ref(false)
let timer: any = null
let createInFlight: Promise<void> | null = null

async function persist() {
  saving.value = true
  try {
    if (currentId.value) {
      await api(`/api/sections/${currentId.value}`, {
        method: 'PATCH',
        body: { name: name.value, description: description.value, content: content.value }
      })
    } else {
      // Dedupe concurrent creates: if one is already running, wait for it
      if (createInFlight) { await createInFlight; await persist(); return }
      createInFlight = (async () => {
        const { section } = await api<{ section: any }>('/api/sections', {
          method: 'POST',
          body: { name: name.value, description: description.value, content: content.value }
        })
        currentId.value = section.id
        // Swap URL from /new to the real id without a navigation/reload
        if (import.meta.client) {
          window.history.replaceState({}, '', `/dashboard/sections/${section.id}`)
        }
      })()
      try { await createInFlight } finally { createInFlight = null }
    }
  } finally { saving.value = false }
}

watch([name, description, content], () => {
  clearTimeout(timer)
  timer = setTimeout(persist, 800)
}, { deep: true })

async function remove() {
  if (!currentId.value) {
    // Nothing was saved yet — just go back
    await navigateTo('/dashboard/sections')
    return
  }
  if (!confirm('Удалить секцию? Если она вставлена в инструкции, эти места просто перестанут отображаться.')) return
  deleting.value = true
  try {
    await api(`/api/sections/${currentId.value}`, { method: 'DELETE' })
    await navigateTo('/dashboard/sections')
  } finally { deleting.value = false }
}
</script>

<template>
  <div class="space-y-xl">
    <div class="flex items-center justify-between gap-md">
      <NuxtLink to="/dashboard/sections" class="text-caption text-steel hover:text-ink">← Все секции</NuxtLink>
      <span class="text-caption text-steel">
        <span v-if="saving">Сохранение…</span>
        <span v-else-if="!currentId">Не сохранено</span>
        <span v-else>Автосохранение включено</span>
      </span>
    </div>

    <UiInput v-model="name" placeholder="Название секции" />
    <UiInput v-model="description" placeholder="Описание (опц.)" />

    <div>
      <ClientOnly>
        <InstructionEditor v-model="content" placeholder="Контент секции..." disable-section-refs />
        <template #fallback>
          <div class="min-h-[400px] animate-pulse rounded-md bg-surface" />
        </template>
      </ClientOnly>
    </div>

    <hr class="border-hairline">

    <div class="flex justify-end">
      <button
        class="inline-flex items-center gap-2 rounded-md border border-hairline px-md py-sm text-body-sm-md text-steel transition-colors hover:border-error hover:text-error"
        :disabled="deleting"
        @click="remove"
      >
        <Icon name="lucide:trash-2" class="h-4 w-4" />
        {{ currentId ? 'Удалить секцию' : 'Отменить' }}
      </button>
    </div>
  </div>
</template>
