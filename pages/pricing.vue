<script setup lang="ts">
// /pricing — standalone-страница, использующая ту же карточечную секцию, что
// и главная (LandingPricingPlans). Так гарантирована согласованность цен,
// формулировок и CTA: правки в одном компоненте отражаются и здесь, и на
// главной — без расхождения.
const { public: publicCfg } = useRuntimeConfig()
const appUrl = (publicCfg.appUrl as string).replace(/\/$/, '')
const pricingDescription =
  'Тарифы quar.io: пилот, каталог и индивидуальные планы для размещения интерактивных инструкций к товарам.'
useHead({
  title: 'Тарифы — quar.io',
  meta: [
    { name: 'description', content: pricingDescription },
    { property: 'og:title', content: 'Тарифы — quar.io' },
    { property: 'og:description', content: pricingDescription },
    { property: 'og:url', content: `${appUrl}/pricing` }
  ],
  link: [{ rel: 'canonical', href: `${appUrl}/pricing` }]
})

const { track } = useTrackGoal()
onMounted(() => track('pricing_view'))
</script>

<template>
  <div class="bg-canvas text-ink">
    <LandingPricingPlans />
  </div>
</template>
