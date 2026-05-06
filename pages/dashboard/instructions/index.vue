<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const { data, refresh } = await useAsyncData('instructions', () => api<{ instructions: any[] }>('/api/instructions'))

const showCreate = ref(false)
const form = reactive({ title: '', slug: '', language: 'ru' })
const creating = ref(false)
const createError = ref<string | null>(null)

watch(() => form.title, (t) => {
  if (!form.slug) form.slug = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
})

async function create() {
  creating.value = true; createError.value = null
  try {
    const { instruction } = await api<{ instruction: any }>('/api/instructions', { method: 'POST', body: form })
    showCreate.value = false
    await navigateTo(`/dashboard/instructions/${instruction.id}/edit`)
  } catch (e: any) {
    createError.value = e?.data?.statusMessage ?? 'Ошибка'
  } finally { creating.value = false }
}
</script>

<template>
  <div class="space-y-xl">
    <div class="flex items-center justify-between">
      <h1 class="text-h2 text-ink">Инструкции</h1>
      <UiButton @click="showCreate = true">+ Новая</UiButton>
    </div>

    <UiCard>
      <table v-if="data?.instructions.length" class="w-full">
        <thead>
          <tr class="border-b border-hairline text-caption text-steel uppercase">
            <th class="pb-sm text-left">Название</th>
            <th class="pb-sm text-left">Slug</th>
            <th class="pb-sm text-left">Язык</th>
            <th class="pb-sm text-left">Статус</th>
            <th class="pb-sm text-right">Обновлено</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in data.instructions" :key="i.id" class="border-b border-hairline-soft">
            <td class="py-sm">
              <NuxtLink :to="`/dashboard/instructions/${i.id}/edit`" class="text-body-md text-ink hover:text-primary">{{ i.title }}</NuxtLink>
            </td>
            <td class="py-sm text-body-sm text-steel">{{ i.slug }}</td>
            <td class="py-sm text-body-sm text-steel">{{ i.language }}</td>
            <td class="py-sm">
              <UiBadge :variant="i.status === 'PUBLISHED' ? 'tag-green' : i.status === 'IN_REVIEW' ? 'tag-orange' : 'tag-purple'">
                {{ i.status }}
              </UiBadge>
            </td>
            <td class="py-sm text-right text-caption text-steel">{{ new Date(i.updatedAt).toLocaleDateString() }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="py-md text-body text-steel">Пока пусто. Создайте первую инструкцию.</p>
    </UiCard>

    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4" @click.self="showCreate = false">
        <UiCard class="w-full max-w-md">
          <h2 class="text-h3 mb-md">Новая инструкция</h2>
          <form class="grid gap-3" @submit.prevent="create">
            <UiInput v-model="form.title" label="Название" required />
            <UiInput v-model="form.slug" label="Slug" hint="Латиница, цифры, дефис" required />
            <UiInput v-model="form.language" label="Язык" hint="ru, en, de..." required />
            <UiAlert v-if="createError" kind="error">{{ createError }}</UiAlert>
            <div class="flex justify-end gap-2 pt-2">
              <UiButton variant="ghost" type="button" @click="showCreate = false">Отмена</UiButton>
              <UiButton type="submit" :loading="creating">Создать</UiButton>
            </div>
          </form>
        </UiCard>
      </div>
    </Teleport>
  </div>
</template>
