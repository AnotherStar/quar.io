<script setup lang="ts">
import type { BlogArticle, BlogArticleMeta } from '~~/shared/types/blog'
import { getClusterByCode } from '~~/shared/constants/blogClusters'

definePageMeta({ layout: 'default' })

const route = useRoute()
const slug = route.params.slug as string

const { public: publicCfg } = useRuntimeConfig()
const appUrl = (publicCfg.appUrl as string).replace(/\/$/, '')

const { data, error } = await useFetch<{ article: BlogArticle; related: BlogArticleMeta[] }>(
  `/api/blog/${slug}`,
  { key: `blog-${slug}` }
)

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Статья не найдена', fatal: true })
}

const article = computed(() => data.value!.article)
const related = computed(() => data.value!.related)
const cluster = computed(() => getClusterByCode(article.value.cluster))

const canonicalUrl = computed(() => `${appUrl}/blog/${article.value.slug}`)
const ogImage = computed(() =>
  article.value.coverImage
    ? `${appUrl}${article.value.coverImage}`
    : `${appUrl}/blog/og/${article.value.slug}.png`
)
const pageTitle = computed(() => `${article.value.title} — quar.io`)

const breadcrumbs = computed(() => [
  { name: 'Главная', url: `${appUrl}/` },
  { name: 'Блог', url: `${appUrl}/blog` },
  { name: article.value.title, url: canonicalUrl.value }
])

const articleJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: article.value.title,
  description: article.value.description,
  inLanguage: 'ru',
  datePublished: article.value.publishedAt,
  dateModified: article.value.updatedAt,
  mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl.value },
  image: ogImage.value,
  author: { '@type': 'Organization', name: 'quar.io', url: appUrl },
  publisher: {
    '@type': 'Organization',
    name: 'quar.io',
    logo: { '@type': 'ImageObject', url: `${appUrl}/quar-logo.png` }
  }
}))

const faqJsonLd = computed(() => {
  if (!article.value.faq.length) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.value.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer }
    }))
  }
})

const breadcrumbJsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: breadcrumbs.value.map((b, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: b.name,
    item: b.url
  }))
}))

useHead({
  title: () => pageTitle.value,
  meta: [
    { name: 'description', content: () => article.value.description },
    { property: 'og:type', content: 'article' },
    { property: 'og:title', content: () => pageTitle.value },
    { property: 'og:description', content: () => article.value.description },
    { property: 'og:url', content: () => canonicalUrl.value },
    { property: 'og:image', content: () => ogImage.value },
    { property: 'og:site_name', content: 'quar.io' },
    { property: 'article:published_time', content: () => article.value.publishedAt },
    { property: 'article:modified_time', content: () => article.value.updatedAt },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: () => pageTitle.value },
    { name: 'twitter:description', content: () => article.value.description },
    { name: 'twitter:image', content: () => ogImage.value }
  ],
  link: [{ rel: 'canonical', href: () => canonicalUrl.value }],
  script: [
    {
      type: 'application/ld+json',
      key: 'ld-article',
      innerHTML: () => JSON.stringify(articleJsonLd.value)
    },
    {
      type: 'application/ld+json',
      key: 'ld-breadcrumbs',
      innerHTML: () => JSON.stringify(breadcrumbJsonLd.value)
    },
    ...(faqJsonLd.value
      ? [
          {
            type: 'application/ld+json',
            key: 'ld-faq',
            innerHTML: () => JSON.stringify(faqJsonLd.value)
          }
        ]
      : [])
  ]
})

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  return new Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
}
</script>

<template>
  <main class="container-page mx-auto max-w-3xl py-section">
    <nav aria-label="breadcrumb" class="text-body-sm text-steel">
      <ol class="flex flex-wrap items-center gap-1">
        <li>
          <NuxtLink to="/" class="hover:underline" itemprop="item">
            <span itemprop="name">Главная</span>
          </NuxtLink>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <NuxtLink to="/blog" class="hover:underline">Блог</NuxtLink>
        </li>
        <li aria-hidden="true">/</li>
        <li class="text-ink">{{ article.title }}</li>
      </ol>
    </nav>

    <article class="mt-md">
      <header class="border-b border-hairline pb-md">
        <div class="flex flex-wrap items-center gap-2 text-caption text-steel">
          <NuxtLink
            v-if="cluster"
            :to="`/blog#cluster-${cluster.code}`"
            class="rounded bg-tint-blue px-2 py-0.5 text-primary hover:underline"
          >
            {{ cluster.name }}
          </NuxtLink>
          <span v-if="article.pillar" class="rounded bg-tint-peach px-2 py-0.5 text-warning">
            Обзорная статья
          </span>
          <time :datetime="article.publishedAt">{{ formatDate(article.publishedAt) }}</time>
          <span v-if="article.readingTime" aria-hidden="true">·</span>
          <span v-if="article.readingTime">{{ article.readingTime }} мин чтения</span>
        </div>

        <h1 class="mt-3 text-h1 text-ink">{{ article.title }}</h1>
        <p class="mt-md text-body-lg text-charcoal">{{ article.description }}</p>
      </header>

      <aside v-if="article.toc.length >= 3" class="mt-lg rounded-md bg-surface p-md">
        <p class="text-caption uppercase tracking-wide text-steel">Содержание</p>
        <ul class="mt-2 space-y-1">
          <li v-for="item in article.toc" :key="item.id" :class="item.level === 3 ? 'pl-4' : ''">
            <a :href="`#${item.id}`" class="text-link hover:underline">{{ item.text }}</a>
          </li>
        </ul>
      </aside>

      <div class="prose-mo mt-xl" v-html="article.html" />

      <footer
        v-if="article.tags.length"
        class="mt-section flex flex-wrap items-center gap-2 border-t border-hairline pt-md"
      >
        <span class="text-caption text-steel">Теги:</span>
        <span
          v-for="tag in article.tags"
          :key="tag"
          class="rounded bg-tint-gray px-2 py-0.5 text-caption text-charcoal"
        >
          {{ tag }}
        </span>
      </footer>
    </article>

    <section v-if="related.length" class="mt-section" aria-labelledby="related-heading">
      <h2 id="related-heading" class="text-h3 text-ink">Читайте также</h2>
      <ul class="mt-md grid grid-cols-1 gap-md md:grid-cols-2">
        <li
          v-for="r in related"
          :key="r.slug"
          class="rounded-md border border-hairline bg-surface p-md hover:border-hairline-strong"
        >
          <NuxtLink :to="`/blog/${r.slug}`" class="block">
            <p v-if="r.pillar" class="text-caption text-primary">Обзорная статья</p>
            <h3 class="text-h5 text-ink">{{ r.title }}</h3>
            <p class="mt-1 text-body-sm text-charcoal">{{ r.description }}</p>
          </NuxtLink>
        </li>
      </ul>
    </section>

    <section class="mt-section rounded-md bg-tint-blue p-lg text-center">
      <p class="text-h4 text-ink">Готовы превратить инструкцию в рабочий канал?</p>
      <p class="mt-2 text-body text-charcoal">
        Посмотрите, как quar.io выглядит на публичной странице товара — это занимает минуту.
      </p>
      <div class="mt-md flex flex-wrap items-center justify-center gap-3">
        <NuxtLink
          to="/auth/register"
          class="rounded-md bg-primary px-md py-sm text-body-sm text-white hover:opacity-90"
        >
          Создать кабинет
        </NuxtLink>
        <NuxtLink to="/pricing" class="text-link hover:underline">Посмотреть тарифы</NuxtLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.prose-mo :deep(h2) { @apply text-h2 mt-12 mb-3 text-ink; }
.prose-mo :deep(h3) { @apply text-h3 mt-10 mb-3 text-ink; }
.prose-mo :deep(p)  { @apply text-body text-charcoal leading-relaxed mb-4; }
.prose-mo :deep(ul) { @apply list-disc pl-6 mb-4; }
.prose-mo :deep(ol) { @apply list-decimal pl-6 mb-4; }
.prose-mo :deep(li) { @apply mb-2; }
.prose-mo :deep(blockquote) { @apply border-l-4 border-hairline-strong pl-4 italic my-4 text-charcoal; }
.prose-mo :deep(img) { @apply rounded-md max-w-full my-4; }
.prose-mo :deep(code) { @apply rounded-sm bg-tint-gray px-1 py-0.5 text-body-sm; }
.prose-mo :deep(pre) { @apply rounded-md bg-tint-gray p-md my-4 overflow-x-auto; }
.prose-mo :deep(a) { @apply text-link underline; }
.prose-mo :deep(table) { @apply w-full border-collapse my-4; }
.prose-mo :deep(th), .prose-mo :deep(td) { @apply border border-hairline px-3 py-2 text-body-sm text-left; }
.prose-mo :deep(th) { @apply bg-surface font-semibold text-ink; }
.prose-mo :deep(h2[id]), .prose-mo :deep(h3[id]) { scroll-margin-top: 16px; }
</style>
