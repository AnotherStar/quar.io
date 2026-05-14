<script setup lang="ts">
const { public: publicCfg } = useRuntimeConfig()
const appUrl = (publicCfg.appUrl as string).replace(/\/$/, '')
const description =
  'quar.io превращает инструкцию в канал для обратной связи, поддержки, допродаж и аналитики уже после продажи.'

useHead({
  title: 'quar.io — QR-инструкции, AI и продажи после покупки',
  meta: [
    { name: 'description', content: description },
    { property: 'og:title', content: 'quar.io — QR-инструкции, AI и продажи после покупки' },
    { property: 'og:description', content: description },
    { property: 'og:url', content: `${appUrl}/` }
  ],
  link: [{ rel: 'canonical', href: `${appUrl}/` }],
  script: [
    {
      type: 'application/ld+json',
      key: 'ld-org',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'quar.io',
        url: appUrl,
        logo: `${appUrl}/quar-logo.png`,
        description
      })
    },
    {
      type: 'application/ld+json',
      key: 'ld-website',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'quar.io',
        url: appUrl,
        inLanguage: 'ru'
      })
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
  </div>
</template>
