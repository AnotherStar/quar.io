<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const { data, refresh } = await useAsyncData('instructions', () => api<{ instructions: any[] }>('/api/instructions'))

const tab = ref<'active' | 'archive'>('active')
const visible = computed(() => {
  const list = data.value?.instructions ?? []
  return tab.value === 'archive'
    ? list.filter((i) => i.status === 'ARCHIVED')
    : list.filter((i) => i.status !== 'ARCHIVED')
})
const counts = computed(() => {
  const list = data.value?.instructions ?? []
  return {
    active: list.filter((i) => i.status !== 'ARCHIVED').length,
    archive: list.filter((i) => i.status === 'ARCHIVED').length
  }
})

const creating = ref(false)
const createError = ref<string | null>(null)

// "+ Новая" creates an empty draft instantly and navigates to the editor.
async function createNew() {
  creating.value = true; createError.value = null
  try {
    const slug = `untitled-${Math.random().toString(36).slice(2, 8)}`
    const { instruction } = await api<{ instruction: any }>('/api/instructions', {
      method: 'POST',
      body: { title: 'Без названия', slug, language: 'ru' }
    })
    await navigateTo(`/dashboard/instructions/${instruction.id}/edit`)
  } catch (e: any) {
    createError.value = e?.data?.statusMessage ?? 'Ошибка'
  } finally { creating.value = false }
}

async function archive(id: string) {
  if (!confirm('Перенести в архив? Публичная страница перестанет открываться, данные сохранятся.')) return
  await api(`/api/instructions/${id}/archive`, { method: 'POST' })
  await refresh()
}

async function unarchive(id: string) {
  try {
    await api(`/api/instructions/${id}/unarchive`, { method: 'POST' })
    await refresh()
  } catch (e: any) {
    alert(e?.data?.statusMessage ?? 'Не удалось восстановить')
  }
}
</script>

<template>
  <div class="space-y-xl">
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-h2 text-ink">Инструкции</h1>
      <UiButton :loading="creating" @click="createNew">+ Новая</UiButton>
    </div>

    <UiAlert v-if="createError" kind="error">{{ createError }}</UiAlert>

    <div class="flex items-center gap-1 border-b border-hairline">
      <button
        :class="['px-md py-sm text-body-sm-md transition-colors',
          tab === 'active' ? 'border-b-2 border-ink text-ink' : 'border-b-2 border-transparent text-steel hover:text-ink']"
        @click="tab = 'active'"
      >
        Активные · {{ counts.active }}
      </button>
      <button
        :class="['px-md py-sm text-body-sm-md transition-colors',
          tab === 'archive' ? 'border-b-2 border-ink text-ink' : 'border-b-2 border-transparent text-steel hover:text-ink']"
        @click="tab = 'archive'"
      >
        Архив · {{ counts.archive }}
      </button>
    </div>

    <UiCard>
      <table v-if="visible.length" class="w-full">
        <thead>
          <tr class="border-b border-hairline text-caption text-steel uppercase">
            <th class="pb-sm text-left">Название</th>
            <th class="pb-sm text-left">Slug</th>
            <th class="pb-sm text-left">Язык</th>
            <th class="pb-sm text-left">Статус</th>
            <th class="pb-sm text-right">Обновлено</th>
            <th class="pb-sm" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in visible" :key="i.id" class="border-b border-hairline-soft">
            <td class="py-sm">
              <NuxtLink :to="`/dashboard/instructions/${i.id}/edit`" class="text-body-md text-ink hover:text-primary">{{ i.title }}</NuxtLink>
            </td>
            <td class="py-sm text-body-sm text-steel">{{ i.slug }}</td>
            <td class="py-sm text-body-sm text-steel">{{ i.language }}</td>
            <td class="py-sm">
              <UiBadge :variant="i.status === 'PUBLISHED' ? 'tag-green' : i.status === 'ARCHIVED' ? 'tag-orange' : i.status === 'IN_REVIEW' ? 'tag-orange' : 'tag-purple'">
                {{ i.status }}
              </UiBadge>
            </td>
            <td class="py-sm text-right text-caption text-steel whitespace-nowrap">{{ new Date(i.updatedAt).toLocaleDateString() }}</td>
            <td class="py-sm text-right whitespace-nowrap">
              <button
                v-if="i.status !== 'ARCHIVED'"
                class="text-caption text-steel hover:text-error hover:underline"
                @click="archive(i.id)"
              >В архив</button>
              <button
                v-else
                class="text-caption text-steel hover:text-ink hover:underline"
                @click="unarchive(i.id)"
              >Восстановить</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="py-md text-body text-steel">
        {{ tab === 'archive' ? 'Архив пуст.' : 'Пока пусто. Создайте первую инструкцию.' }}
      </p>
    </UiCard>
  </div>
</template>
