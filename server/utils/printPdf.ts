import { createCanvas, loadImage } from '@napi-rs/canvas'
import QRCode from 'qrcode'

// Минимальный PDF 1.4 builder, рассчитанный на нужды print-templates.
// Без внешних PDF-зависимостей — пишем структуру PDF руками, как и в
// qrPdf.ts. Отличия от qrPdf.ts:
//   • произвольный размер страниц (для одна-наклейка-одна-страница)
//   • рисование текста с центрированием
//   • встраивание JPEG-картинок как XObject /DCTDecode
//   • multiple typefaces — Helvetica и Helvetica-Bold
//
// Координаты во всём API — «человеческие», в миллиметрах, origin в
// левом-верхнем углу страницы. Внутри переводим в PDF-points (origin в
// левом-нижнем).

export const MM_TO_PT = 72 / 25.4

export interface JpegImage {
  data: Buffer        // raw JPEG stream
  width: number       // px
  height: number      // px
}

export interface PrintPage {
  widthMm: number
  heightMm: number
  ops: PageOp[]
}

type PageOp =
  | { kind: 'rect'; xMm: number; yMm: number; wMm: number; hMm: number; fill: [number, number, number] }
  | { kind: 'text'; xMm: number; yMm: number; text: string; sizePt: number; bold?: boolean; align?: 'left' | 'center' | 'right'; color?: [number, number, number] }
  | { kind: 'qr'; xMm: number; yMm: number; sizeMm: number; value: string; dark?: [number, number, number]; light?: [number, number, number]; lightTransparent?: boolean }
  | { kind: 'image'; xMm: number; yMm: number; wMm: number; hMm: number; imageId: number }

export interface PdfDoc {
  pages: PrintPage[]
  images: JpegImage[]   // indexed by imageId returned from addImage()
}

export function createPdf(): PdfDoc {
  return { pages: [], images: [] }
}

export function addImage(doc: PdfDoc, img: JpegImage): number {
  doc.images.push(img)
  return doc.images.length - 1
}

export function addPage(doc: PdfDoc, widthMm: number, heightMm: number): PrintPage {
  const page: PrintPage = { widthMm, heightMm, ops: [] }
  doc.pages.push(page)
  return page
}

export function drawRect(page: PrintPage, xMm: number, yMm: number, wMm: number, hMm: number, fill: [number, number, number] = [0, 0, 0]) {
  page.ops.push({ kind: 'rect', xMm, yMm, wMm, hMm, fill })
}

export function drawText(page: PrintPage, opts: { x: number; y: number; text: string; sizePt: number; bold?: boolean; align?: 'left' | 'center' | 'right'; color?: [number, number, number] }) {
  page.ops.push({
    kind: 'text', xMm: opts.x, yMm: opts.y, text: opts.text, sizePt: opts.sizePt,
    bold: opts.bold, align: opts.align ?? 'left', color: opts.color
  })
}

export function drawQr(page: PrintPage, opts: { x: number; y: number; sizeMm: number; value: string; dark?: [number, number, number]; light?: [number, number, number]; lightTransparent?: boolean }) {
  page.ops.push({ kind: 'qr', xMm: opts.x, yMm: opts.y, sizeMm: opts.sizeMm, value: opts.value, dark: opts.dark, light: opts.light, lightTransparent: opts.lightTransparent })
}

export function drawImage(page: PrintPage, opts: { imageId: number; x: number; y: number; wMm: number; hMm: number }) {
  page.ops.push({ kind: 'image', xMm: opts.x, yMm: opts.y, wMm: opts.wMm, hMm: opts.hMm, imageId: opts.imageId })
}

export async function renderPagePng(
  doc: PdfDoc,
  opts: { pageIndex?: number; maxWidthPx?: number; maxHeightPx?: number } = {}
): Promise<Buffer> {
  const page = doc.pages[opts.pageIndex ?? 0]
  if (!page) {
    throw new Error('Cannot render preview for an empty PDF document.')
  }

  const maxWidth = opts.maxWidthPx ?? 640
  const maxHeight = opts.maxHeightPx ?? 640
  const scale = Math.min(maxWidth / page.widthMm, maxHeight / page.heightMm)
  const widthPx = Math.max(1, Math.round(page.widthMm * scale))
  const heightPx = Math.max(1, Math.round(page.heightMm * scale))
  const canvas = createCanvas(widthPx, heightPx)
  const ctx = canvas.getContext('2d')
  const x = (mm: number) => mm * scale
  const y = (mm: number) => mm * scale

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, widthPx, heightPx)

  for (const op of page.ops) {
    if (op.kind === 'rect') {
      ctx.fillStyle = rgbCss(op.fill)
      ctx.fillRect(x(op.xMm), y(op.yMm), x(op.wMm), y(op.hMm))
    } else if (op.kind === 'qr') {
      drawQrCanvas(ctx, op.value, x(op.xMm), y(op.yMm), x(op.sizeMm), op.dark, op.light, op.lightTransparent)
    } else if (op.kind === 'image') {
      const image = doc.images[op.imageId]
      if (!image) continue
      const img = await loadImage(`data:image/jpeg;base64,${image.data.toString('base64')}`)
      ctx.drawImage(img, x(op.xMm), y(op.yMm), x(op.wMm), y(op.hMm))
    } else if (op.kind === 'text') {
      ctx.fillStyle = rgbCss(op.color ?? [0, 0, 0])
      ctx.font = `${op.bold ? '700' : '400'} ${op.sizePt * 1.333}px "Inter", "Helvetica", "Arial", sans-serif`
      ctx.textAlign = op.align ?? 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(op.text, x(op.xMm), y(op.yMm))
    }
  }

  return canvas.toBuffer('image/png')
}

// ──────────────────────────────────────────────────────────────────────────
// Render → Buffer
// ──────────────────────────────────────────────────────────────────────────

export function renderPdf(doc: PdfDoc): Buffer {
  const objects: string[] = []
  const streams = new Map<number, Buffer>()
  const add = (body: string, streamBody?: Buffer) => {
    objects.push(body)
    if (streamBody) streams.set(objects.length, streamBody)
    return objects.length
  }

  const fontRegularId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  const fontBoldId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')

  const imageIds: number[] = doc.images.map((img) => {
    const dict = `<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.data.length} >>`
    return add(dict, img.data)
  })

  const imageResources = imageIds.length
    ? `/XObject << ${imageIds.map((id, idx) => `/Im${idx} ${id} 0 R`).join(' ')} >>`
    : ''
  const fontResources = `/Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >>`

  const pageIds: number[] = []
  for (const page of doc.pages) {
    const widthPt = page.widthMm * MM_TO_PT
    const heightPt = page.heightMm * MM_TO_PT
    const content = renderPageOps(page, widthPt, heightPt)
    const streamBytes = Buffer.from(content + '\n', 'utf8')
    const contentId = add(`<< /Length ${streamBytes.length} >>`, streamBytes)
    pageIds.push(add(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${num(widthPt)} ${num(heightPt)}] ` +
      `/Resources << ${fontResources} ${imageResources} >> /Contents ${contentId} 0 R >>`
    ))
  }

  if (!pageIds.length) {
    // Пустой документ — пустая страница A4, чтобы PDF был валидным.
    const widthPt = 595.28
    const heightPt = 841.89
    const streamBytes = Buffer.from('\n', 'utf8')
    const contentId = add(`<< /Length ${streamBytes.length} >>`, streamBytes)
    pageIds.push(add(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${widthPt} ${heightPt}] ` +
      `/Resources << ${fontResources} >> /Contents ${contentId} 0 R >>`
    ))
  }

  const pagesId = objects.length + 1
  for (const id of pageIds) {
    objects[id - 1] = objects[id - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`)
  }
  add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`)
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)

  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary')]
  const offsets: number[] = [0]
  objects.forEach((body, index) => {
    offsets.push(Buffer.concat(chunks).length)
    const objNum = index + 1
    const stream = streams.get(objNum)
    if (stream) {
      chunks.push(Buffer.from(`${objNum} 0 obj\n${body}\nstream\n`, 'utf8'))
      chunks.push(stream)
      chunks.push(Buffer.from(`\nendstream\nendobj\n`, 'utf8'))
    } else {
      chunks.push(Buffer.from(`${objNum} 0 obj\n${body}\nendobj\n`, 'utf8'))
    }
  })
  const xrefOffset = Buffer.concat(chunks).length
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, 'utf8'))
  for (let i = 1; i < offsets.length; i += 1) {
    chunks.push(Buffer.from(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`, 'utf8'))
  }
  chunks.push(Buffer.from(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`, 'utf8'))

  return Buffer.concat(chunks)
}

function renderPageOps(page: PrintPage, widthPt: number, heightPt: number): string {
  const lines: string[] = []
  const pdfY = (yMmTop: number) => heightPt - yMmTop * MM_TO_PT

  for (const op of page.ops) {
    if (op.kind === 'rect') {
      const [r, g, b] = op.fill
      lines.push(`${num(r)} ${num(g)} ${num(b)} rg`)
      const x = op.xMm * MM_TO_PT
      const wPt = op.wMm * MM_TO_PT
      const hPt = op.hMm * MM_TO_PT
      lines.push(`${num(x)} ${num(pdfY(op.yMm + op.hMm))} ${num(wPt)} ${num(hPt)} re f`)
    } else if (op.kind === 'text') {
      const [r, g, b] = op.color ?? [0, 0, 0]
      const font = op.bold ? 'F2' : 'F1'
      const width = approxTextWidth(op.text, op.sizePt, op.bold)
      let xPt = op.xMm * MM_TO_PT
      if (op.align === 'center') xPt -= width / 2
      else if (op.align === 'right') xPt -= width
      const yPt = pdfY(op.yMm) - op.sizePt * 0.8 // baseline компенсация
      lines.push('BT')
      lines.push(`/${font} ${op.sizePt} Tf`)
      lines.push(`${num(r)} ${num(g)} ${num(b)} rg`)
      lines.push(`${num(xPt)} ${num(yPt + op.sizePt * 0.8)} Td (${escapePdfText(op.text)}) Tj`)
      lines.push('ET')
    } else if (op.kind === 'qr') {
      drawQrMatrix(lines, op.value, op.xMm * MM_TO_PT, pdfY(op.yMm + op.sizeMm), op.sizeMm * MM_TO_PT, op.dark, op.light, op.lightTransparent)
    } else if (op.kind === 'image') {
      const x = op.xMm * MM_TO_PT
      const wPt = op.wMm * MM_TO_PT
      const hPt = op.hMm * MM_TO_PT
      const yPt = pdfY(op.yMm + op.hMm)
      lines.push('q')
      lines.push(`${num(wPt)} 0 0 ${num(hPt)} ${num(x)} ${num(yPt)} cm`)
      lines.push(`/Im${op.imageId} Do`)
      lines.push('Q')
    }
  }

  return lines.join('\n')
}

// QR-матрица рисуется вектором (одной заливкой на каждый «модуль»). Размер
// «модуля» = size / (matrixSize + quietZone * 2). На малых физических размерах
// (32мм) это сильно острее, чем растровая JPEG-картинка.
function drawQrMatrix(
  lines: string[],
  value: string,
  xLeft: number,
  yBottom: number,
  sizePt: number,
  dark: [number, number, number] = [0, 0, 0],
  light: [number, number, number] = [1, 1, 1],
  lightTransparent = false
) {
  const QUIET = 2
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
  const matrixSize = qr.modules.size
  const data = qr.modules.data
  const unit = sizePt / (matrixSize + QUIET * 2)

  // Подложку рисуем только если она не прозрачная. В PDF не существует
  // alpha-канала в простом rg-операторе — единственный способ «не закрасить
  // фон» это пропустить заливку, чтобы то, что нарисовано ниже (фон стикера),
  // осталось видимым в зоне QR.
  if (!lightTransparent) {
    lines.push(`${num(light[0])} ${num(light[1])} ${num(light[2])} rg`)
    lines.push(`${num(xLeft)} ${num(yBottom)} ${num(sizePt)} ${num(sizePt)} re f`)
  }
  lines.push(`${num(dark[0])} ${num(dark[1])} ${num(dark[2])} rg`)

  for (let row = 0; row < matrixSize; row += 1) {
    for (let col = 0; col < matrixSize; col += 1) {
      if (!data[row * matrixSize + col]) continue
      const rx = xLeft + (col + QUIET) * unit
      const ry = yBottom + sizePt - (row + QUIET + 1) * unit
      lines.push(`${num(rx)} ${num(ry)} ${num(unit)} ${num(unit)} re f`)
    }
  }
}

function drawQrCanvas(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  value: string,
  xLeft: number,
  yTop: number,
  size: number,
  dark: [number, number, number] = [0, 0, 0],
  light: [number, number, number] = [1, 1, 1],
  lightTransparent = false
) {
  const QUIET = 2
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
  const matrixSize = qr.modules.size
  const data = qr.modules.data
  const unit = size / (matrixSize + QUIET * 2)

  if (!lightTransparent) {
    ctx.fillStyle = rgbCss(light)
    ctx.fillRect(xLeft, yTop, size, size)
  }
  ctx.fillStyle = rgbCss(dark)

  for (let row = 0; row < matrixSize; row += 1) {
    for (let col = 0; col < matrixSize; col += 1) {
      if (!data[row * matrixSize + col]) continue
      ctx.fillRect(
        xLeft + (col + QUIET) * unit,
        yTop + (row + QUIET) * unit,
        unit,
        unit
      )
    }
  }
}

function rgbCss(rgb: [number, number, number]) {
  const [r, g, b] = rgb.map((channel) => Math.round(Math.max(0, Math.min(1, channel)) * 255))
  return `rgb(${r} ${g} ${b})`
}

// Грубая оценка ширины текста для центровки. Helvetica широкая на цифрах
// и капителях, узкая на нижнем регистре — берём средний коэффициент.
// Точный шрифт-метрик мы не парсим: для коротких подписей погрешность в 5–10%
// в визуальном центрировании незаметна.
function approxTextWidth(text: string, sizePt: number, bold?: boolean): number {
  const avg = bold ? 0.58 : 0.52
  return text.length * sizePt * avg
}

function num(value: number): number {
  return Number(value.toFixed(3))
}

// PDF-строки кодируются в WinAnsiEncoding. Любой символ за пределами этой
// таблицы (кириллица в том числе) превратится в «?», поэтому подписи на
// наклейке делаем латиницей или прогоняем через transliterate-хелпер из
// шаблона.
function escapePdfText(text: string): string {
  return text.replace(/[\\()]/g, '\\$&')
}
