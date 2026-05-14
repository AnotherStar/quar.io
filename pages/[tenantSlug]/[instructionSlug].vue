<script setup lang="ts">
definePageMeta({ layout: 'public' })

const route = useRoute()
const tenantSlug = route.params.tenantSlug as string
const instructionSlug = route.params.instructionSlug as string

const { data, error } = await useFetch<any>(`/api/public/${tenantSlug}/${instructionSlug}`, {
  key: `pub-${tenantSlug}-${instructionSlug}`
})

if (error.value || !data.value) throw createError({ statusCode: 404, statusMessage: 'Инструкция не найдена', fatal: true })

const sessionId = useViewerSession()
const { accepted: cookieConsentAccepted } = usePublicCookieConsent()

// Make resolved section/module refs available to the read-only NodeViews
// inside <InstructionContent>. inject('publicRefs') reads this.
// Plain object — payload is fixed for the lifetime of this page.
provide('publicRefs', {
  sections: data.value!.refs.sections,
  modules: data.value!.refs.modules,
  instructionId: data.value!.instruction.id,
  versionId: data.value!.instruction.versionId,
  viewerSessionId: sessionId.value
})
provide('publicLegal', data.value!.legal)

// SEO: canonical, Open Graph и JSON-LD HowTo. Канонический URL строится от
// публичного app URL, чтобы при заходе по короткой ссылке /s/<shortId> (которая
// делает 302 на этот же путь) поисковики всё равно склеивали трафик на
// /<tenantSlug>/<instructionSlug>.
const { public: publicCfg } = useRuntimeConfig()
const appUrl = (publicCfg.appUrl as string).replace(/\/$/, '')
const canonicalUrl = computed(
  () => `${appUrl}/${data.value!.tenant.slug}/${data.value!.instruction.slug}`
)
const ogImage = computed(() => data.value!.tenant.branding?.logoUrl || `${appUrl}/icons/icon-512.png`)
const pageTitle = computed(
  () => `${data.value!.instruction.title} — ${data.value!.tenant.name}`
)
const pageDescription = computed(() => data.value!.instruction.description ?? '')

useHead({
  title: () => pageTitle.value,
  meta: [
    { name: 'description', content: () => pageDescription.value },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: () => pageTitle.value },
    { property: 'og:description', content: () => pageDescription.value },
    { property: 'og:url', content: () => canonicalUrl.value },
    { property: 'og:image', content: () => ogImage.value },
    { property: 'og:site_name', content: () => data.value!.tenant.name },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: () => pageTitle.value },
    { name: 'twitter:description', content: () => pageDescription.value },
    { name: 'twitter:image', content: () => ogImage.value }
  ],
  link: [{ rel: 'canonical', href: () => canonicalUrl.value }],
  htmlAttrs: { lang: () => data.value!.instruction.language },
  script: [
    {
      type: 'application/ld+json',
      key: 'ld-instruction',
      innerHTML: () =>
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: data.value!.instruction.title,
          description: data.value!.instruction.description ?? undefined,
          inLanguage: data.value!.instruction.language,
          url: canonicalUrl.value,
          datePublished: data.value!.instruction.publishedAt ?? undefined,
          publisher: {
            '@type': 'Organization',
            name: data.value!.tenant.name,
            logo: data.value!.tenant.branding?.logoUrl || undefined
          }
        })
    }
  ]
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
  const sec = ((data.value?.sections ?? []) as any[]).filter((s: any) => s.slot === 'before').sort((a: any, b: any) => a.position - b.position)
  const mod = ((data.value?.modules ?? []) as any[]).filter((m: any) => m.slot === 'before').sort((a: any, b: any) => a.position - b.position)
  return { sections: sec, modules: mod }
})
const afterSlots = computed(() => {
  const sec = ((data.value?.sections ?? []) as any[]).filter((s: any) => s.slot === 'after').sort((a: any, b: any) => a.position - b.position)
  const mod = ((data.value?.modules ?? []) as any[]).filter((m: any) => m.slot === 'after').sort((a: any, b: any) => a.position - b.position)
  return { sections: sec, modules: mod }
})
const sidebarSlots = computed(() => {
  const sec = ((data.value?.sections ?? []) as any[]).filter((s: any) => s.slot === 'sidebar').sort((a: any, b: any) => a.position - b.position)
  const mod = ((data.value?.modules ?? []) as any[]).filter((m: any) => m.slot === 'sidebar').sort((a: any, b: any) => a.position - b.position)
  return { sections: sec, modules: mod }
})
const hasSidebar = computed(() => sidebarSlots.value.sections.length > 0 || sidebarSlots.value.modules.length > 0)

// Anchor scroll-tracking. Walks h1/h2/h3 inside the main content wrapper,
// gives each a slug-id, and keeps location.hash synced as the reader scrolls.
// Only the main instruction content participates — sections / modules in
// before/after slots are excluded by scoping to .js-instruction-content.
useHeadingAnchors('.js-instruction-content')
</script>

<template>
  <div :style="brandingStyle" class="flex min-h-screen flex-col">
    <!-- Soft warning shown until the tenant owner verifies their email.
         Content stays fully functional underneath — это «trust nudge», не блок. -->
    <div
      v-if="data && !data.ownerEmailVerified"
      class="bg-tint-peach text-charcoal"
      role="status"
    >
      <div class="container-page py-sm flex items-start gap-3 text-body-sm">
        <Icon name="lucide:info" class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p>
          Владелец этой страницы пока не подтвердил email. Информация может оказаться
          недостоверной — относитесь к ней с осторожностью.
        </p>
      </div>
    </div>

    <header class="border-b border-hairline">
      <div class="container-page flex items-center justify-between py-md">
        <div class="flex items-center gap-3">
          <img v-if="data!.tenant.branding?.logoUrl" :src="data!.tenant.branding.logoUrl" alt="" class="h-8 w-auto">
          <span class="text-body-md text-ink">{{ data!.tenant.name }}</span>
        </div>
        <span class="text-caption text-steel">v{{ data!.instruction.versionNumber }}</span>
      </div>
    </header>

    <main
      class="container-page py-section grid grid-cols-1 gap-section flex-1"
      :class="hasSidebar ? 'md:grid-cols-[1fr_280px]' : ''"
    >
      <article id="instruction-root" class="prose-mo" :class="hasSidebar ? '' : 'mx-auto w-full max-w-[760px]'">
        <h1 class="text-h1 text-ink mb-8">{{ data!.instruction.title }}</h1>

        <template v-for="s in beforeSlots.sections" :key="s.id">
          <SectionRenderer :name="s.name" :content="s.content as object" />
        </template>
        <template v-for="m in beforeSlots.modules" :key="m.attachmentId">
          <ModuleRenderer
            :code="m.code"
            :config="m.config"
            :instruction-id="data!.instruction.id"
            :version-id="data!.instruction.versionId"
            :viewer-session-id="sessionId"
          />
        </template>

        <!-- Wrapper class is the sole hook for useHeadingAnchors so that
             only the MAIN instruction content participates in URL-hash
             tracking — section/module headings rendered in slots are
             intentionally outside this scope. -->
        <div class="js-instruction-content">
          <ClientOnly>
            <InstructionContent :content="data!.instruction.content as object" />
            <template #fallback>
              <div class="min-h-[400px] animate-pulse rounded-md bg-surface" />
            </template>
          </ClientOnly>
        </div>

        <template v-for="s in afterSlots.sections" :key="s.id">
          <SectionRenderer :name="s.name" :content="s.content as object" />
        </template>
        <template v-for="m in afterSlots.modules" :key="m.attachmentId">
          <ModuleRenderer
            :code="m.code"
            :config="m.config"
            :instruction-id="data!.instruction.id"
            :version-id="data!.instruction.versionId"
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
            :version-id="data!.instruction.versionId"
            :viewer-session-id="sessionId"
          />
        </template>
      </aside>
    </main>

    <footer class="border-t border-hairline py-md">
      <div class="container-page text-caption text-steel">
        Создано на <NuxtLink to="/" class="text-link hover:underline">quar.io</NuxtLink>
      </div>
    </footer>

    <ClientOnly>
      <AnalyticsBeacon
        v-if="cookieConsentAccepted"
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
      <PublicCookieNotice :legal="data!.legal" />
    </ClientOnly>
  </div>
</template>

<style>
.prose-mo h1 { @apply text-h1 mt-0 mb-4; }
.prose-mo h2 { @apply text-h2 mt-12 mb-3; }
.prose-mo h3 { @apply text-h3 mt-10 mb-3; }
.prose-mo p  { @apply text-body text-charcoal leading-relaxed mb-4; }
/* Apply bullets only to "regular" lists. Excluding [data-type='taskList']
 * keeps checklists clean (their rules live in global.css), and the
 * `[data-module] *` exclusion keeps any UL inside an attached module
 * (FAQ, feedback, etc.) free from prose-mo bullets. */
.prose-mo ul:not([data-type='taskList']) { @apply list-disc pl-6 mb-4; }
.prose-mo ol:not([data-type='taskList']) { @apply list-decimal pl-6 mb-4; }
.prose-mo [data-module] ul,
.prose-mo [data-module] ol { @apply list-none pl-0 mb-0; }
.prose-mo blockquote { @apply border-l-4 border-hairline-strong pl-4 italic text-charcoal my-4; }
.prose-mo img { @apply rounded-md max-w-full my-4; }
.prose-mo iframe { @apply rounded-md max-w-full my-4; }
.prose-mo code { @apply rounded-sm bg-tint-gray px-1 py-0.5 text-body-sm; }
.prose-mo pre { @apply rounded-md bg-tint-gray p-md my-4 overflow-x-auto; }
.prose-mo a { @apply text-link underline; }

/* Anchor-scroll padding so a heading lands a hair below the top edge instead
 * of glued to it — easier to read and leaves room for any future sticky bar. */
.prose-mo h1[id],
.prose-mo h2[id],
.prose-mo h3[id] {
  scroll-margin-top: 16px;
}

/* Smooth scroll for in-page hash navigation. Setting it on html (not on a
 * specific container) covers both initial-hash arrivals and any future
 * NuxtLink-with-hash clicks. */
html { scroll-behavior: smooth; }
</style>
