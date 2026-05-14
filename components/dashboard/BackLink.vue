<script setup lang="ts">
/**
 * «← Назад к ...» — единый back-link для детальных страниц dashboard'а.
 *
 * Раньше каждая страница реализовывала по-своему: `text-link hover:underline`
 * через <button @click="router.back()">, или <NuxtLink> с `text-caption
 * text-steel`. Канонизировал один стиль: text-body-sm steel со стрелкой,
 * hover → ink. Без подчёркивания (это не inline-ссылка в тексте).
 *
 * Используется над PageHeader на детальных страницах (qr-codes/[id],
 * instructions/[id]/analytics, sections/[id]).
 */
const props = defineProps<{
  /** Целевой роут. Если не задан — будет router.back(). */
  to?: string
  /** Текст после стрелки. По умолчанию «Назад». */
  label?: string
}>()

const router = useRouter()
function onClick() {
  if (!props.to) router.back()
}
</script>

<template>
  <NuxtLink
    v-if="to"
    :to="to"
    class="inline-flex items-center gap-1 text-body-sm text-steel transition-colors hover:text-ink"
  >
    <Icon name="lucide:arrow-left" class="h-4 w-4" />
    <span>{{ label ?? 'Назад' }}</span>
  </NuxtLink>
  <button
    v-else
    type="button"
    class="inline-flex items-center gap-1 text-body-sm text-steel transition-colors hover:text-ink"
    @click="onClick"
  >
    <Icon name="lucide:arrow-left" class="h-4 w-4" />
    <span>{{ label ?? 'Назад' }}</span>
  </button>
</template>
