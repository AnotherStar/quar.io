import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { loadImage, createCanvas } from '@napi-rs/canvas'
import type { PrintTemplate } from '../types'
import { addImage, addPage, createPdf, drawImage, drawQr, renderPdf } from '~~/server/utils/printPdf'

// Базовый стартовый шаблон. Одна наклейка = одна страница 50×80мм.
// Раскладка:
//   • верх — логотип quar.io (по центру), 16мм высоты
//   • середина — QR-код 36×36мм
//   • низ — подпись «Инструкция» 14pt (как растровая картинка, чтобы
//     корректно отрисовать кириллицу — встроенный Helvetica её не умеет)
//
// Изображения (лого и подпись) генерируются один раз на тираж и
// переиспользуются для каждой страницы — иначе для тиража в 1000 наклеек
// PDF получит 2000 копий одной и той же картинки.

const STICKER_W = 50
const STICKER_H = 80

export const stickerTemplate: PrintTemplate = {
  manifest: {
    code: 'sticker-50x80',
    name: 'Наклейка 50×80мм',
    description: 'Базовая наклейка: логотип сверху, QR в центре, подпись «Инструкция» снизу.',
    size: { widthMm: STICKER_W, heightMm: STICKER_H },
    version: 1,
    previewUrl: '/print-templates/sticker-50x80-preview.svg',
    definitionFormat: 'code'
  },

  async render(ctx) {
    const doc = createPdf()

    const logoJpeg = await loadTenantLogoJpeg(ctx.tenant.brandingLogoUrl)
    const logoImageId = addImage(doc, logoJpeg)

    const labelJpeg = renderTextJpeg('Инструкция', { widthPx: 600, heightPx: 90, fontSize: 56, bold: true })
    const labelImageId = addImage(doc, labelJpeg)

    for (const item of ctx.items) {
      const page = addPage(doc, STICKER_W, STICKER_H)

      // Логотип — 16×16мм, по центру горизонтально, сверху отступ 5мм.
      const logoSize = 16
      drawImage(page, {
        imageId: logoImageId,
        x: (STICKER_W - logoSize) / 2,
        y: 5,
        wMm: logoSize,
        hMm: logoSize
      })

      // QR — 36×36мм, по центру горизонтально, под логотипом.
      const qrSize = 36
      drawQr(page, {
        x: (STICKER_W - qrSize) / 2,
        y: 24,
        sizeMm: qrSize,
        value: item.url
      })

      // Подпись «Инструкция» — 32×4.8мм, под QR.
      const labelW = 32
      const labelH = 4.8
      drawImage(page, {
        imageId: labelImageId,
        x: (STICKER_W - labelW) / 2,
        y: 66,
        wMm: labelW,
        hMm: labelH
      })
    }

    return renderPdf(doc)
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

// Приоритет: брендинг-лого тенанта → fallback на quar-logo. Если URL клиента
// есть, но загрузить его не удалось (404, network, битый файл) — тоже
// fallback, чтобы тираж не падал из-за подвисшего S3-URL. Кэшируем fallback
// на процесс, но НЕ кэшируем лого тенанта — пользователь может его поменять,
// и следующий тираж должен брать свежий файл.
let cachedFallback: { data: Buffer; width: number; height: number } | null = null

async function loadTenantLogoJpeg(brandingLogoUrl: string | null) {
  if (brandingLogoUrl) {
    const tenantLogo = await tryLoadFromUrl(brandingLogoUrl)
    if (tenantLogo) return tenantLogo
  }
  return loadFallbackLogo()
}

async function tryLoadFromUrl(url: string) {
  try {
    // Локальный driver кладёт файлы под /uploads/* и публикует через
    // server/routes/uploads — на сетевом уровне это всё ещё нормальный fetch
    // через локальный nitro, но проще читать с диска, если путь начинается
    // с /uploads/.
    let bytes: Buffer
    if (url.startsWith('/uploads/')) {
      const cfg = useRuntimeConfig()
      const rel = url.replace(/^\/uploads\//, '')
      const filePath = path.resolve(process.cwd(), cfg.storage.localDir, rel)
      bytes = await readFile(filePath)
    } else {
      const res = await fetch(url)
      if (!res.ok) return null
      bytes = Buffer.from(await res.arrayBuffer())
    }
    return await encodeToJpegOnWhite(bytes)
  } catch {
    return null
  }
}

async function loadFallbackLogo() {
  if (cachedFallback) return cachedFallback
  const filePath = path.resolve(process.cwd(), 'public/quar-logo.png')
  const png = await readFile(filePath)
  cachedFallback = await encodeToJpegOnWhite(png)
  return cachedFallback
}

async function encodeToJpegOnWhite(bytes: Buffer) {
  const img = await loadImage(bytes)
  // Белый фон под исходник: JPEG не поддерживает прозрачность, и без
  // подложки прозрачные пиксели уезжают в чёрный.
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, img.width, img.height)
  ctx.drawImage(img, 0, 0)
  const jpeg = canvas.toBuffer('image/jpeg', 92)
  return { data: jpeg, width: img.width, height: img.height }
}

function renderTextJpeg(text: string, opts: { widthPx: number; heightPx: number; fontSize: number; bold?: boolean }) {
  const canvas = createCanvas(opts.widthPx, opts.heightPx)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, opts.widthPx, opts.heightPx)
  ctx.fillStyle = '#0f172a'
  const weight = opts.bold ? '600' : '400'
  ctx.font = `${weight} ${opts.fontSize}px "Inter", "Helvetica", "Arial", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, opts.widthPx / 2, opts.heightPx / 2)
  const jpeg = canvas.toBuffer('image/jpeg', 92)
  return { data: jpeg, width: opts.widthPx, height: opts.heightPx }
}
