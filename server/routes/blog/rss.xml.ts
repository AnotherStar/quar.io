// RSS-фид блога. Помогает дистрибуции (агрегаторы, читалки, поисковые
// pinger'ы) и индексации новых материалов.
import { listArticles } from '~~/server/utils/blog'

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig()
  const base = (cfg.public.appUrl as string).replace(/\/$/, '')
  const articles = await listArticles()

  const items = articles
    .slice(0, 50)
    .map((a) => {
      const url = `${base}/blog/${a.slug}`
      const pubDate = new Date(a.publishedAt + 'T00:00:00Z').toUTCString()
      return [
        '    <item>',
        `      <title>${xmlEscape(a.title)}</title>`,
        `      <link>${xmlEscape(url)}</link>`,
        `      <guid isPermaLink="true">${xmlEscape(url)}</guid>`,
        `      <pubDate>${pubDate}</pubDate>`,
        `      <description>${xmlEscape(a.description)}</description>`,
        '    </item>'
      ].join('\n')
    })
    .join('\n')

  const lastBuildDate = articles[0]
    ? new Date(articles[0].updatedAt + 'T00:00:00Z').toUTCString()
    : new Date().toUTCString()

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n' +
    '  <channel>\n' +
    `    <title>quar.io · блог</title>\n` +
    `    <link>${base}/blog</link>\n` +
    `    <atom:link href="${base}/blog/rss.xml" rel="self" type="application/rss+xml" />\n` +
    `    <description>Статьи о QR-инструкциях, постпокупочном опыте и работе с маркетплейсами.</description>\n` +
    `    <language>ru</language>\n` +
    `    <lastBuildDate>${lastBuildDate}</lastBuildDate>\n` +
    items +
    '\n  </channel>\n' +
    '</rss>\n'

  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=600, s-maxage=3600')
  return body
})
