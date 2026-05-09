import QRCode from 'qrcode'

interface QrPdfItem {
  shortId: string
  url: string
}

const MM_TO_PT = 72 / 25.4
const PAGE = { width: 595.28, height: 841.89 }
const MARGIN = 28
const GAP = 14
const LABEL_HEIGHT = 24
const QUIET_ZONE = 2

export function buildQrPdf(items: QrPdfItem[], sizeMm: number) {
  const qrSize = sizeMm * MM_TO_PT
  const cellWidth = qrSize
  const cellHeight = qrSize + LABEL_HEIGHT
  const cols = Math.max(1, Math.floor((PAGE.width - MARGIN * 2 + GAP) / (cellWidth + GAP)))
  const rows = Math.max(1, Math.floor((PAGE.height - MARGIN * 2 + GAP) / (cellHeight + GAP)))
  const perPage = cols * rows

  const pages: string[] = []
  for (let pageStart = 0; pageStart < items.length; pageStart += perPage) {
    const pageItems = items.slice(pageStart, pageStart + perPage)
    pages.push(renderPage(pageItems, { qrSize, cellWidth, cellHeight, cols }))
  }

  return writePdf(pages.length ? pages : [''])
}

function renderPage(
  items: QrPdfItem[],
  opts: { qrSize: number; cellWidth: number; cellHeight: number; cols: number }
) {
  const lines: string[] = ['0 0 0 rg']

  items.forEach((item, index) => {
    const col = index % opts.cols
    const row = Math.floor(index / opts.cols)
    const x = MARGIN + col * (opts.cellWidth + GAP)
    const yTop = MARGIN + row * (opts.cellHeight + GAP)
    drawQr(lines, item.url, x, yTop, opts.qrSize)
    drawText(lines, item.shortId, x, yTop + opts.qrSize + 10, 8)
  })

  return lines.join('\n')
}

function drawQr(lines: string[], value: string, x: number, yTop: number, size: number) {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
  const matrixSize = qr.modules.size
  const data = qr.modules.data
  const unit = size / (matrixSize + QUIET_ZONE * 2)

  lines.push('1 1 1 rg')
  lines.push(`${num(x)} ${num(pdfY(yTop + size))} ${num(size)} ${num(size)} re f`)
  lines.push('0 0 0 rg')

  for (let row = 0; row < matrixSize; row += 1) {
    for (let col = 0; col < matrixSize; col += 1) {
      if (!data[row * matrixSize + col]) continue
      const rectX = x + (col + QUIET_ZONE) * unit
      const rectTop = yTop + (row + QUIET_ZONE) * unit
      lines.push(`${num(rectX)} ${num(pdfY(rectTop + unit))} ${num(unit)} ${num(unit)} re f`)
    }
  }
}

function drawText(lines: string[], text: string, x: number, yTop: number, size: number) {
  lines.push('BT')
  lines.push(`/F1 ${size} Tf`)
  lines.push(`0 0 0 rg ${num(x)} ${num(pdfY(yTop))} Td (${escapePdfText(text)}) Tj`)
  lines.push('ET')
}

function writePdf(pageContents: string[]) {
  const objects: string[] = []
  const add = (body: string) => {
    objects.push(body)
    return objects.length
  }

  const fontId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const pageIds: number[] = []

  for (const content of pageContents) {
    const streamBody = `${content}\n`
    const stream = Buffer.from(streamBody, 'utf8')
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${streamBody}endstream`)
    pageIds.push(
      add(
        `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] ` +
        `/Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
      )
    )
  }

  const pagesId = objects.length + 1
  for (const id of pageIds) {
    objects[id - 1] = objects[id - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`)
  }
  add(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`)
  const catalogId = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`)

  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n', 'utf8')]
  const offsets = [0]
  objects.forEach((body, index) => {
    offsets.push(Buffer.concat(chunks).length)
    chunks.push(Buffer.from(`${index + 1} 0 obj\n${body}\nendobj\n`, 'utf8'))
  })
  const xrefOffset = Buffer.concat(chunks).length
  chunks.push(Buffer.from(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, 'utf8'))
  for (let i = 1; i < offsets.length; i += 1) {
    chunks.push(Buffer.from(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`, 'utf8'))
  }
  chunks.push(Buffer.from(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`, 'utf8'))

  return Buffer.concat(chunks)
}

function pdfY(yTop: number) {
  return PAGE.height - yTop
}

function num(value: number) {
  return Number(value.toFixed(2))
}

function escapePdfText(text: string) {
  return text.replace(/[\\()]/g, '\\$&')
}
