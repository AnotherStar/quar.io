<script setup lang="ts">
// Placeholder — UI for "Пикнуть QR" lives here once implemented.
definePageMeta({ layout: 'dashboard', middleware: 'auth' })
</script>

<template>
  <div class="space-y-xl">
    <div>
      <h1 class="text-h2 text-ink">Пикнуть QR</h1>
      <p class="mt-1 text-body text-slate">
        Сканировать QR-код инструкции и быстро открыть нужную страницу.
      </p>
    </div>

    <UiCard>
      <div class="flex flex-col items-start gap-3 py-md">
        <UiBadge variant="tag-orange">В разработке</UiBadge>
        <p class="text-body text-charcoal">
          Раздел появится позже. Заглушка стоит специально, чтобы не забыть.
        </p>
      </div>
    </UiCard>
  </div>
</template>
