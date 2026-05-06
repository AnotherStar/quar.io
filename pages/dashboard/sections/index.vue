<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const { data } = await useAsyncData('sections', () => api<{ sections: any[] }>('/api/sections'))
const { currentTenant } = useAuthState()
const isPaid = computed(() => currentTenant.value?.plan && currentTenant.value.plan !== 'free')

function isEmpty(content: any): boolean {
  if (!content?.content?.length) return true
  return content.content.every((n: any) => !n.content?.length && !n.attrs?.src)
}
</script>

<template>
  <div class="space-y-xl">
    <div class="flex items-center justify-between gap-md">
      <div>
        <h1 class="text-h2 text-ink">Переиспользуемые секции</h1>
        <p class="mt-1 text-body text-slate">Например: «Спасибо за покупку» или «Получи баллы за отзыв».</p>
      </div>
      <UiButton v-if="isPaid" to="/dashboard/sections/new">
        <Icon name="lucide:plus" class="h-4 w-4" />
        Новая секция
      </UiButton>
      <UiButton v-else disabled>
        <Icon name="lucide:plus" class="h-4 w-4" />
        Новая секция
      </UiButton>
    </div>

    <UiAlert v-if="!isPaid" kind="warning" title="Нужен платный тариф">
      Кастомные секции доступны на тарифе Plus и выше.
      <NuxtLink to="/dashboard/billing" class="underline">Сменить тариф</NuxtLink>
    </UiAlert>

    <div v-if="data?.sections.length" class="space-y-md">
      <NuxtLink
        v-for="s in data.sections"
        :key="s.id"
        :to="`/dashboard/sections/${s.id}`"
        class="group relative block overflow-hidden rounded-lg border border-hairline bg-canvas transition-shadow hover:shadow-card"
      >
        <div class="border-b border-hairline px-xl py-md">
          <h3 class="text-h5 text-ink group-hover:text-primary">{{ s.name }}</h3>
          <p v-if="s.description" class="mt-0.5 text-body-sm text-steel">{{ s.description }}</p>
        </div>
        <div class="relative max-h-[260px] overflow-hidden bg-canvas px-xl py-md">
          <div v-if="isEmpty(s.content)" class="py-md text-body-sm text-stone">
            Пусто — нажмите чтобы наполнить
          </div>
          <div v-else class="pointer-events-none">
            <ClientOnly>
              <InstructionContent :content="s.content" />
            </ClientOnly>
          </div>
          <div class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-canvas to-transparent" />
        </div>
      </NuxtLink>
    </div>

    <UiCard v-else>
      <p class="py-md text-body text-steel">Пока нет секций. Создайте первую — она будет доступна для вставки в любую инструкцию.</p>
    </UiCard>
  </div>
</template>
