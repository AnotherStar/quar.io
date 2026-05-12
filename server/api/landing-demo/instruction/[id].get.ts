import { EMPTY_DOC, type TiptapDoc } from '~~/shared/types/instruction'
import { prisma } from '~~/server/utils/prisma'

const LANDING_DEMO_INSTRUCTION_ID = 'cmp2io29m000emth5f6v2yhne'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (id !== LANDING_DEMO_INSTRUCTION_ID) {
    throw createError({ statusCode: 404, statusMessage: 'Instruction not found' })
  }

  const instruction = await prisma.instruction.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      draftContent: true
    }
  })

  if (!instruction) {
    throw createError({ statusCode: 404, statusMessage: 'Instruction not found' })
  }

  return {
    instruction: {
      id: instruction.id,
      title: instruction.title,
      content: (instruction.draftContent ?? EMPTY_DOC) as TiptapDoc
    }
  }
})
