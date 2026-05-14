// robots.txt — управляет тем, что поисковые роботы могут индексировать.
// Открытые для индексации разделы: лендинг, тарифы, инвесторы, юридические
// страницы и публичные инструкции на /<tenantSlug>/<instructionSlug>.
// Закрыты: dashboard, auth, API, короткие ссылки (редиректы), загрузки и
// внутренние демо-страницы.
export default defineEventHandler((event) => {
  const cfg = useRuntimeConfig()
  const base = (cfg.public.appUrl as string).replace(/\/$/, '')

  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /dashboard',
    'Disallow: /dashboard/',
    'Disallow: /auth',
    'Disallow: /auth/',
    'Disallow: /api/',
    'Disallow: /s/',
    'Disallow: /uploads/',
    'Disallow: /qr-codes/',
    'Disallow: /landing-editor-demo',
    'Disallow: /alt-1',
    'Disallow: /alt-2',
    'Disallow: /alt-3',
    'Disallow: /embed',
    '',
    `Sitemap: ${base}/sitemap.xml`
  ]

  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return lines.join('\n')
})
