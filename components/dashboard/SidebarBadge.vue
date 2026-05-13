<script setup lang="ts">
// Бейдж для пунктов сайдбара. Два режима:
//   - attention: маленький round-pill с иконкой «!» в красном цвете
//     (использовать для «нужно действие пользователя»)
//   - count: пилюля с числом в primary-цвете (для «есть N штук чего-то»)
// При свёрнутом сайдбаре inline-бейдж скрывается вместе с лейблом, а вместо
// него у иконки родителя появляется красная точка — родительский <NuxtLink>
// должен быть position: relative.

export type SidebarBadgeKind = 'attention' | 'count'

defineProps<{
  kind: SidebarBadgeKind
  value?: number
  title?: string
}>()
</script>

<template>
  <span
    :title="title"
    :class="[
      'grid shrink-0 place-items-center rounded-full leading-none',
      kind === 'attention'
        ? 'h-6 w-6 bg-tint-peach text-warning'
        : 'h-5 min-w-[20px] bg-primary px-1 text-[10px] font-semibold text-on-primary'
    ]"
  >
    <Icon v-if="kind === 'attention'" name="lucide:circle-alert" class="h-4 w-4" />
    <template v-else>{{ value ?? 0 }}</template>
  </span>
</template>
