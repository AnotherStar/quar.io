// sitemap.xml — собирает карту сайта из статических публичных страниц и
// опубликованных инструкций. Драфты, архив и приватные разделы (dashboard,
// auth, API, короткие ссылки) сюда не попадают, см. также robots.txt.
import { prisma } from '~~/server/utils/prisma'
import { listArticles } from '~~/server/utils/blog'

interface SitemapUrl {
  loc: string
  lastmod?: string
  changefreq?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  priority?: string
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function renderUrl(u: SitemapUrl): string {
  const parts = [`    <loc>${xmlEscape(u.loc)}</loc>`]
  if (u.lastmod) parts.push(`    <lastmod>${u.lastmod}</lastmod>`)
  if (u.changefreq) parts.push(`    <changefreq>${u.changefreq}</changefreq>`)
  if (u.priority) parts.push(`    <priority>${u.priority}</priority>`)
  return `  <url>\n${parts.join('\n')}\n  </url>`
}

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig()
  const base = (cfg.public.appUrl as string).replace(/\/$/, '')

  const staticUrls: SitemapUrl[] = [
    { loc: `${base}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${base}/pricing`, changefreq: 'monthly', priority: '0.8' },
    { loc: `${base}/blog`, changefreq: 'daily', priority: '0.9' },
    { loc: `${base}/investors`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${base}/legal/terms`, changefreq: 'yearly', priority: '0.3' }
  ]

  const articles = await listArticles()
  const blogUrls: SitemapUrl[] = articles.map((a) => ({
    loc: `${base}/blog/${a.slug}`,
    lastmod: new Date(a.updatedAt + 'T00:00:00Z').toISOString(),
    changefreq: 'monthly',
    priority: a.pillar ? '0.9' : '0.7'
  }))

  // Только опубликованные и не архивные инструкции.
  const instructions = await prisma.instruction.findMany({
    where: {
      status: 'PUBLISHED',
      archivedAt: null,
      publishedAt: { not: null }
    },
    select: {
      slug: true,
      updatedAt: true,
      publishedAt: true,
      tenant: { select: { slug: true } }
    },
    orderBy: { publishedAt: 'desc' },
    take: 50000
  })

  const instructionUrls: SitemapUrl[] = instructions.map((i) => ({
    loc: `${base}/${i.tenant.slug}/${i.slug}`,
    lastmod: (i.updatedAt ?? i.publishedAt ?? new Date()).toISOString(),
    changefreq: 'weekly',
    priority: '0.7'
  }))

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...staticUrls, ...blogUrls, ...instructionUrls].map(renderUrl).join('\n') +
    '\n</urlset>\n'

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=600, s-maxage=3600')
  return body
})
