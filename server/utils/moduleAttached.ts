// Returns true if a given module code is attached to a published instruction
// either via slot-based InstructionModuleAttachment OR via an inline
// `moduleRef` node embedded in the TipTap document.
import { prisma } from './prisma'
import type { TiptapDoc, TiptapNode } from '~~/shared/types/instruction'

function collectInlineConfigIds(doc: unknown): Set<string> {
  const ids = new Set<string>()
  const walk = (n: TiptapNode | undefined) => {
    if (!n) return
    if (n.type === 'moduleRef') {
      const id = (n.attrs as any)?.tenantModuleConfigId
      if (typeof id === 'string') ids.add(id)
    }
    n.content?.forEach(walk)
  }
  ;(doc as TiptapDoc | undefined)?.content?.forEach(walk)
  return ids
}

export async function isModuleAttachedToPublished(
  instructionId: string,
  moduleCode: string
): Promise<boolean> {
  const instr = await prisma.instruction.findUnique({
    where: { id: instructionId },
    include: {
      publishedVersion: true,
      moduleAttachments: {
        include: { tenantModuleConfig: { include: { module: true } } }
      }
    }
  })
  if (!instr || instr.status !== 'PUBLISHED' || !instr.publishedVersion) return false

  // Slot-attached
  const slotAttached = instr.moduleAttachments.some(
    (a) => a.tenantModuleConfig.module.code === moduleCode && a.tenantModuleConfig.enabled
  )
  if (slotAttached) return true

  // Inline-embedded via TipTap moduleRef nodes in the published version
  const inlineIds = collectInlineConfigIds(instr.publishedVersion.content)
  if (!inlineIds.size) return false
  const matchingConfigs = await prisma.tenantModuleConfig.count({
    where: {
      id: { in: [...inlineIds] },
      enabled: true,
      tenantId: instr.tenantId,
      module: { code: moduleCode }
    }
  })
  return matchingConfigs > 0
}
