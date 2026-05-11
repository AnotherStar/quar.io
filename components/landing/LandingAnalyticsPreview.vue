<script setup lang="ts">
import type { LandingReportRow } from './content'

defineProps<{
  rows: LandingReportRow[]
}>()
</script>

<template>
  <section class="border-b border-hairline bg-canvas">
    <div class="container-page py-section-lg">
      <LandingSectionHeading
        eyebrow="Статистика и улучшения"
        title="Понимайте, что работает, а что превращает покупателя в недовольного."
        copy="quar.io показывает не только просмотры. Он помогает увидеть непонятные шаги, повторяющиеся вопросы, слабые места инструкции и товары, где QR-канал нужно улучшить первым."
      />

      <div class="mt-section grid gap-md md:grid-cols-3">
        <LandingMetricCard
          v-for="row in rows"
          :key="row.label"
          :metric="row.value"
          :label="`${row.label} · ${row.caption}`"
          :icon="row.icon"
        />
      </div>
    </div>
  </section>
</template>
