<script setup lang="ts">
/**
 * Старый маршрут /dashboard/billing — теперь раздел «Тариф» живёт как
 * вкладка внутри /dashboard/settings. Здесь делаем редирект (синхронно
 * в SSR, чтобы не было промежуточного рендера), сохраняя поведение
 * внешних ссылок и закладок.
 */
definePageMeta({
  middleware: [
    () => navigateTo('/dashboard/settings?tab=billing', { redirectCode: 301 })
  ]
})
</script>

<template>
  <div />
</template>
