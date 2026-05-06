<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
const { currentTenant, user } = useAuthState()
</script>

<template>
  <div class="space-y-xl">
    <h1 class="text-h2 text-ink">Настройки</h1>
    <UiCard>
      <h3 class="text-h4 mb-2">Профиль</h3>
      <p class="text-body">Email: {{ user?.email }}</p>
      <p class="text-body">Имя: {{ user?.name ?? '—' }}</p>
    </UiCard>
    <UiCard>
      <h3 class="text-h4 mb-2">Компания</h3>
      <p class="text-body">{{ currentTenant?.name }} · /{{ currentTenant?.slug }}</p>
    </UiCard>
  </div>
</template>
