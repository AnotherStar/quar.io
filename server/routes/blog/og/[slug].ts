// Генератор OG-картинки для статьи блога. Рендерит 1200×630 PNG с заголовком
// статьи на брендовом фоне. Используется как fallback, когда у статьи не
// задан coverImage во frontmatter.
//
// URL: /blog/og/<slug>.png — Nitro отдаёт slug как 'slug.png', мы срезаем .png.
import { createCanvas } from '@napi-rs/canvas'
import { getArticle } from '~~/server/utils/blog'

const WIDTH = 1200
const HEIGHT = 630

function wrapText(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current)
      current = word
      if (lines.length === maxLines - 1) break
    } else {
      current = candidate
    }
  }
  if (current && lines.length < maxLines) lines.push(current)
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1]
    if (ctx.measureText(last + '…').width > maxWidth) {
      lines[maxLines - 1] = last.slice(0, Math.max(0, last.length - 3)) + '…'
    }
  }
  return lines
}

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'slug') || ''
  const slug = raw.replace(/\.png$/i, '')
  const article = await getArticle(slug)
  if (!article) throw createError({ statusCode: 404, statusMessage: 'Статья не найдена' })

  const canvas = createCanvas(WIDTH, HEIGHT)
  const ctx = canvas.getContext('2d')

  // Фон — мягкий вертикальный градиент в тёмно-синих тонах бренда.
  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  bg.addColorStop(0, '#0039df')
  bg.addColorStop(1, '#0a1f7a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // Декоративная сетка из тонких линий — даёт фактуру и узнаваемость.
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 1
  for (let x = 0; x <= WIDTH; x += 60) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, HEIGHT)
    ctx.stroke()
  }
  for (let y = 0; y <= HEIGHT; y += 60) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(WIDTH, y)
    ctx.stroke()
  }

  // Кикер с указанием продукта.
  ctx.fillStyle = 'rgba(255,255,255,0.7)'
  ctx.font = '500 28px "Inter", "Helvetica", "Arial", sans-serif'
  ctx.textBaseline = 'top'
  ctx.fillText('quar.io · блог', 80, 80)

  // Заголовок статьи — основной элемент.
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 60px "Inter", "Helvetica", "Arial", sans-serif'
  const titleLines = wrapText(ctx, article.title, WIDTH - 160, 4)
  let y = 200
  for (const line of titleLines) {
    ctx.fillText(line, 80, y)
    y += 78
  }

  // Низ — описание, если влезает.
  if (article.description) {
    ctx.fillStyle = 'rgba(255,255,255,0.78)'
    ctx.font = '400 28px "Inter", "Helvetica", "Arial", sans-serif'
    const descLines = wrapText(ctx, article.description, WIDTH - 160, 2)
    let descY = HEIGHT - 140 - (descLines.length - 1) * 38
    for (const line of descLines) {
      ctx.fillText(line, 80, descY)
      descY += 38
    }
  }

  const png = await canvas.encode('png')

  setHeader(event, 'content-type', 'image/png')
  setHeader(event, 'cache-control', 'public, max-age=86400, s-maxage=604800')
  return png
})
