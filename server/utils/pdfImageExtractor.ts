// Extracts embedded raster images from a PDF buffer.
// Uses pdfjs-dist's low-level operator-list API to find paintImageXObject
// references on each page, then re-encodes them as PNG via @napi-rs/canvas.
//
// Filters: drops tiny decorations (<120 px in either dimension) and
// deduplicates repeated images (e.g. headers/logos) by content hash.
import { createCanvas } from '@napi-rs/canvas'
import { createHash } from 'node:crypto'

// pdfjs-dist legacy build is the Node-friendly one
// eslint-disable-next-line @typescript-eslint/no-var-requires
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

export interface ExtractedImage {
  page: number
  buffer: Buffer
  width: number
  height: number
  hash: string
}

export interface PdfImageExtractionProgress {
  page: number
  pages: number
  found: number
  skippedSmall: number
  deduplicated: number
  maxImages: number
  done?: boolean
}

const MIN_DIMENSION = 120          // skip tiny decorations
const MAX_IMAGES = 30              // safety cap

export async function extractImagesFromPdf(
  buf: Buffer,
  options: { onProgress?: (progress: PdfImageExtractionProgress) => void } = {}
): Promise<ExtractedImage[]> {
  const data = new Uint8Array(buf)
  const doc = await pdfjs.getDocument({
    data,
    isEvalSupported: false,
    useSystemFonts: false,
    disableFontFace: true
  }).promise

  const seenHashes = new Set<string>()
  const images: ExtractedImage[] = []
  let skippedSmall = 0
  let deduplicated = 0

  const emitProgress = (page: number, done = false) => {
    options.onProgress?.({
      page,
      pages: doc.numPages,
      found: images.length,
      skippedSmall,
      deduplicated,
      maxImages: MAX_IMAGES,
      done
    })
  }

  emitProgress(0)

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    if (images.length >= MAX_IMAGES) break

    const page = await doc.getPage(pageNum)
    let opList
    try {
      opList = await page.getOperatorList()
    } catch {
      page.cleanup()
      emitProgress(pageNum)
      continue
    }

    const imageOps = new Set([
      pdfjs.OPS.paintImageXObject,
      pdfjs.OPS.paintImageXObjectRepeat,
      pdfjs.OPS.paintInlineImageXObject
    ])

    const seenOnPage = new Set<string>()

    for (let i = 0; i < opList.fnArray.length; i++) {
      if (!imageOps.has(opList.fnArray[i])) continue

      const args = opList.argsArray[i]
      const isInline = opList.fnArray[i] === pdfjs.OPS.paintInlineImageXObject
      const ref: string | undefined = isInline ? undefined : args?.[0]
      if (ref && seenOnPage.has(ref)) continue
      if (ref) seenOnPage.add(ref)

      let img: any
      try {
        if (isInline) {
          img = args[0]
        } else {
          img = await getPageObject(page, ref!)
        }
      } catch {
        continue
      }
      if (!img || !img.data || !img.width || !img.height) continue
      if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
        skippedSmall++
        continue
      }

      const png = encodeToPng(img)
      if (!png) continue

      const hash = createHash('sha1').update(png).digest('hex')
      if (seenHashes.has(hash)) {
        deduplicated++
        continue
      }
      seenHashes.add(hash)

      images.push({ page: pageNum, buffer: png, width: img.width, height: img.height, hash })
      if (images.length >= MAX_IMAGES) break
    }

    page.cleanup()
    emitProgress(pageNum)
  }

  emitProgress(doc.numPages, true)
  await doc.cleanup()
  await doc.destroy()
  return images
}

async function getPageObject(page: any, name: string): Promise<any> {
  // page.objs.get is callback-based. Resolve when image is available.
  return new Promise((resolve, reject) => {
    let done = false
    const t = setTimeout(() => {
      if (!done) reject(new Error('object timeout'))
    }, 5000)
    try {
      page.objs.get(name, (obj: any) => {
        if (done) return
        done = true
        clearTimeout(t)
        resolve(obj)
      })
    } catch (e) {
      done = true
      clearTimeout(t)
      reject(e)
    }
  })
}

// Convert a pdfjs ImageObject into a PNG Buffer.
// img.kind: 1=GRAYSCALE_1BPP, 2=RGB_24BPP, 3=RGBA_32BPP
function encodeToPng(img: any): Buffer | null {
  const { width, height, data, kind } = img
  if (!width || !height || !data) return null
  try {
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d')
    const out = ctx.createImageData(width, height)
    const px = out.data

    if (kind === 3) {
      // RGBA
      px.set(data)
    } else if (kind === 2) {
      // RGB → RGBA
      for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
        px[j] = data[i]
        px[j + 1] = data[i + 1]
        px[j + 2] = data[i + 2]
        px[j + 3] = 255
      }
    } else if (kind === 1) {
      // 1bpp grayscale (often masks); fall back to expanded grayscale
      // pdfjs gives 1 byte per pixel here in practice
      for (let i = 0, j = 0; i < data.length; i++, j += 4) {
        px[j] = data[i]
        px[j + 1] = data[i]
        px[j + 2] = data[i]
        px[j + 3] = 255
      }
    } else {
      return null
    }
    ctx.putImageData(out, 0, 0)
    return canvas.toBuffer('image/png')
  } catch {
    return null
  }
}
