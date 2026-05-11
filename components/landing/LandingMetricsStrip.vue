<script setup lang="ts">
import type { LandingMetric } from './content'

defineProps<{
  metrics: LandingMetric[]
}>()
</script>

<template>
  <section class="border-b border-hairline bg-canvas">
    <div class="container-page grid gap-sm py-lg sm:grid-cols-3">
      <LandingMetricCard
        v-for="metric in metrics"
        :key="metric.metric"
        :metric="metric.metric"
        :label="metric.label"
        :icon="metric.icon"
      />
    </div>
  </section>
</template>
