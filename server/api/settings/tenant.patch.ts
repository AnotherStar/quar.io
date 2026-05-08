import { z } from 'zod'
import { requireTenant, invalidateTenantMembershipCache } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'

const schema = z.object({
  brandingLogoUrl: z.string().min(1).max(2048).nullable(),
  logoAssetId: z.string().min(1).optional()
})
const MAX_LOGO_BYTES = 5 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const { tenant } = await requireTenant(event, { minRole: 'OWNER' })
  const body = await readValidatedBody(event, schema.parse)

  if (body.brandingLogoUrl) {
    if (!body.logoAssetId) {
      throw createError({ statusCode: 400, statusMessage: 'Logo asset id required' })
    }

    const asset = await prisma.mediaAsset.findFirst({
      where: {
        id: body.logoAssetId,
        tenantId: tenant.id,
        url: body.brandingLogoUrl
      }
    })

    if (!asset || !asset.mimeType.startsWith('image/')) {
      throw createError({ statusCode: 400, statusMessage: 'Logo must be an uploaded image' })
    }
    if (asset.sizeBytes > MAX_LOGO_BYTES) {
      throw createError({ statusCode: 413, statusMessage: 'Logo file is too large' })
    }
  }

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: { brandingLogoUrl: body.brandingLogoUrl },
    select: {
      id: true,
      slug: true,
      name: true,
      brandingLogoUrl: true
    }
  })

  invalidateTenantMembershipCache(tenant.id)

  return { tenant: updated }
})
