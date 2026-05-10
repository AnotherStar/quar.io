// OpenAI model catalog used by quar.io.
//
// Source of truth:
// - https://developers.openai.com/api/docs/models
// - https://developers.openai.com/api/docs/models/gpt-5.5
// - https://developers.openai.com/api/docs/models/gpt-5.4
// - https://developers.openai.com/api/docs/models/gpt-5.4-mini
// - https://developers.openai.com/api/docs/models/gpt-5.4-nano
// - https://developers.openai.com/api/docs/models/gpt-5
// - https://developers.openai.com/api/docs/models/gpt-5-mini
// - https://developers.openai.com/api/docs/models/gpt-5-nano

export type OpenAIModelId =
  | 'gpt-5.5'
  | 'gpt-5.4'
  | 'gpt-5'
  | 'gpt-5.4-mini'
  | 'gpt-5-mini'
  | 'gpt-5.4-nano'
  | 'gpt-5-nano'

export interface OpenAIModelInfo {
  id: OpenAIModelId
  label: string
  description: string
  pricingUsdPer1M: {
    input: number
    cachedInput: number
    output: number
  }
  contextWindowTokens: number
  maxOutputTokens: number
  knowledgeCutoff: string
  modalities: {
    text: 'input-output'
    image: 'input-only' | 'not-supported'
    audio: 'not-supported'
    video: 'not-supported'
  }
  reasoningEfforts: string[]
  reasoningTokens: boolean
  structuredOutputs: boolean
  streaming: boolean
  functionCalling: boolean
  tools: string[]
  recommendedFor: string
}

export const AI_MODEL_CATALOG: Record<OpenAIModelId, OpenAIModelInfo> = {
  'gpt-5.5': {
    id: 'gpt-5.5',
    label: 'GPT-5.5',
    description: 'Newest frontier model for complex professional work.',
    pricingUsdPer1M: { input: 5, cachedInput: 0.5, output: 30 },
    contextWindowTokens: 1_050_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: '2025-12-01',
    modalities: { text: 'input-output', image: 'input-only', audio: 'not-supported', video: 'not-supported' },
    reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
    reasoningTokens: true,
    structuredOutputs: true,
    streaming: true,
    functionCalling: true,
    tools: ['web_search', 'file_search', 'image_generation', 'code_interpreter', 'hosted_shell', 'apply_patch', 'skills', 'computer_use', 'mcp', 'tool_search'],
    recommendedFor: 'Highest quality generation, difficult reasoning, complex professional work.'
  },
  'gpt-5.4': {
    id: 'gpt-5.4',
    label: 'GPT-5.4',
    description: 'Frontier model for complex professional workflows at lower cost than GPT-5.5.',
    pricingUsdPer1M: { input: 2.5, cachedInput: 0.25, output: 15 },
    contextWindowTokens: 1_050_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: '2025-08-31',
    modalities: { text: 'input-output', image: 'input-only', audio: 'not-supported', video: 'not-supported' },
    reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
    reasoningTokens: true,
    structuredOutputs: true,
    streaming: true,
    functionCalling: true,
    tools: ['web_search', 'file_search', 'image_generation', 'code_interpreter', 'hosted_shell', 'apply_patch', 'skills', 'computer_use', 'mcp', 'tool_search'],
    recommendedFor: 'High-quality generation with strong reasoning when GPT-5.5 is too expensive.'
  },
  'gpt-5': {
    id: 'gpt-5',
    label: 'GPT-5',
    description: 'Previous reasoning model for coding and agentic tasks.',
    pricingUsdPer1M: { input: 1.25, cachedInput: 0.125, output: 10 },
    contextWindowTokens: 400_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: '2024-09-30',
    modalities: { text: 'input-output', image: 'input-only', audio: 'not-supported', video: 'not-supported' },
    reasoningEfforts: ['minimal', 'low', 'medium', 'high'],
    reasoningTokens: true,
    structuredOutputs: true,
    streaming: true,
    functionCalling: true,
    tools: ['web_search', 'file_search', 'image_generation', 'code_interpreter', 'mcp'],
    recommendedFor: 'Legacy GPT-5 workloads where predictable behavior matters.'
  },
  'gpt-5.4-mini': {
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 mini',
    description: 'Strong mini model for high-volume workloads, coding, computer use, and subagents.',
    pricingUsdPer1M: { input: 0.75, cachedInput: 0.075, output: 4.5 },
    contextWindowTokens: 400_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: '2025-08-31',
    modalities: { text: 'input-output', image: 'input-only', audio: 'not-supported', video: 'not-supported' },
    reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
    reasoningTokens: true,
    structuredOutputs: true,
    streaming: true,
    functionCalling: true,
    tools: ['web_search', 'file_search', 'image_generation', 'code_interpreter', 'hosted_shell', 'apply_patch', 'skills', 'computer_use', 'mcp', 'tool_search'],
    recommendedFor: 'Default instruction-from-file generation: good quality/cost balance with image input.'
  },
  'gpt-5-mini': {
    id: 'gpt-5-mini',
    label: 'GPT-5 mini',
    description: 'Cost-efficient GPT-5 model for well-defined tasks and precise prompts.',
    pricingUsdPer1M: { input: 0.25, cachedInput: 0.025, output: 2 },
    contextWindowTokens: 400_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: '2024-05-31',
    modalities: { text: 'input-output', image: 'input-only', audio: 'not-supported', video: 'not-supported' },
    reasoningEfforts: ['minimal', 'low', 'medium', 'high'],
    reasoningTokens: true,
    structuredOutputs: true,
    streaming: true,
    functionCalling: true,
    tools: ['web_search', 'file_search', 'code_interpreter', 'mcp'],
    recommendedFor: 'Lower-cost instruction generation experiments.'
  },
  'gpt-5.4-nano': {
    id: 'gpt-5.4-nano',
    label: 'GPT-5.4 nano',
    description: 'Cheapest GPT-5.4-class model for simple high-volume tasks.',
    pricingUsdPer1M: { input: 0.2, cachedInput: 0.02, output: 1.25 },
    contextWindowTokens: 400_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: '2025-08-31',
    modalities: { text: 'input-output', image: 'input-only', audio: 'not-supported', video: 'not-supported' },
    reasoningEfforts: ['none', 'low', 'medium', 'high', 'xhigh'],
    reasoningTokens: true,
    structuredOutputs: true,
    streaming: true,
    functionCalling: true,
    tools: ['web_search', 'file_search', 'image_generation', 'code_interpreter', 'hosted_shell', 'apply_patch', 'skills', 'mcp'],
    recommendedFor: 'Cheap extraction/classification trials with image input.'
  },
  'gpt-5-nano': {
    id: 'gpt-5-nano',
    label: 'GPT-5 nano',
    description: 'Fastest and cheapest GPT-5 model.',
    pricingUsdPer1M: { input: 0.05, cachedInput: 0.005, output: 0.4 },
    contextWindowTokens: 400_000,
    maxOutputTokens: 128_000,
    knowledgeCutoff: '2024-05-31',
    modalities: { text: 'input-output', image: 'input-only', audio: 'not-supported', video: 'not-supported' },
    reasoningEfforts: ['minimal', 'low', 'medium', 'high'],
    reasoningTokens: true,
    structuredOutputs: true,
    streaming: true,
    functionCalling: true,
    tools: ['web_search', 'file_search', 'image_generation', 'code_interpreter', 'mcp'],
    recommendedFor: 'Cheapest baseline for extraction, summarization, and classification.'
  }
}

export const INSTRUCTION_GENERATION_MODEL: OpenAIModelId = 'gpt-5.4-mini'

export function getOpenAIModelInfo(model: OpenAIModelId) {
  return AI_MODEL_CATALOG[model]
}
