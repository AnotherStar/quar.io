// Called by the browser after a successful direct PUT to S3.
// Creates the MediaAsset row so we have a record for cleanup/quota.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { z } from 'zod'

const schema = z.object({
  key: z.string().min(1).max(500),
  url: z.string().url(),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().min(1).max(50 * 1024 * 1024)
})

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, schema.parse)

  // Make sure the key belongs to this tenant (uploader can't claim others' keys)
  if (!body.key.startsWith(`${tenant.id}/`)) {
    throw createError({ statusCode: 400, statusMessage: 'Key prefix mismatch' })
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      tenantId: tenant.id,
      key: body.key,
      url: body.url,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
      uploadedById: user.id
    }
  })
  return { asset: { id: asset.id, url: asset.url, mimeType: asset.mimeType } }
})
