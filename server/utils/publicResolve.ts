// Public renderer data assembly.
// Given (tenantSlug, instructionSlug) or short id, return the rendering payload
// with plan-aware filtering of sections and modules.
import { prisma } from './prisma'
import { effectiveFeatures, planAllowsModule } from './plan'
import { getPublicLegalPayload, normalizeLegalProfile } from './legal'
import type { TiptapDoc, TiptapNode } from '~~/shared/types/instruction'

export interface ResolvedSectionRef {
  sectionId: string
  name: string
  content: unknown
}
export interface ResolvedModuleRef {
  tenantModuleConfigId: string
  code: string
  name: string
  config: Record<string, unknown>
}

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
  legal: {
    operator: {
      configured: boolean
      operatorName: string
      legalName: string | null
      inn: string | null
      ogrn: string | null
      address: string | null
      pdEmail: string | null
      policyUrl: string | null
      platformName: string
    }
    documents: Record<string, {
      id: string
      type: string
      title: string
      content: string
      textHash: string
      publishedAt: Date
    }>
  }
  // slot-attached (legacy / "always show before/after")
  sections: Array<{ id: string; name: string; slot: string; position: number; content: unknown }>
  modules: Array<{
    attachmentId: string
    code: string
    name: string
    slot: string
    position: number
    config: Record<string, unknown>
  }>
  // refs embedded inside the TipTap doc — keyed by id for O(1) lookup at render time
  refs: {
    sections: Record<string, ResolvedSectionRef>
    modules: Record<string, ResolvedModuleRef>
  }
  planActive: boolean
}

export async function loadPublicByPath(tenantSlug: string, instructionSlug: string) {
  return loadPublic({ tenantSlug, instructionSlug })
}

export async function loadPublicByShortId(shortId: string) {
  return loadPublic({ shortId })
}

// Walk the TipTap doc collecting (sectionRef, moduleRef) ids embedded as nodes.
function collectRefs(doc: unknown): { sectionIds: Set<string>; configIds: Set<string> } {
  const sectionIds = new Set<string>()
  const configIds = new Set<string>()
  const walk = (n: TiptapNode | undefined) => {
    if (!n) return
    if (n.type === 'sectionRef') {
      const id = (n.attrs as any)?.sectionId
      if (typeof id === 'string') sectionIds.add(id)
    } else if (n.type === 'moduleRef') {
      const id = (n.attrs as any)?.tenantModuleConfigId
      if (typeof id === 'string') configIds.add(id)
    }
    n.content?.forEach(walk)
  }
  ;(doc as TiptapDoc | undefined)?.content?.forEach(walk)
  return { sectionIds, configIds }
}

async function loadPublic(opts: { tenantSlug?: string; instructionSlug?: string; shortId?: string }): Promise<PublicRenderPayload | null> {
  const where = opts.shortId
    ? { shortId: opts.shortId }
    : { tenant: { slug: opts.tenantSlug! }, slug: opts.instructionSlug! }

  const instruction = await prisma.instruction.findFirst({
    where,
    include: {
      tenant: { include: { subscription: { include: { plan: true } }, legalProfile: true } },
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

  // Sections from slots (legacy attachment system)
  const sections = features.customSections
    ? instruction.sectionAttachments.map((a) => ({
        id: a.section.id,
        name: a.section.name,
        slot: a.slot,
        position: a.position,
        content: a.section.content
      }))
    : []

  // Modules from slots
  const modules = instruction.moduleAttachments
    .filter((a) => a.tenantModuleConfig.enabled && planAllowsModule(features, a.tenantModuleConfig.module.code))
    .map((a) => ({
      attachmentId: a.id,
      code: a.tenantModuleConfig.module.code,
      name: a.tenantModuleConfig.module.name,
      slot: a.slot,
      position: a.position,
      config: {
        ...(a.tenantModuleConfig.config as Record<string, unknown>),
        ...(a.configOverride as Record<string, unknown>)
      }
    }))

  // Inline refs embedded in the TipTap doc — same plan-gating applies
  const { sectionIds, configIds } = collectRefs(instruction.publishedVersion.content)
  const refSections: Record<string, ResolvedSectionRef> = {}
  const refModules: Record<string, ResolvedModuleRef> = {}

  if (features.customSections && sectionIds.size) {
    const rows = await prisma.section.findMany({
      where: { id: { in: [...sectionIds] }, tenantId: instruction.tenant.id }
    })
    for (const r of rows) {
      refSections[r.id] = { sectionId: r.id, name: r.name, content: r.content }
    }
  }
  if (configIds.size) {
    const rows = await prisma.tenantModuleConfig.findMany({
      where: { id: { in: [...configIds] }, tenantId: instruction.tenant.id, enabled: true },
      include: { module: true }
    })
    for (const r of rows) {
      if (!planAllowsModule(features, r.module.code)) continue
      refModules[r.id] = {
        tenantModuleConfigId: r.id,
        code: r.module.code,
        name: r.module.name,
        config: r.config as Record<string, unknown>
      }
    }
  }

  const branding =
    instruction.tenant.brandingLogoUrl || (planActive && (instruction.tenant.brandingPrimaryColor || instruction.tenant.brandingFontFamily))
      ? {
          primaryColor: planActive ? instruction.tenant.brandingPrimaryColor : null,
          logoUrl: instruction.tenant.brandingLogoUrl,
          fontFamily: planActive ? instruction.tenant.brandingFontFamily : null
        }
      : null
  const legalProfile = normalizeLegalProfile(instruction.tenant)
  const legal = await getPublicLegalPayload(instruction.tenant.id, instruction.tenant.name, legalProfile)

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
    legal,
    sections,
    modules,
    refs: { sections: refSections, modules: refModules },
    planActive
  }
}
