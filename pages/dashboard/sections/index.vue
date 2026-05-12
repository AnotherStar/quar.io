<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const api = useApi()
const { currentTenant } = useAuthState()
const sectionsKey = computed(() => `sections-${currentTenant.value?.id ?? 'none'}`)
const { data, pending } = await useAsyncData(
  sectionsKey,
  () => api<{ sections: any[] }>('/api/sections'),
  {
    default: () => ({ sections: [] }),
    watch: [() => currentTenant.value?.id]
  }
)
const isPaid = computed(() => currentTenant.value?.plan && currentTenant.value.plan !== 'free')

function isEmpty(content: any): boolean {
  if (!content?.content?.length) return true
  return content.content.every((n: any) => !n.content?.length && !n.attrs?.src)
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:blocks" title="Секции">
      <template #actions>
        <UiButton v-if="isPaid" to="/dashboard/sections/new">
          <Icon name="lucide:plus" class="h-4 w-4" />
          Создать
        </UiButton>
        <UiButton v-else disabled>
          <Icon name="lucide:plus" class="h-4 w-4" />
          Создать
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm space-y-xl">

    <UiAlert v-if="!isPaid" kind="warning" title="Нужен платный тариф">
      Кастомные секции доступны на тарифе Plus и выше.
      <NuxtLink to="/dashboard/billing" class="underline">Сменить тариф</NuxtLink>
    </UiAlert>

    <UiCard v-if="pending && !data?.sections.length">
      <p class="py-md text-body text-steel">Загружаю секции…</p>
    </UiCard>

    <div v-else class="space-y-md">
      <NuxtLink
        v-for="s in data?.sections ?? []"
        :key="s.id"
        :to="`/dashboard/sections/${s.id}`"
        class="group block rounded-lg bg-surface p-xs transition-shadow duration-150 hover:shadow-[0_3px_8px_-1px_rgba(0,0,0,0.18)]"
      >
        <div class="px-xs pb-sm pt-xs">
          <h3 class="text-h5 text-ink group-hover:text-primary">{{ s.name }}</h3>
          <p v-if="s.description" class="mt-0.5 text-body-sm text-steel">{{ s.description }}</p>
        </div>
        <div class="relative max-h-[260px] overflow-hidden rounded-md bg-canvas px-xl py-md">
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

      <!-- «Add new» карточка — той же геометрии, что и секции. Показывается
           только на платных тарифах; на бесплатном пользователь уже видит
           warning-алерт выше с CTA на биллинг. -->
      <NuxtLink
        v-if="isPaid"
        to="/dashboard/sections/new"
        class="group block rounded-lg bg-surface p-xs transition-shadow duration-150 hover:shadow-[0_3px_8px_-1px_rgba(0,0,0,0.18)]"
      >
        <div class="px-xs pb-sm pt-xs">
          <h3 class="text-h5 text-ink group-hover:text-primary">Создайте свою секцию</h3>
          <p class="mt-0.5 text-body-sm text-steel">
            Любой переиспользуемый блок: «Спасибо за покупку», «Оставьте отзыв», промо, FAQ.
            Создаётся один раз — подключается в любую инструкцию.
          </p>
        </div>
        <div class="relative flex h-[160px] items-center justify-center rounded-md bg-canvas">
          <div class="flex flex-col items-center gap-2 text-stone">
            <Icon name="lucide:plus" class="h-8 w-8" />
            <span class="text-body-sm-md">Добавить новую секцию</span>
          </div>
        </div>
      </NuxtLink>
    </div>
    </div>
  </div>
</template>
