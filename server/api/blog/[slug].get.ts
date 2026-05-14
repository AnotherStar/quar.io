// Полная статья блога по slug. Возвращает meta + готовый html + toc + related.
import { getArticle, listArticles } from '~~/server/utils/blog'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'slug is required' })

  const article = await getArticle(slug)
  if (!article) throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })

  // Подтягиваем мета связанных статей, чтобы рендерить блок «Читайте также» без
  // ещё одного запроса с клиента.
  const all = await listArticles()
  const bySlug = new Map(all.map((a) => [a.slug, a]))
  const related = article.relatedSlugs
    .map((s) => bySlug.get(s))
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .slice(0, 5)

  return { article, related }
})
