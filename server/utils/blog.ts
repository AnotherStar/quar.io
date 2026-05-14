// Загрузка статей блога из content/blog/*.md.
// Используется со стороны сервера: страницы /blog/* читают данные через
// server/api/blog/*.get.ts, которые опираются на этот модуль.
//
// Контракт работы со статьями описан в CONTENT-PROMPT.md.
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import matter from 'gray-matter'
import { marked } from 'marked'
import type { BlogArticle, BlogArticleMeta, BlogFaqItem } from '~~/shared/types/blog'

export type { BlogArticle, BlogArticleMeta, BlogFaqItem } from '~~/shared/types/blog'

const BLOG_DIR = join(process.cwd(), 'content', 'blog')

// Кэш в памяти процесса: чтение и парсинг markdown — операция дешёвая, но при
// каждом обращении к /blog/index.vue ходить в FS лишний раз не нужно. Подпись
// по mtime позволяет видеть правки статей без ручного перезапуска dev-сервера.
let listCache: { signature: string; articles: BlogArticleMeta[] } | null = null
const articleCache = new Map<string, { mtimeMs: number; article: BlogArticle }>()

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

function asFaq(v: unknown): BlogFaqItem[] {
  if (!Array.isArray(v)) return []
  return v
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const q = asString((item as Record<string, unknown>).question)
      const a = asString((item as Record<string, unknown>).answer)
      if (!q || !a) return null
      return { question: q, answer: a }
    })
    .filter((x): x is BlogFaqItem => x !== null)
}

function asDate(v: unknown, fallback: string): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return asString(v, fallback)
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function parseFrontmatter(slug: string, data: Record<string, unknown>): BlogArticleMeta {
  const publishedAt = asDate(data.publishedAt, new Date().toISOString().slice(0, 10))
  return {
    slug,
    title: asString(data.title, slug),
    description: asString(data.description),
    publishedAt,
    updatedAt: asDate(data.updatedAt, publishedAt),
    cluster: asString(data.cluster, 'misc'),
    pillar: Boolean(data.pillar),
    readingTime: typeof data.readingTime === 'number' ? data.readingTime : null,
    coverImage: asString(data.coverImage) || null,
    tags: asStringArray(data.tags),
    relatedSlugs: asStringArray(data.relatedSlugs),
    faq: asFaq(data.faq),
    archived: Boolean(data.archived)
  }
}

async function getArticleMtime(slug: string): Promise<number | null> {
  const filePath = join(BLOG_DIR, `${slug}.md`)
  try {
    return (await stat(filePath)).mtimeMs
  } catch {
    return null
  }
}

async function readArticleFile(slug: string): Promise<BlogArticle | null> {
  const filePath = join(BLOG_DIR, `${slug}.md`)
  let raw: string
  try {
    raw = await readFile(filePath, 'utf8')
  } catch {
    return null
  }

  const parsed = matter(raw)
  const meta = parseFrontmatter(slug, parsed.data as Record<string, unknown>)

  // Извлекаем H2/H3 для оглавления и одновременно проставляем им id для якорей.
  const toc: BlogArticle['toc'] = []
  const renderer = new marked.Renderer()
  const originalHeading = renderer.heading.bind(renderer)
  renderer.heading = function (token) {
    const text = (token.tokens || [])
      .map((t) => ('text' in t && typeof t.text === 'string' ? t.text : ''))
      .join('')
    const id = slugifyHeading(text)
    if (token.depth === 2 || token.depth === 3) toc.push({ level: token.depth, id, text })
    const inner = originalHeading(token)
    // Вставляем id в открывающий тег <hN>, чтобы не терять inline-разметку,
    // которую отрисовал стандартный рендерер.
    return inner.replace(/^<h(\d)>/, (_match, lvl) => `<h${lvl} id="${id}">`)
  }

  const html = await marked.parse(parsed.content, { renderer, async: true })

  return { ...meta, html: typeof html === 'string' ? html : '', toc }
}

export async function listArticles(): Promise<BlogArticleMeta[]> {
  let files: string[]
  try {
    files = await readdir(BLOG_DIR)
  } catch {
    return []
  }

  const slugs = files.filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3))
  const signatureParts = await Promise.all(
    slugs.map(async (slug) => `${slug}:${await getArticleMtime(slug)}`)
  )
  const signature = signatureParts.sort().join('|')
  if (listCache?.signature === signature) return listCache.articles

  const articles: BlogArticleMeta[] = []
  for (const slug of slugs) {
    const a = await readArticleFile(slug)
    if (a && !a.archived) {
      const { html: _h, toc: _t, ...meta } = a
      articles.push(meta as BlogArticleMeta)
    }
  }

  articles.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
  listCache = { signature, articles }
  return articles
}

export async function getArticle(slug: string): Promise<BlogArticle | null> {
  const mtimeMs = await getArticleMtime(slug)
  if (mtimeMs === null) return null

  const cached = articleCache.get(slug)
  if (cached?.mtimeMs === mtimeMs) return cached.article

  const article = await readArticleFile(slug)
  if (article && !article.archived) {
    articleCache.set(slug, { mtimeMs, article })
    return article
  }
  return null
}

export function clearBlogCache() {
  listCache = null
  articleCache.clear()
}
