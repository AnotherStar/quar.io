import type { PrintRenderContext, PrintTemplate } from '../types'
import { addImage, addPage, createPdf, drawImage, drawQr, renderPagePng, renderPdf } from '~~/server/utils/printPdf'
import { renderTextJpeg } from '../_shared/stickerAssets'

const STICKER_W = 50
const STICKER_H = 80

export const minimalStickerTemplate: PrintTemplate = {
  manifest: {
    code: 'sticker-50x80-minimal',
    name: 'Наклейка 50×80мм · крупный QR',
    description: 'Минимальный вариант: максимум места под QR и короткая подпись для быстрой активации.',
    size: { widthMm: STICKER_W, heightMm: STICKER_H },
    version: 1,
    previewUrl: null,
    definitionFormat: 'code'
  },

  async render(ctx) {
    return renderPdf(buildMinimalStickerDoc(ctx))
  },

  async renderPreview(ctx) {
    return renderPagePng(buildMinimalStickerDoc(ctx), { maxWidthPx: 640, maxHeightPx: 640 })
  }
}

function buildMinimalStickerDoc(ctx: PrintRenderContext) {
  const doc = createPdf()
  const titleImageId = addImage(
    doc,
    renderTextJpeg('Инструкция', { widthPx: 760, heightPx: 110, fontSize: 64, bold: true })
  )
  const hintImageId = addImage(
    doc,
    renderTextJpeg('Сканируйте QR-код', { widthPx: 760, heightPx: 90, fontSize: 42, color: '#787671' })
  )

  for (const item of ctx.items) {
    const page = addPage(doc, STICKER_W, STICKER_H)

    const titleW = 38
    drawImage(page, {
      imageId: titleImageId,
      x: (STICKER_W - titleW) / 2,
      y: 7,
      wMm: titleW,
      hMm: 5.5
    })

    const qrSize = 42
    drawQr(page, {
      x: (STICKER_W - qrSize) / 2,
      y: 18,
      sizeMm: qrSize,
      value: item.url
    })

    const hintW = 34
    drawImage(page, {
      imageId: hintImageId,
      x: (STICKER_W - hintW) / 2,
      y: 65,
      wMm: hintW,
      hMm: 4
    })
  }

  return doc
}
