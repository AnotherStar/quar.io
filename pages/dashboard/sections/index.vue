<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const { data, refresh } = await useAsyncData('sections', () => api<{ sections: any[] }>('/api/sections'))
const { currentTenant } = useAuthState()
const isPaid = computed(() => currentTenant.value?.plan && currentTenant.value.plan !== 'free')

const showCreate = ref(false)
const newName = ref('')
const newDesc = ref('')
const error = ref<string | null>(null)

async function create() {
  error.value = null
  try {
    await api('/api/sections', { method: 'POST', body: { name: newName.value, description: newDesc.value } })
    showCreate.value = false; newName.value = ''; newDesc.value = ''
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.statusMessage ?? 'Ошибка'
  }
}

async function remove(id: string) {
  if (!confirm('Удалить секцию?')) return
  await api(`/api/sections/${id}`, { method: 'DELETE' })
  await refresh()
}
</script>

<template>
  <div class="space-y-xl">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-h2 text-ink">Переиспользуемые секции</h1>
        <p class="mt-1 text-body text-slate">Например: «Спасибо за покупку» или «Получи баллы за отзыв».</p>
      </div>
      <UiButton :disabled="!isPaid" @click="showCreate = true">+ Новая секция</UiButton>
    </div>

    <UiAlert v-if="!isPaid" kind="warning" title="Нужен платный тариф">
      Кастомные секции доступны на тарифе Plus и выше.
      <NuxtLink to="/dashboard/billing" class="underline">Сменить тариф</NuxtLink>
    </UiAlert>

    <UiCard v-if="data?.sections.length">
      <ul class="divide-y divide-hairline">
        <li v-for="s in data.sections" :key="s.id" class="flex items-center justify-between py-sm">
          <NuxtLink :to="`/dashboard/sections/${s.id}`" class="text-body-md text-ink hover:text-primary">{{ s.name }}</NuxtLink>
          <button class="text-caption text-error hover:underline" @click="remove(s.id)">Удалить</button>
        </li>
      </ul>
    </UiCard>

    <Teleport to="body">
      <div v-if="showCreate" class="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4" @click.self="showCreate = false">
        <UiCard class="w-full max-w-md">
          <h2 class="text-h3 mb-md">Новая секция</h2>
          <form class="grid gap-3" @submit.prevent="create">
            <UiInput v-model="newName" label="Название" required />
            <UiInput v-model="newDesc" label="Описание (опц.)" />
            <UiAlert v-if="error" kind="error">{{ error }}</UiAlert>
            <div class="flex justify-end gap-2 pt-2">
              <UiButton variant="ghost" type="button" @click="showCreate = false">Отмена</UiButton>
              <UiButton type="submit">Создать</UiButton>
            </div>
          </form>
        </UiCard>
      </div>
    </Teleport>
  </div>
</template>
