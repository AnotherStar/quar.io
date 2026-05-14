<script setup lang="ts">
// SEO: помечаем приватные/служебные разделы как noindex, чтобы они не попадали
// в поисковую выдачу (auth, dashboard, короткие ссылки-редиректы, демо).
// Открытые разделы (/, /pricing, /investors, /legal/*, /<tenant>/<instruction>)
// остаются индексируемыми по умолчанию.
const route = useRoute()

const noindexRoute = computed(() => {
  const p = route.path
  return (
    p.startsWith('/dashboard') ||
    p.startsWith('/auth') ||
    p.startsWith('/s/') ||
    p.startsWith('/qr-codes') ||
    p.startsWith('/landing-editor-demo') ||
    /^\/alt-\d+$/.test(p)
  )
})

useHead({
  meta: [
    {
      name: 'robots',
      content: () => (noindexRoute.value ? 'noindex, nofollow' : 'index, follow')
    }
  ]
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
