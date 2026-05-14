<script setup lang="ts">
import { BLOG_CLUSTERS } from '~~/shared/constants/blogClusters'
import type { BlogArticleMeta } from '~~/shared/types/blog'

definePageMeta({ layout: 'default' })

const { public: publicCfg } = useRuntimeConfig()
const appUrl = (publicCfg.appUrl as string).replace(/\/$/, '')

const { data } = await useFetch<{ articles: BlogArticleMeta[] }>('/api/blog/list', {
  key: 'blog-list'
})

const articles = computed(() => data.value?.articles ?? [])

// Группируем по кластерам в порядке BLOG_CLUSTERS, чтобы pillar шёл первым
// внутри своего кластера и был визуально выделен.
const grouped = computed(() => {
  return BLOG_CLUSTERS.map((cluster) => {
    const items = articles.value
      .filter((a) => a.cluster === cluster.code)
      .sort((a, b) => {
        if (a.pillar !== b.pillar) return a.pillar ? -1 : 1
        return a.publishedAt < b.publishedAt ? 1 : -1
      })
    return { cluster, items }
  }).filter((g) => g.items.length > 0)
})

const description =
  'Блог quar.io: статьи о QR-инструкциях, постпокупочном опыте, требованиях маркетплейсов и работе с отзывами.'

useHead({
  title: 'Блог — quar.io',
  meta: [
    { name: 'description', content: description },
    { property: 'og:title', content: 'Блог — quar.io' },
    { property: 'og:description', content: description },
    { property: 'og:url', content: `${appUrl}/blog` },
    { property: 'og:type', content: 'website' }
  ],
  link: [
    { rel: 'canonical', href: `${appUrl}/blog` },
    { rel: 'alternate', type: 'application/rss+xml', title: 'quar.io · блог', href: `${appUrl}/blog/rss.xml` }
  ]
})

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00Z')
  return new Intl.DateTimeFormat('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' }).format(d)
}
</script>

<template>
  <main class="container-page mx-auto max-w-5xl py-section">
    <nav aria-label="breadcrumb" class="text-body-sm text-steel">
      <ol class="flex flex-wrap items-center gap-1">
        <li><NuxtLink to="/" class="hover:underline">Главная</NuxtLink></li>
        <li aria-hidden="true">/</li>
        <li class="text-ink">Блог</li>
      </ol>
    </nav>

    <header class="mt-md">
      <h1 class="text-h1 text-ink">Блог quar.io</h1>
      <p class="mt-md max-w-2xl text-body text-charcoal">
        Как превратить инструкцию к товару в инструмент, который снижает возвраты,
        повышает рейтинг карточки и удерживает покупателя после первой покупки.
      </p>
    </header>

    <div v-if="!grouped.length" class="mt-xl text-body text-steel">
      Пока ни одной статьи. Загляните позже.
    </div>

    <section
      v-for="group in grouped"
      :key="group.cluster.code"
      class="mt-section"
      :aria-labelledby="`cluster-${group.cluster.code}`"
    >
      <div class="border-b border-hairline pb-md">
        <h2 :id="`cluster-${group.cluster.code}`" class="text-h3 text-ink">
          {{ group.cluster.name }}
        </h2>
        <p class="mt-1 text-body-sm text-steel">{{ group.cluster.description }}</p>
      </div>

      <ul class="mt-md grid grid-cols-1 gap-md md:grid-cols-2">
        <li
          v-for="article in group.items"
          :key="article.slug"
          class="rounded-md border border-hairline bg-surface p-md transition hover:border-hairline-strong"
        >
          <NuxtLink :to="`/blog/${article.slug}`" class="block">
            <div class="flex items-center gap-2 text-caption text-steel">
              <span v-if="article.pillar" class="rounded bg-tint-blue px-2 py-0.5 text-primary">
                Обзорная статья
              </span>
              <time :datetime="article.publishedAt">{{ formatDate(article.publishedAt) }}</time>
              <span v-if="article.readingTime" aria-hidden="true">·</span>
              <span v-if="article.readingTime">{{ article.readingTime }} мин</span>
            </div>
            <h3 class="mt-2 text-h5 text-ink">{{ article.title }}</h3>
            <p class="mt-1 text-body-sm text-charcoal">{{ article.description }}</p>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </main>
</template>
