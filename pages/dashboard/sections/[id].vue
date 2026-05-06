<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
import { EMPTY_DOC } from '~~/shared/types/instruction'

const route = useRoute()
const id = route.params.id as string
const api = useApi()
const { data } = await useAsyncData(`section-${id}`, () => api<{ section: any }>(`/api/sections/${id}`))
const sec = computed(() => data.value!.section)

const name = ref(sec.value.name)
const description = ref(sec.value.description ?? '')
const content = ref<object>(sec.value.content ?? EMPTY_DOC)
const saving = ref(false)
let timer: any = null

watch([name, description, content], () => {
  clearTimeout(timer)
  timer = setTimeout(async () => {
    saving.value = true
    await api(`/api/sections/${id}`, { method: 'PATCH', body: { name: name.value, description: description.value, content: content.value } })
    saving.value = false
  }, 800)
}, { deep: true })
</script>

<template>
  <div class="space-y-xl">
    <NuxtLink to="/dashboard/sections" class="text-caption text-steel hover:text-ink">← Все секции</NuxtLink>
    <UiInput v-model="name" placeholder="Название секции" />
    <UiInput v-model="description" placeholder="Описание (опц.)" />
    <UiCard padded="lg">
      <ClientOnly>
        <InstructionEditor v-model="content" placeholder="Контент секции..." />
        <template #fallback>
          <div class="min-h-[400px] animate-pulse rounded-md bg-surface" />
        </template>
      </ClientOnly>
    </UiCard>
    <p class="text-caption text-steel">{{ saving ? 'Сохранение…' : 'Автосохранение включено' }}</p>
  </div>
</template>
