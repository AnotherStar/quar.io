<script setup lang="ts">
useHead({
  title: 'quar.io — QR-инструкции, AI и продажи после покупки',
  meta: [
    {
      name: 'description',
      content: 'quar.io превращает инструкцию в канал для обратной связи, поддержки, допродаж и аналитики уже после продажи.'
    }
  ]
})
</script>

<template>
  <div class="bg-canvas text-ink">
    <LandingMainHero />
    <LandingCaseSwiper />
    <LandingWhyQuarGrid />
    <LandingTrustSection />
    <LandingShotOrderFlow />
    <LandingPricingPlans />
    <LandingTwoScenarios />
    <LandingClosingCta />
  </div>
</template>
