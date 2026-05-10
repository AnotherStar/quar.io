<script setup lang="ts">
defineProps<{ legal: any }>()

const { accepted, accept } = usePublicCookieConsent()
const detailsOpen = ref(false)
</script>

<template>
  <template v-if="!accepted">
    <div class="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-canvas/95 backdrop-blur">
      <div class="container-page flex flex-col gap-md py-md md:flex-row md:items-center md:justify-between">
        <p class="text-body-sm text-charcoal">Мы используем cookies для работы сайта и аналитики.</p>

        <div class="flex flex-wrap items-center gap-sm">
          <UiButton variant="link" size="sm" @click="detailsOpen = true">Подробнее</UiButton>
          <UiButton size="sm" @click="accept">Хорошо</UiButton>
        </div>
      </div>
    </div>

    <UiModal v-model:open="detailsOpen" title="Как используются cookies" size="md">
      <div class="space-y-md text-body-sm text-charcoal">
        <p>
          Cookies помогают странице корректно работать и позволяют понять, как посетители читают инструкцию.
        </p>
        <p>
          После согласия quar.io сохраняет технический идентификатор посетителя и события просмотра: открытие страницы, глубину чтения и обратную связь по блокам инструкции.
        </p>
        <p>
          Эти данные использует оператор страницы: {{ legal?.operator?.operatorName ?? 'владелец инструкции' }}. Они нужны, чтобы улучшать инструкцию и находить непонятные места.
        </p>
      </div>

      <template #footer>
        <div class="flex justify-end gap-sm">
          <UiButton variant="secondary" size="sm" @click="detailsOpen = false">Закрыть</UiButton>
          <UiButton size="sm" @click="accept">Принять</UiButton>
        </div>
      </template>
    </UiModal>
  </template>
</template>
