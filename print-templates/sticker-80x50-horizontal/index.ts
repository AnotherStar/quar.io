import type { PrintRenderContext, PrintTemplate } from '../types'
import { addImage, addPage, createPdf, drawImage, drawQr, drawRect, renderPagePng, renderPdf } from '~~/server/utils/printPdf'
import { loadTenantLogoJpeg, renderTextJpeg } from '../_shared/stickerAssets'

const STICKER_W = 80
const STICKER_H = 50
const SOFT_SURFACE: [number, number, number] = [0.965, 0.961, 0.957]

export const horizontalStickerTemplate: PrintTemplate = {
  manifest: {
    code: 'sticker-80x50-horizontal',
    name: 'Наклейка 80×50мм · горизонтальная',
    description: 'Горизонтальный формат: QR слева, логотип и подпись справа для широких упаковок.',
    size: { widthMm: STICKER_W, heightMm: STICKER_H },
    version: 1,
    previewUrl: null,
    definitionFormat: 'code'
  },

  async render(ctx) {
    return renderPdf(await buildHorizontalStickerDoc(ctx))
  },

  async renderPreview(ctx) {
    return renderPagePng(await buildHorizontalStickerDoc(ctx), { maxWidthPx: 640, maxHeightPx: 640 })
  }
}

async function buildHorizontalStickerDoc(ctx: PrintRenderContext) {
  const doc = createPdf()
  const logoImageId = addImage(doc, await loadTenantLogoJpeg(ctx.tenant.brandingLogoUrl))
  const titleImageId = addImage(
    doc,
    renderTextJpeg('Инструкция', { widthPx: 760, heightPx: 120, fontSize: 68, bold: true })
  )
  const hintImageId = addImage(
    doc,
    renderTextJpeg('Наведите камеру на QR-код', { widthPx: 900, heightPx: 90, fontSize: 38, color: '#787671' })
  )

  for (const item of ctx.items) {
    const page = addPage(doc, STICKER_W, STICKER_H)

    drawRect(page, 0, 0, 34, STICKER_H, SOFT_SURFACE)

    const qrSize = 30
    drawQr(page, {
      x: 7,
      y: 10,
      sizeMm: qrSize,
      value: item.url
    })

    drawImage(page, {
      imageId: logoImageId,
      x: 44,
      y: 8,
      wMm: 14,
      hMm: 14
    })

    drawImage(page, {
      imageId: titleImageId,
      x: 42,
      y: 27,
      wMm: 30,
      hMm: 4.7
    })

    drawImage(page, {
      imageId: hintImageId,
      x: 40,
      y: 34,
      wMm: 34,
      hMm: 3.4
    })
  }

  return doc
}
