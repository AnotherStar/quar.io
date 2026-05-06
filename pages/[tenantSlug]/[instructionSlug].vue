<script setup lang="ts">
definePageMeta({ layout: 'public' })

const route = useRoute()
const tenantSlug = route.params.tenantSlug as string
const instructionSlug = route.params.instructionSlug as string

const { data, error } = await useFetch(`/api/public/${tenantSlug}/${instructionSlug}`, {
  key: `pub-${tenantSlug}-${instructionSlug}`
})

if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Инструкция не найдена', fatal: true })

const sessionId = useViewerSession()

useHead({
  title: () => `${data.value!.instruction.title} — ${data.value!.tenant.name}`,
  meta: [{ name: 'description', content: () => data.value!.instruction.description ?? '' }],
  htmlAttrs: { lang: () => data.value!.instruction.language }
})

// Branding override (paid plan only)
const brandingStyle = computed(() => {
  const b = data.value?.tenant.branding
  if (!b) return ''
  return [
    b.primaryColor ? `--color-primary:${b.primaryColor};` : '',
    b.fontFamily ? `font-family:${b.fontFamily};` : ''
  ].join('')
})

const beforeSlots = computed(() => {
  const sec = (data.value?.sections ?? []).filter((s) => s.slot === 'before').sort((a, b) => a.position - b.position)
  const mod = (data.value?.modules ?? []).filter((m) => m.slot === 'before').sort((a, b) => a.position - b.position)
  return { sections: sec, modules: mod }
})
const afterSlots = computed(() => {
  const sec = (data.value?.sections ?? []).filter((s) => s.slot === 'after').sort((a, b) => a.position - b.position)
  const mod = (data.value?.modules ?? []).filter((m) => m.slot === 'after').sort((a, b) => a.position - b.position)
  return { sections: sec, modules: mod }
})
const sidebarSlots = computed(() => {
  const sec = (data.value?.sections ?? []).filter((s) => s.slot === 'sidebar').sort((a, b) => a.position - b.position)
  const mod = (data.value?.modules ?? []).filter((m) => m.slot === 'sidebar').sort((a, b) => a.position - b.position)
  return { sections: sec, modules: mod }
})
</script>

<template>
  <div :style="brandingStyle">
    <header class="border-b border-hairline">
      <div class="container-page flex items-center justify-between py-md">
        <div class="flex items-center gap-3">
          <img v-if="data!.tenant.branding?.logoUrl" :src="data!.tenant.branding.logoUrl" alt="" class="h-8 w-auto">
          <span class="text-body-md text-ink">{{ data!.tenant.name }}</span>
        </div>
        <span class="text-caption text-steel">v{{ data!.instruction.versionNumber }}</span>
      </div>
    </header>

    <main class="container-page py-section grid grid-cols-1 gap-section md:grid-cols-[1fr_280px]">
      <article id="instruction-root" class="prose-mo">
        <h1 class="text-h1 text-ink mb-4">{{ data!.instruction.title }}</h1>
        <p v-if="data!.instruction.description" class="text-subtitle text-slate mb-8">{{ data!.instruction.description }}</p>

        <template v-for="s in beforeSlots.sections" :key="s.id">
          <SectionRenderer :name="s.name" :content="s.content as object" />
        </template>
        <template v-for="m in beforeSlots.modules" :key="m.attachmentId">
          <ModuleRenderer
            :code="m.code"
            :config="m.config"
            :instruction-id="data!.instruction.id"
            :viewer-session-id="sessionId"
          />
        </template>

        <ClientOnly>
          <InstructionContent :content="data!.instruction.content as object" />
          <template #fallback>
            <div class="min-h-[400px] animate-pulse rounded-md bg-surface" />
          </template>
        </ClientOnly>

        <template v-for="s in afterSlots.sections" :key="s.id">
          <SectionRenderer :name="s.name" :content="s.content as object" />
        </template>
        <template v-for="m in afterSlots.modules" :key="m.attachmentId">
          <ModuleRenderer
            :code="m.code"
            :config="m.config"
            :instruction-id="data!.instruction.id"
            :viewer-session-id="sessionId"
          />
        </template>
      </article>

      <aside v-if="sidebarSlots.sections.length || sidebarSlots.modules.length" class="space-y-md">
        <template v-for="s in sidebarSlots.sections" :key="s.id">
          <UiCard>
            <h3 class="text-h5 mb-2">{{ s.name }}</h3>
            <ClientOnly>
              <InstructionContent :content="s.content as object" />
            </ClientOnly>
          </UiCard>
        </template>
        <template v-for="m in sidebarSlots.modules" :key="m.attachmentId">
          <ModuleRenderer
            :code="m.code"
            :config="m.config"
            :instruction-id="data!.instruction.id"
            :viewer-session-id="sessionId"
          />
        </template>
      </aside>
    </main>

    <footer class="border-t border-hairline py-md">
      <div class="container-page text-caption text-steel">
        Создано на <NuxtLink to="/" class="text-link hover:underline">ManualOnline</NuxtLink>
      </div>
    </footer>

    <ClientOnly>
      <AnalyticsBeacon
        :instruction-id="data!.instruction.id"
        :version-id="data!.instruction.versionId"
        :session-id="sessionId"
      />
      <BlockFeedback
        :instruction-id="data!.instruction.id"
        :version-id="data!.instruction.versionId"
        :session-id="sessionId"
        root-selector="#instruction-root"
      />
      <InstructionSearch root-selector="#instruction-root" />
    </ClientOnly>
  </div>
</template>

<style>
.prose-mo h1 { @apply text-h1 mt-0 mb-4; }
.prose-mo h2 { @apply text-h2 mt-12 mb-3; }
.prose-mo h3 { @apply text-h3 mt-10 mb-3; }
.prose-mo p  { @apply text-body text-charcoal leading-relaxed mb-4; }
.prose-mo ul { @apply list-disc pl-6 mb-4; }
.prose-mo ol { @apply list-decimal pl-6 mb-4; }
.prose-mo blockquote { @apply border-l-4 border-hairline-strong pl-4 italic text-charcoal my-4; }
.prose-mo img { @apply rounded-md max-w-full my-4; }
.prose-mo iframe { @apply rounded-md max-w-full my-4; }
.prose-mo code { @apply rounded-sm bg-tint-gray px-1 py-0.5 text-body-sm; }
.prose-mo pre { @apply rounded-md bg-tint-gray p-md my-4 overflow-x-auto; }
.prose-mo a { @apply text-link underline; }
</style>
