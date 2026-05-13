// AI usage logging. One row in `AiUsageEvent` per OpenAI invocation
// (success, error, or aborted). Cost/token data is best-effort — when the
// provider doesn't return usage (e.g. abort before completion, image APIs)
// the corresponding fields are stored as NULL.
//
// All AI endpoints must call recordAiUsage() in their finally block. Quota
// enforcement is not implemented here — when limits are introduced, query
// AiUsageEvent for the tenant's current period and reject before calling the
// model.
import { prisma } from './prisma'

export type AiFeature =
  | 'instruction-generation'
  | 'image-edit'
  | 'image-generate'
  | 'inline-prompt-text'
  | 'inline-prompt-image'
export type AiUsageStatus = 'success' | 'error' | 'aborted'

export interface RecordAiUsageInput {
  tenantId: string
  userId?: string | null
  feature: AiFeature
  model: string
  status: AiUsageStatus
  errorMessage?: string | null

  inputTokens?: number | null
  cachedInputTokens?: number | null
  outputTokens?: number | null
  reasoningTokens?: number | null
  totalTokens?: number | null

  imageCount?: number | null

  estimatedCostUsd?: number | null
  durationMs?: number | null
  requestId?: string | null
  metadata?: Record<string, unknown> | null
}

export async function recordAiUsage(input: RecordAiUsageInput): Promise<void> {
  // Never let logging take the user-facing request down with it.
  try {
    await prisma.aiUsageEvent.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId ?? null,
        feature: input.feature,
        model: input.model,
        status: input.status,
        errorMessage: input.errorMessage ?? null,
        inputTokens: input.inputTokens ?? null,
        cachedInputTokens: input.cachedInputTokens ?? null,
        outputTokens: input.outputTokens ?? null,
        reasoningTokens: input.reasoningTokens ?? null,
        totalTokens: input.totalTokens ?? null,
        imageCount: input.imageCount ?? null,
        estimatedCostUsd: input.estimatedCostUsd ?? null,
        durationMs: input.durationMs ?? null,
        requestId: input.requestId ?? null,
        metadata: (input.metadata as object | undefined) ?? undefined
      }
    })
  } catch (e: any) {
    console.error('[aiUsage] failed to record', {
      tenantId: input.tenantId,
      feature: input.feature,
      status: input.status,
      message: e?.message
    })
  }
}
