// Returns either:
// - presigned PUT URL for direct browser → S3 upload (S3 driver), or
// - { fallback: true } telling the client to use POST /api/media/upload
//   (local driver, browser → Nuxt → disk).
// The MediaAsset DB row is created later by /api/media/confirm after the
// browser-direct PUT succeeds, so we don't have orphaned DB rows from
// failed direct uploads.
import { requireTenant } from '~~/server/utils/tenant'
import { presignUpload } from '~~/server/utils/storage'
import { generateShortId } from '~~/server/utils/slug'
import { z } from 'zod'

const schema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(200),
  sizeBytes: z.number().int().min(1).max(50 * 1024 * 1024)
})

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'EDITOR' })
  const body = await readValidatedBody(event, schema.parse)

  const ext = body.filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const key = `${tenant.id}/${generateShortId()}.${ext}`

  const presigned = await presignUpload(key, body.contentType)
  if (!presigned) return { fallback: true as const }

  return {
    fallback: false as const,
    ...presigned,
    sizeBytes: body.sizeBytes,
    contentType: body.contentType
  }
})
