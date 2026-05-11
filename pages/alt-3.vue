<script setup lang="ts">
import {
  landingBonusFeatures,
  landingMetrics,
  landingPackages,
  landingReportRows,
  landingStorySlides
} from '~/components/landing/content'

useHead({
  title: 'quar.io — альтернативные landing-секции',
  meta: [
    {
      name: 'description',
      content: 'Рабочая страница со всеми landing-секциями quar.io для сравнения, микса и доработки.'
    }
  ]
})
</script>

<template>
  <div class="bg-canvas text-ink">
    <LandingShotMarketplaceHero />
    <LandingShotProblemUseCases />
    <LandingShotOrderFlow />
    <LandingShotAnalyticsDashboard />
    <LandingShotBonusStack />
    <LandingShotSavingsCalculator />
    <LandingShotStartHero />

    <section class="border-y border-hairline bg-canvas">
      <div class="container-page py-section-sm">
        <p class="text-caption-bold uppercase text-steel">Альтернативные секции</p>
        <h2 class="mt-3 text-h3 text-navy">Блоки из предыдущей версии главной для микса и доработки.</h2>
      </div>
    </section>

    <LandingHero />
    <LandingMetricsStrip :metrics="landingMetrics" />
    <LandingProductStory :slides="landingStorySlides" />
    <LandingBonusFeatures :features="landingBonusFeatures" />
    <LandingAnalyticsPreview :rows="landingReportRows" />
    <LandingPackages :packages="landingPackages" />
    <LandingFinalCta />
  </div>
</template>
