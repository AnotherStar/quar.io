import type { PrintRenderContext, PrintTemplate } from '../types'
import { addImage, addPage, createPdf, drawImage, drawQr, drawRect, renderPagePng, renderPdf } from '~~/server/utils/printPdf'
import { loadTenantLogoJpeg, renderTextJpeg } from '../_shared/stickerAssets'

const STICKER_W = 50
const STICKER_H = 80
const BRAND_BLUE: [number, number, number] = [0.047, 0.247, 0.914]
const SOFT_BLUE: [number, number, number] = [0.863, 0.925, 0.98]

export const brandStickerTemplate: PrintTemplate = {
  manifest: {
    code: 'sticker-50x80-brand',
    name: 'Наклейка 50×80мм · бренд',
    description: 'Брендированный вариант с цветной шапкой, логотипом и QR в чистом белом поле.',
    size: { widthMm: STICKER_W, heightMm: STICKER_H },
    version: 1,
    previewUrl: null,
    definitionFormat: 'code'
  },

  async render(ctx) {
    return renderPdf(await buildBrandStickerDoc(ctx))
  },

  async renderPreview(ctx) {
    return renderPagePng(await buildBrandStickerDoc(ctx), { maxWidthPx: 640, maxHeightPx: 640 })
  }
}

async function buildBrandStickerDoc(ctx: PrintRenderContext) {
  const doc = createPdf()
  const logoImageId = addImage(doc, await loadTenantLogoJpeg(ctx.tenant.brandingLogoUrl))
  const titleImageId = addImage(
    doc,
    renderTextJpeg('Инструкция', {
      widthPx: 620,
      heightPx: 100,
      fontSize: 56,
      bold: true,
      color: '#ffffff',
      background: '#0c3fe9'
    })
  )
  const hintImageId = addImage(
    doc,
    renderTextJpeg('Сканируйте перед использованием', { widthPx: 800, heightPx: 90, fontSize: 38, color: '#5d5b54' })
  )

  for (const item of ctx.items) {
    const page = addPage(doc, STICKER_W, STICKER_H)

    drawRect(page, 0, 0, STICKER_W, 18, BRAND_BLUE)
    drawRect(page, 6, 23, 38, 38, SOFT_BLUE)

    drawImage(page, {
      imageId: logoImageId,
      x: 7,
      y: 4,
      wMm: 10,
      hMm: 10
    })

    drawImage(page, {
      imageId: titleImageId,
      x: 20,
      y: 6.3,
      wMm: 22,
      hMm: 3.7
    })

    const qrSize = 34
    drawQr(page, {
      x: (STICKER_W - qrSize) / 2,
      y: 25,
      sizeMm: qrSize,
      value: item.url
    })

    drawImage(page, {
      imageId: hintImageId,
      x: 7,
      y: 66.5,
      wMm: 36,
      hMm: 4
    })
  }

  return doc
}
