// Список статей блога для страницы /blog. Кластеризация и сортировка — на клиенте.
import { listArticles } from '~~/server/utils/blog'

export default defineEventHandler(async () => {
  const articles = await listArticles()
  return { articles }
})
