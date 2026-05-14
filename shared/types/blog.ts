// Контракты блога, общие между сервером и клиентом.
// Серверный загрузчик (server/utils/blog.ts) реализует эти типы.
export interface BlogFaqItem {
  question: string
  answer: string
}

export interface BlogArticleMeta {
  slug: string
  title: string
  description: string
  publishedAt: string
  updatedAt: string
  cluster: string
  pillar: boolean
  readingTime: number | null
  coverImage: string | null
  tags: string[]
  relatedSlugs: string[]
  faq: BlogFaqItem[]
  archived: boolean
}

export interface BlogTocItem {
  level: number
  id: string
  text: string
}

export interface BlogArticle extends BlogArticleMeta {
  html: string
  toc: BlogTocItem[]
}
