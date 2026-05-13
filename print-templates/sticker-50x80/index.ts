import type { PrintRenderContext, PrintTemplate } from '../types'
import { addImage, addPage, createPdf, drawImage, drawQr, renderPagePng, renderPdf } from '~~/server/utils/printPdf'
import { loadTenantLogoJpeg, renderTextJpeg } from '../_shared/stickerAssets'

// Базовый стартовый шаблон. Одна наклейка = одна страница 50×80мм.
// Раскладка:
//   • верх — логотип quar.io (по центру), 16мм высоты
//   • середина — QR-код 36×36мм
//   • низ — подпись «Инструкция» 14pt (как растровая картинка, чтобы
//     корректно отрисовать кириллицу — встроенный Helvetica её не умеет)
//
const STICKER_W = 50
const STICKER_H = 80

export const stickerTemplate: PrintTemplate = {
  manifest: {
    code: 'sticker-50x80',
    name: 'Наклейка 50×80мм',
    description: 'Базовая наклейка: логотип сверху, QR в центре, подпись «Инструкция» снизу.',
    size: { widthMm: STICKER_W, heightMm: STICKER_H },
    version: 1,
    previewUrl: null,
    definitionFormat: 'code'
  },

  async render(ctx) {
    return renderPdf(await buildStickerDoc(ctx))
  },

  async renderPreview(ctx) {
    return renderPagePng(await buildStickerDoc(ctx), { maxWidthPx: 640, maxHeightPx: 640 })
  }
}

async function buildStickerDoc(ctx: PrintRenderContext) {
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

  return doc
}
