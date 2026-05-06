import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { uploadObject } from '~~/server/utils/storage'
import { generateShortId } from '~~/server/utils/slug'

const MAX_BYTES = 50 * 1024 * 1024 // 50MB

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file')
  if (!file?.data || !file.filename) throw createError({ statusCode: 400, statusMessage: 'No file' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'File too large' })

  const ext = file.filename.split('.').pop()?.toLowerCase() ?? 'bin'
  const key = `${tenant.id}/${generateShortId()}.${ext}`
  const url = await uploadObject(key, file.data, file.type ?? 'application/octet-stream')

  const asset = await prisma.mediaAsset.create({
    data: {
      tenantId: tenant.id,
      key,
      url,
      mimeType: file.type ?? 'application/octet-stream',
      sizeBytes: file.data.length,
      uploadedById: user.id
    }
  })
  return { asset: { id: asset.id, url: asset.url, mimeType: asset.mimeType } }
})
