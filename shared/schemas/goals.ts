import { z } from 'zod'

export const GOAL_CODE_REGEX = /^[A-Z][A-Z0-9_]{2,63}$/

export const SystemGoal = {
  PAGE_VIEWED: 'PAGE_VIEWED',
  WARRANTY_FORM_OPENED: 'WARRANTY_FORM_OPENED',
  WARRANTY_SUBMITTED: 'WARRANTY_SUBMITTED',
  FEEDBACK_FORM_OPENED: 'FEEDBACK_FORM_OPENED',
  FEEDBACK_SUBMITTED: 'FEEDBACK_SUBMITTED',
  BLOCK_FEEDBACK_LEFT: 'BLOCK_FEEDBACK_LEFT'
} as const

export type SystemGoalCode = (typeof SystemGoal)[keyof typeof SystemGoal]

export const goalCodeSchema = z.string().regex(GOAL_CODE_REGEX, 'Invalid goal code')

export const goalRequestSchema = z.object({
  instructionId: z.string(),
  versionId: z.string().optional(),
  sessionId: z.string().min(8).max(64),
  code: goalCodeSchema,
  meta: z.record(z.unknown()).optional()
})

export type GoalRequest = z.infer<typeof goalRequestSchema>
