import type { PrintRenderContext, PrintTemplate } from './types'
import { addImage, addPage, createPdf, drawImage, drawQr, renderPagePng, renderPdf } from '~~/server/utils/printPdf'
import { loadImageUrlJpeg } from './_shared/stickerAssets'

export const CUSTOM_TEMPLATE_PREFIX = 'custom:'

export interface CustomPrintTemplateRecord {
  id: string
  name: string
  backgroundUrl: string
  backgroundMimeType: string | null
  backgroundWidthPx: number
  backgroundHeightPx: number
  widthMm: number
  heightMm: number
  backgroundXmm?: number
  backgroundYmm?: number
  backgroundWidthMm?: number
  backgroundHeightMm?: number
  qrXmm: number
  qrYmm: number
  qrSizeMm: number
  qrDarkColor: string
  qrLightColor: string
  qrLightTransparent?: boolean
}

export function customTemplateCode(id: string) {
  return `${CUSTOM_TEMPLATE_PREFIX}${id}`
}

export function parseCustomTemplateCode(code: string) {
  return code.startsWith(CUSTOM_TEMPLATE_PREFIX) ? code.slice(CUSTOM_TEMPLATE_PREFIX.length) : null
}

export function customPrintTemplate(record: CustomPrintTemplateRecord): PrintTemplate {
  const code = customTemplateCode(record.id)

  return {
    manifest: {
      code,
      name: record.name,
      description: 'Пользовательский шаблон: фон + настраиваемый QR-код.',
      size: { widthMm: record.widthMm, heightMm: record.heightMm },
      version: 1,
      previewUrl: null,
      definitionFormat: 'json',
      definition: {
        backgroundUrl: record.backgroundUrl,
        backgroundWidthPx: record.backgroundWidthPx,
        backgroundHeightPx: record.backgroundHeightPx,
        backgroundXmm: record.backgroundXmm ?? 0,
        backgroundYmm: record.backgroundYmm ?? 0,
        backgroundWidthMm: record.backgroundWidthMm || record.widthMm,
        backgroundHeightMm: record.backgroundHeightMm || record.heightMm,
        qrXmm: record.qrXmm,
        qrYmm: record.qrYmm,
        qrSizeMm: record.qrSizeMm,
        qrDarkColor: record.qrDarkColor,
        qrLightColor: record.qrLightColor,
        qrLightTransparent: record.qrLightTransparent ?? false
      }
    },

    async render(ctx) {
      return renderPdf(await buildCustomDoc(record, ctx))
    },

    async renderPreview(ctx) {
      return renderPagePng(await buildCustomDoc(record, ctx), { maxWidthPx: 640, maxHeightPx: 640 })
    }
  }
}

async function buildCustomDoc(record: CustomPrintTemplateRecord, ctx: PrintRenderContext) {
  const doc = createPdf()
  const bg = await loadImageUrlJpeg(record.backgroundUrl)
  if (!bg) {
    throw new Error('Не удалось загрузить фон шаблона')
  }
  const bgId = addImage(doc, bg)
  const dark = hexToRgb(record.qrDarkColor)
  const light = hexToRgb(record.qrLightColor)
  const backgroundXmm = record.backgroundXmm ?? 0
  const backgroundYmm = record.backgroundYmm ?? 0
  const backgroundWidthMm = record.backgroundWidthMm || record.widthMm
  const backgroundHeightMm = record.backgroundHeightMm || record.heightMm

  for (const item of ctx.items) {
    const page = addPage(doc, record.widthMm, record.heightMm)
    drawImage(page, {
      imageId: bgId,
      x: backgroundXmm,
      y: backgroundYmm,
      wMm: backgroundWidthMm,
      hMm: backgroundHeightMm
    })
    drawQr(page, {
      x: record.qrXmm,
      y: record.qrYmm,
      sizeMm: record.qrSizeMm,
      value: item.url,
      dark,
      light,
      lightTransparent: record.qrLightTransparent ?? false
    })
  }

  return doc
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : '000000'
  return [
    parseInt(normalized.slice(0, 2), 16) / 255,
    parseInt(normalized.slice(2, 4), 16) / 255,
    parseInt(normalized.slice(4, 6), 16) / 255
  ]
}
