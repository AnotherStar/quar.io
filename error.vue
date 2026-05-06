<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; message: string } }>()
const handle = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="container-page flex min-h-screen flex-col items-center justify-center text-center">
    <p class="text-caption-bold text-steel uppercase tracking-widest">{{ props.error.statusCode }}</p>
    <h1 class="mt-2 text-h2 text-ink">{{ props.error.message || 'Что-то пошло не так' }}</h1>
    <UiButton class="mt-6" @click="handle">На главную</UiButton>
  </div>
</template>
