// Каталог всех настраиваемых AI-конфигов quar.io.
//
// Каждая фича = ключ + Zod-схема + метаданные для UI. Сами значения (модели,
// промпты, параметры) живут только в БД: runtime читает активную версию
// через server/utils/aiSettings.ts и падает с 503, если её нет. Никакие
// дефолты-промпты в коде не хранятся — это сознательное решение, чтобы
// продакшен нельзя было случайно запустить на «дефолтах разработчика».
//
// Стартовая инициализация БД (v1 для каждой фичи) делается через
// prisma/seed.ts → prisma/aiSeedDefaults.ts. Этот файл импортируется только
// из seed-скрипта и не входит в runtime-цепочку.
import { z } from 'zod'
import { AI_MODEL_CATALOG, type OpenAIModelId } from './openaiModels'

// ─────────────────────────────────────────────────────────────────────────────
// Reasoning effort: gpt-5.x — reasoning-модели, температуру не принимают.
// Единый список — наибольший супермножество среди моделей в каталоге.
// Конкретные допустимые значения для каждой модели берём из
// AI_MODEL_CATALOG[model].reasoningEfforts.
// ─────────────────────────────────────────────────────────────────────────────
export const REASONING_EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'] as const
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]

export const IMAGE_GENERATION_MODELS = ['gpt-image-2-2026-04-21', 'gpt-image-1.5', 'gpt-image-1'] as const
export type ImageGenerationModel = (typeof IMAGE_GENERATION_MODELS)[number]

export const IMAGE_GENERATION_SIZES = ['1024x1024', '1024x1536', '1536x1024', 'auto'] as const
export type ImageGenerationSize = (typeof IMAGE_GENERATION_SIZES)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Типы значений
// ─────────────────────────────────────────────────────────────────────────────
export interface TextLlmConfig {
  model: OpenAIModelId
  systemPrompt: string
  reasoningEffort: ReasoningEffort
}

export interface ImageGenerationConfig {
  model: ImageGenerationModel
  size: ImageGenerationSize
  n: number
}

// Статическая обвязка вокруг пользовательского промпта: админ задаёт шаблон
// с плейсхолдером {{prompt}}, сервер подставляет туда ввод пользователя
// перед отправкой в image-gen. Никакого LLM-вызова посередине нет.
export interface PromptWrapperConfig {
  template: string
}

export const PROMPT_WRAPPER_PLACEHOLDER = '{{prompt}}'

// ─────────────────────────────────────────────────────────────────────────────
// Zod-схемы. Применяются на чтении из БД и при сохранении из админки.
// model-поле валидируется по AI_MODEL_CATALOG, не enum'ом, чтобы добавление
// новой модели в каталог не требовало правок схем.
// ─────────────────────────────────────────────────────────────────────────────
const openAiModelSchema = z.string().refine(
  (v): v is OpenAIModelId => v in AI_MODEL_CATALOG,
  'Неизвестная модель OpenAI'
)

const reasoningEffortSchema = z.enum(REASONING_EFFORTS)

export const textLlmConfigSchema = z.object({
  model: openAiModelSchema,
  systemPrompt: z.string().min(1).max(20000),
  reasoningEffort: reasoningEffortSchema
})

export const imageGenerationConfigSchema = z.object({
  model: z.enum(IMAGE_GENERATION_MODELS),
  size: z.enum(IMAGE_GENERATION_SIZES),
  n: z.number().int().min(1).max(4)
})

export const promptWrapperConfigSchema = z.object({
  template: z
    .string()
    .min(1)
    .max(20000)
    .refine(
      (t) => t.includes(PROMPT_WRAPPER_PLACEHOLDER),
      `Шаблон должен содержать плейсхолдер ${PROMPT_WRAPPER_PLACEHOLDER}`
    )
})

// ─────────────────────────────────────────────────────────────────────────────
// Каталог фич
// ─────────────────────────────────────────────────────────────────────────────
export const AI_SETTING_KEYS = [
  'instruction.generate.fromFiles',
  'instruction.generate.fromPrompt',
  'instruction.import',
  'instruction.inlinePrompt.text',
  'instruction.inlinePrompt.imageExpansion',
  'image.generate',
  'sticker.promptWrapper'
] as const

export type AiSettingKey = (typeof AI_SETTING_KEYS)[number]

interface BaseFeatureMeta {
  key: AiSettingKey
  label: string
  description: string
}

interface TextLlmFeature extends BaseFeatureMeta {
  kind: 'text-llm'
  schema: typeof textLlmConfigSchema
}

interface ImageGenerationFeature extends BaseFeatureMeta {
  kind: 'image-generation'
  schema: typeof imageGenerationConfigSchema
}

interface PromptWrapperFeature extends BaseFeatureMeta {
  kind: 'prompt-wrapper'
  schema: typeof promptWrapperConfigSchema
}

export type AiFeatureMeta = TextLlmFeature | ImageGenerationFeature | PromptWrapperFeature

export const AI_FEATURE_CATALOG: Record<AiSettingKey, AiFeatureMeta> = {
  'instruction.generate.fromFiles': {
    key: 'instruction.generate.fromFiles',
    kind: 'text-llm',
    label: 'Генерация инструкции по файлам',
    description:
      'Стриминговая генерация черновика инструкции из загруженного PDF или изображения. Используется в редакторе при загрузке исходника.',
    schema: textLlmConfigSchema
  },
  'instruction.generate.fromPrompt': {
    key: 'instruction.generate.fromPrompt',
    kind: 'text-llm',
    label: 'Генерация инструкции по запросу',
    description:
      'Генерация черновика инструкции по текстовому описанию, без исходных файлов. Используется, когда пользователь описывает товар словами.',
    schema: textLlmConfigSchema
  },
  'instruction.import': {
    key: 'instruction.import',
    kind: 'text-llm',
    label: 'Массовый импорт инструкций',
    description:
      'Фоновый воркер импорта: каждый загруженный файл превращается в черновик инструкции. Промпт совпадает с генерацией по файлам, но настраивается отдельно.',
    schema: textLlmConfigSchema
  },
  'instruction.inlinePrompt.text': {
    key: 'instruction.inlinePrompt.text',
    kind: 'text-llm',
    label: 'AI-помощник в редакторе (текст)',
    description:
      'Inline-генерация блоков в редакторе: пользователь пишет короткий запрос на месте курсора, ИИ возвращает блоки TipTap.',
    schema: textLlmConfigSchema
  },
  'instruction.inlinePrompt.imageExpansion': {
    key: 'instruction.inlinePrompt.imageExpansion',
    kind: 'text-llm',
    label: 'AI-помощник в редакторе (расширение image-промпта)',
    description:
      'Дополнительный шаг перед генерацией картинки в редакторе: короткий пользовательский запрос превращается в подробный визуальный промпт.',
    schema: textLlmConfigSchema
  },
  'image.generate': {
    key: 'image.generate',
    kind: 'image-generation',
    label: 'Генерация картинок',
    description:
      'Эндпоинт генерации изображений по текстовому промпту пользователя и inline-генерация картинок в редакторе.',
    schema: imageGenerationConfigSchema
  },
  'sticker.promptWrapper': {
    key: 'sticker.promptWrapper',
    kind: 'prompt-wrapper',
    label: 'Обвязка промпта для стикеров',
    description:
      'Шаблон, в который заворачивается ввод пользователя при генерации фона стикера. Сюда удобно вынести технические требования (чистая зона под QR-код, без текста, печатное качество и т.п.). Плейсхолдер {{prompt}} обязателен — на его место подставляется текст из формы.',
    schema: promptWrapperConfigSchema
  }
}

export const AI_FEATURE_LIST: AiFeatureMeta[] = AI_SETTING_KEYS.map((k) => AI_FEATURE_CATALOG[k])

// Узкое сопоставление key → config-тип для callsite'ов. Записываем явно
// (а не выводим из AI_FEATURE_CATALOG), потому что Record<…, AiFeatureMeta>
// схлопывает к union и теряет per-key narrowing.
export interface AiSettingValueMap {
  'instruction.generate.fromFiles': TextLlmConfig
  'instruction.generate.fromPrompt': TextLlmConfig
  'instruction.import': TextLlmConfig
  'instruction.inlinePrompt.text': TextLlmConfig
  'instruction.inlinePrompt.imageExpansion': TextLlmConfig
  'image.generate': ImageGenerationConfig
  'sticker.promptWrapper': PromptWrapperConfig
}

export type AiSettingValue<K extends AiSettingKey> = AiSettingValueMap[K]

export function isAiSettingKey(value: string): value is AiSettingKey {
  return (AI_SETTING_KEYS as readonly string[]).includes(value)
}

// Stable error code, бросаемый из server/utils/aiSettings.ts когда у фичи
// нет активной версии в БД. Эндпоинты ловят его и возвращают пользователю
// человекочитаемое сообщение с подсказкой обратиться к админу.
export const AI_SETTING_NOT_CONFIGURED = 'AI_SETTING_NOT_CONFIGURED'
