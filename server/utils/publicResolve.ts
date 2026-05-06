// Public renderer data assembly.
// Given (tenantSlug, instructionSlug) or short id, return the rendering payload
// with plan-aware filtering of sections and modules.
import { prisma } from './prisma'
import { effectiveFeatures, planAllowsModule } from './plan'

export interface PublicRenderPayload {
  instruction: {
    id: string
    slug: string
    title: string
    description: string | null
    language: string
    publishedAt: Date | null
    versionId: string | null
    versionNumber: number | null
    content: unknown
  }
  tenant: {
    name: string
    slug: string
    branding: {
      primaryColor: string | null
      logoUrl: string | null
      fontFamily: string | null
    } | null
  }
  sections: Array<{ id: string; name: string; slot: string; position: number; content: unknown }>
  modules: Array<{
    attachmentId: string
    code: string
    name: string
    slot: string
    position: number
    config: Record<string, unknown>
  }>
  planActive: boolean
}

export async function loadPublicByPath(tenantSlug: string, instructionSlug: string) {
  return loadPublic({ tenantSlug, instructionSlug })
}

export async function loadPublicByShortId(shortId: string) {
  return loadPublic({ shortId })
}

async function loadPublic(opts: { tenantSlug?: string; instructionSlug?: string; shortId?: string }): Promise<PublicRenderPayload | null> {
  const where = opts.shortId
    ? { shortId: opts.shortId }
    : { tenant: { slug: opts.tenantSlug! }, slug: opts.instructionSlug! }

  const instruction = await prisma.instruction.findFirst({
    where,
    include: {
      tenant: { include: { subscription: { include: { plan: true } } } },
      publishedVersion: true,
      sectionAttachments: { include: { section: true }, orderBy: { position: 'asc' } },
      moduleAttachments: {
        include: { tenantModuleConfig: { include: { module: true } } },
        orderBy: { position: 'asc' }
      }
    }
  })
  if (!instruction || instruction.status !== 'PUBLISHED' || !instruction.publishedVersion) {
    return null
  }

  const features = effectiveFeatures(instruction.tenant)
  const planActive = !!instruction.tenant.subscription && instruction.tenant.subscription.status === 'active'

  // Sections: only render if plan allows custom sections
  const sections = features.customSections
    ? instruction.sectionAttachments.map((a) => ({
        id: a.section.id,
        name: a.section.name,
        slot: a.slot,
        position: a.position,
        content: a.section.content
      }))
    : []

  // Modules: only render if attached, enabled, and module is allowed by plan
  const modules = instruction.moduleAttachments
    .filter((a) => a.tenantModuleConfig.enabled && planAllowsModule(features, a.tenantModuleConfig.module.code))
    .map((a) => ({
      attachmentId: a.id,
      code: a.tenantModuleConfig.module.code,
      name: a.tenantModuleConfig.module.name,
      slot: a.slot,
      position: a.position,
      // merged config: tenant defaults < per-instruction override
      config: {
        ...(a.tenantModuleConfig.config as Record<string, unknown>),
        ...(a.configOverride as Record<string, unknown>)
      }
    }))

  // Branding only when plan active
  const branding =
    planActive && (instruction.tenant.brandingPrimaryColor || instruction.tenant.brandingLogoUrl || instruction.tenant.brandingFontFamily)
      ? {
          primaryColor: instruction.tenant.brandingPrimaryColor,
          logoUrl: instruction.tenant.brandingLogoUrl,
          fontFamily: instruction.tenant.brandingFontFamily
        }
      : null

  return {
    instruction: {
      id: instruction.id,
      slug: instruction.slug,
      title: instruction.title,
      description: instruction.description,
      language: instruction.language,
      publishedAt: instruction.publishedAt,
      versionId: instruction.publishedVersion.id,
      versionNumber: instruction.publishedVersion.versionNumber,
      content: instruction.publishedVersion.content
    },
    tenant: {
      name: instruction.tenant.name,
      slug: instruction.tenant.slug,
      branding
    },
    sections,
    modules,
    planActive
  }
}
