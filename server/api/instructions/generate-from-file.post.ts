// Generates a draft Instruction from an uploaded PDF or image using OpenAI.
// Returns the new instruction id AND the list of AI blocks — the client uses
// the blocks list to animate them appearing one-by-one in the editor (typing
// effect). The DB draft already contains the full content, so if the user
// reloads mid-animation, they still end up with a complete instruction.
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { effectiveFeatures } from '~~/server/utils/plan'
import { generateShortId } from '~~/server/utils/slug'
import {
  generateInstructionFromFile,
  aiBlocksToTipTap,
  type AiBlock
} from '~~/server/utils/aiInstructionGenerator'

const MAX_BYTES = 25 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })

  const features = effectiveFeatures(tenant)
  if (features.maxInstructions !== -1) {
    const activeCount = await prisma.instruction.count({
      where: { tenantId: tenant.id, status: { not: 'ARCHIVED' } }
    })
    if (activeCount >= features.maxInstructions) {
      throw createError({
        statusCode: 402,
        statusMessage: `Достигнут лимит активных инструкций (${features.maxInstructions}). Архивируйте старые или обновите тариф.`
      })
    }
  }

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file')
  if (!file?.data || !file.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Файл не передан' })
  }
  if (file.data.length > MAX_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Файл слишком большой (макс. 25 МБ)' })
  }

  const ai = await generateInstructionFromFile({
    buffer: file.data,
    filename: file.filename,
    mimeType: file.type ?? 'application/octet-stream'
  })

  let slug = ai.slug
  let suffix = 0
  while (await prisma.instruction.findUnique({ where: { tenantId_slug: { tenantId: tenant.id, slug } } })) {
    suffix++
    slug = `${ai.slug}-${suffix}`
  }

  const draft = aiBlocksToTipTap(ai)

  const instruction = await prisma.instruction.create({
    data: {
      tenantId: tenant.id,
      slug,
      shortId: generateShortId(),
      title: ai.title,
      description: ai.description || null,
      language: ai.language,
      createdById: user.id,
      draftContent: draft as object
    }
  })
  return {
    instruction: { id: instruction.id, slug: instruction.slug, title: instruction.title },
    // Client uses these to animate blocks appearing one-by-one in the editor.
    aiBlocks: ai.blocks satisfies AiBlock[]
  }
})
