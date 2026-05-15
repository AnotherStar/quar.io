import { createError, getRouterParam, setHeader } from 'h3'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { getPrintTemplate } from '~~/print-templates/registry'
import { customPrintTemplate, parseCustomTemplateCode } from '~~/print-templates/custom'

const PREVIEW_TTL_MS = 60_000
const MAX_CACHE_ENTRIES = 100
const previewCache = new Map<string, { expiresAt: number; png: Buffer }>()

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event)
  const code = decodeURIComponent(getRouterParam(event, 'code') ?? '')
  const customId = parseCustomTemplateCode(code)
  const template = customId
    ? await loadCustomTemplate(tenant.id, customId)
    : getPrintTemplate(code)

  if (!template) {
    throw createError({ statusCode: 404, statusMessage: 'Шаблон не найден' })
  }
  if (!template.renderPreview) {
    throw createError({ statusCode: 500, statusMessage: 'У шаблона нет preview renderer' })
  }

  const appUrl = useRuntimeConfig().public.appUrl.replace(/\/$/, '')
  const cacheKey = [
    tenant.id,
    tenant.brandingLogoUrl ?? '',
    appUrl,
    template.manifest.code,
    template.manifest.version
  ].join(':')
  const cached = previewCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    setPreviewHeaders(event)
    return cached.png
  }

  const png = await template.renderPreview({
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      brandingLogoUrl: tenant.brandingLogoUrl
    },
    items: [{ shortId: 'preview', url: `${appUrl}/s/preview` }]
  })

  previewCache.set(cacheKey, { expiresAt: Date.now() + PREVIEW_TTL_MS, png })
  trimCache()
  setPreviewHeaders(event)
  return png
})

function setPreviewHeaders(event: Parameters<typeof setHeader>[0]) {
  setHeader(event, 'Content-Type', 'image/png')
  setHeader(event, 'Cache-Control', 'private, max-age=60')
}

function trimCache() {
  if (previewCache.size <= MAX_CACHE_ENTRIES) return
  const now = Date.now()
  for (const [key, value] of previewCache) {
    if (value.expiresAt <= now || previewCache.size > MAX_CACHE_ENTRIES) {
      previewCache.delete(key)
    }
  }
}

// Доступ: свой шаблон или публичный. Чужие приватные → 404.
async function loadCustomTemplate(tenantId: string, id: string) {
  const record = await prisma.printTemplateDesign.findFirst({
    where: {
      id,
      archivedAt: null,
      OR: [{ tenantId }, { isPublic: true }]
    }
  })
  return record ? customPrintTemplate(record) : undefined
}
