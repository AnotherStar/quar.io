<script setup lang="ts">
// Short-id fallback URL: /s/<shortId> → resolves and 302s to canonical /:tenantSlug/:instructionSlug.
// Data is fetched server-side so no flash.
const route = useRoute()
const shortId = route.params.shortId as string
const { data, error } = await useFetch(`/api/public/short/${shortId}`)
if (error.value || !data.value) throw createError({ statusCode: 404, fatal: true })

await navigateTo(`/${data.value.tenant.slug}/${data.value.instruction.slug}`, { redirectCode: 302 })
</script>

<template>
  <div />
</template>
