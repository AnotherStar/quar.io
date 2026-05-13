import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { loadImage, createCanvas } from '@napi-rs/canvas'
import type { JpegImage } from '~~/server/utils/printPdf'

// Изображения (лого и подписи) генерируются один раз на тираж и
// переиспользуются для каждой страницы — иначе PDF на 1000 наклеек быстро
// распухает от повторяющихся JPEG.

let cachedFallback: JpegImage | null = null

export async function loadTenantLogoJpeg(brandingLogoUrl: string | null) {
  if (brandingLogoUrl) {
    const tenantLogo = await loadImageUrlJpeg(brandingLogoUrl)
    if (tenantLogo) return tenantLogo
  }
  return loadFallbackLogo()
}

export async function loadImageUrlJpeg(url: string) {
  return tryLoadFromUrl(url)
}

export function renderTextJpeg(
  text: string,
  opts: {
    widthPx: number
    heightPx: number
    fontSize: number
    bold?: boolean
    color?: string
    background?: string
  }
): JpegImage {
  const canvas = createCanvas(opts.widthPx, opts.heightPx)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = opts.background ?? '#ffffff'
  ctx.fillRect(0, 0, opts.widthPx, opts.heightPx)
  ctx.fillStyle = opts.color ?? '#0f172a'
  const weight = opts.bold ? '600' : '400'
  ctx.font = `${weight} ${opts.fontSize}px "Inter", "Helvetica", "Arial", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, opts.widthPx / 2, opts.heightPx / 2)
  const jpeg = canvas.toBuffer('image/jpeg', 92)
  return { data: jpeg, width: opts.widthPx, height: opts.heightPx }
}

async function tryLoadFromUrl(url: string) {
  try {
    if (url.startsWith('/uploads/')) {
      const cfg = useRuntimeConfig()
      const rel = url.replace(/^\/uploads\//, '')
      const filePath = path.resolve(process.cwd(), cfg.storage.localDir, rel)
      return await encodeFileToJpegOnWhite(filePath)
    } else if (url.startsWith('/')) {
      const filePath = path.resolve(process.cwd(), 'public', url.replace(/^\//, ''))
      return await encodeFileToJpegOnWhite(filePath)
    } else {
      const res = await fetch(url)
      if (!res.ok) return null
      const bytes = Buffer.from(await res.arrayBuffer())
      return await encodeToJpegOnWhite(bytes, detectExtension(bytes))
    }
  } catch {
    return null
  }
}

async function loadFallbackLogo() {
  if (cachedFallback) return cachedFallback
  cachedFallback = renderFallbackLogoJpeg()
  return cachedFallback
}

async function encodeFileToJpegOnWhite(filePath: string): Promise<JpegImage> {
  const img = await loadImage(filePath)
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, img.width, img.height)
  ctx.drawImage(img, 0, 0)
  const jpeg = canvas.toBuffer('image/jpeg', 92)
  return { data: jpeg, width: img.width, height: img.height }
}

async function encodeToJpegOnWhite(bytes: Buffer, ext: string): Promise<JpegImage> {
  const dir = path.join(os.tmpdir(), 'quar-print-images')
  await mkdir(dir, { recursive: true })
  const filePath = path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`)
  try {
    await writeFile(filePath, bytes)
    return await encodeFileToJpegOnWhite(filePath)
  } finally {
    await rm(filePath, { force: true }).catch(() => {})
  }
}

function renderFallbackLogoJpeg(): JpegImage {
  const size = 1024
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = '#0c3fe9'
  ctx.fillRect(96, 96, 832, 832)
  ctx.fillStyle = '#ffffff'
  ctx.font = '700 520px "Inter", "Helvetica", "Arial", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('Q', size / 2, size / 2 + 18)
  const jpeg = canvas.toBuffer('image/jpeg', 92)
  return { data: jpeg, width: size, height: size }
}

function detectExtension(bytes: Buffer) {
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png'
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpg'
  }
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'webp'
  }
  return 'png'
}
