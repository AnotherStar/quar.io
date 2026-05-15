// Inline AI-prompt generation: the editor sends a short user request, the
// current draft (with <<HERE>> marking the cursor) and a mode (text|image).
// We answer with either an array of TipTap nodes to splice in, or a single
// uploaded image URL. Distinct from /generate-stream which builds the whole
// instruction from scratch.
import { z } from 'zod'
import OpenAI from 'openai'
import { requireTenant } from '~~/server/utils/tenant'
import { prisma } from '~~/server/utils/prisma'
import { getOpenAIApiKey, getOpenAIBaseUrl } from '~~/server/utils/openai'
import { uploadObject } from '~~/server/utils/storage'
import { recordAiUsage, type AiUsageStatus } from '~~/server/utils/aiUsage'
import {
  RESPONSE_SCHEMA,
  aiBlocksToTipTap,
  type AiBlock,
  type AiInstruction
} from '~~/server/utils/aiInstructionGenerator'
import { getOpenAIModelInfo } from '~~/shared/openaiModels'
import { getAiSetting } from '~~/server/utils/aiSettings'

const BodySchema = z.object({
  prompt: z.string().min(1).max(2000),
  mode: z.enum(['text', 'image']),
  contextDoc: z.any().optional()
})

export default defineEventHandler(async (event) => {
  const { tenant, user } = await requireTenant(event, { minRole: 'EDITOR' })
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedBody(event, BodySchema.parse)

  const instr = await prisma.instruction.findFirst({
    where: { id, tenantId: tenant.id },
    select: { id: true, title: true, description: true, language: true }
  })
  if (!instr) throw createError({ statusCode: 404 })

  const cfg = useRuntimeConfig()
  const client = new OpenAI({
    apiKey: getOpenAIApiKey(String(cfg.openai.apiKey || '')),
    baseURL: getOpenAIBaseUrl().replace(/\/$/, '')
  })

  const context = summarizeContext(body.contextDoc, instr)

  if (body.mode === 'image') {
    return handleImage({ client, tenant, user, prompt: body.prompt, context })
  }
  return handleText({ client, tenant, user, instr, prompt: body.prompt, context })
})

interface ContextImage {
  index: number
  url: string
  alt: string
}

interface DocContext {
  text: string
  images: ContextImage[]
}

interface TextArgs {
  client: OpenAI
  tenant: { id: string }
  user: { id: string }
  instr: { id: string; title: string; description: string | null; language: string }
  prompt: string
  context: DocContext
}

async function handleText(args: TextArgs) {
  const { client, tenant, user, instr, prompt, context } = args
  const startedAt = Date.now()
  let usageStatus: AiUsageStatus = 'error'
  let usageError: string | null = null
  let inputTokens: number | null = null
  let outputTokens: number | null = null
  let totalTokens: number | null = null
  let estimatedCostUsd: number | null = null

  const imagesInPrompt = context.images.slice(0, 8)
  const imagesNote = imagesInPrompt.length
    ? `\n\nВ контекст также прикреплены ${imagesInPrompt.length} иллюстраций из инструкции (IMAGE_${imagesInPrompt[0].index}..IMAGE_${imagesInPrompt[imagesInPrompt.length - 1].index}). Они отмечены в тексте контекста маркерами вида [IMAGE_N]. Используй их, чтобы понять, что уже изображено, и не предлагай дублирующих иллюстраций.`
    : ''

  const userText = `Инструкция: "${instr.title}"${instr.description ? ` — ${instr.description}` : ''}
Язык документа: ${instr.language}

Контекст вокруг места вставки (маркер <<HERE>>):
${context.text}${imagesNote}

Запрос пользователя:
${prompt}

Сгенерируй блоки инструкции, которые должны встать на место <<HERE>>. Не повторяй текст, который уже есть выше или ниже.`

  const userContent: any[] = [{ type: 'input_text', text: userText }]
  for (const img of imagesInPrompt) {
    userContent.push({ type: 'input_image', image_url: img.url })
  }

  const aiConfig = await getAiSetting('instruction.inlinePrompt.text')
  const activeModel = aiConfig.model

  try {
    const res = await client.responses.create({
      model: activeModel,
      input: [
        { role: 'system', content: aiConfig.systemPrompt },
        { role: 'user', content: userContent }
      ],
      text: {
        format: { type: 'json_schema', name: 'instruction', schema: RESPONSE_SCHEMA as any, strict: true }
      },
      ...(aiConfig.reasoningEffort !== 'none'
        ? { reasoning: { effort: aiConfig.reasoningEffort } }
        : {})
    })

    const usageRaw = (res as any).usage
    if (usageRaw) {
      inputTokens = Number(usageRaw.input_tokens) || 0
      outputTokens = Number(usageRaw.output_tokens) || 0
      totalTokens = Number(usageRaw.total_tokens) || inputTokens + outputTokens
      const pricing = getOpenAIModelInfo(activeModel).pricingUsdPer1M
      if (pricing) {
        estimatedCostUsd = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
      }
    }

    const raw = extractOutputText(res)
    if (!raw) throw createError({ statusCode: 502, statusMessage: 'Пустой ответ ИИ' })
    const parsed = JSON.parse(raw) as Partial<AiInstruction>
    const blocks: AiBlock[] = Array.isArray(parsed.blocks) ? parsed.blocks : []
    if (!blocks.length) throw createError({ statusCode: 502, statusMessage: 'ИИ не вернул блоки' })

    const tipTapDoc = aiBlocksToTipTap({
      title: '',
      slug: '',
      description: '',
      language: instr.language,
      blocks
    })
    usageStatus = 'success'
    return { kind: 'text' as const, nodes: tipTapDoc.content ?? [] }
  } catch (e: any) {
    usageError = e?.statusMessage || e?.message || 'Ошибка ИИ'
    throw e
  } finally {
    await recordAiUsage({
      tenantId: tenant.id,
      userId: user.id,
      feature: 'inline-prompt-text',
      model: activeModel,
      status: usageStatus,
      errorMessage: usageError,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd,
      durationMs: Date.now() - startedAt,
      metadata: {
        instructionId: instr.id,
        promptChars: prompt.length
      }
    })
  }
}

interface ImageArgs {
  client: OpenAI
  tenant: { id: string }
  user: { id: string }
  prompt: string
  context: DocContext
}

async function handleImage(args: ImageArgs) {
  const { client, tenant, user, prompt, context } = args
  const startedAt = Date.now()
  let usageStatus: AiUsageStatus = 'error'
  let usageError: string | null = null
  let publicUrl: string | null = null

  // Два конфига: текстовый prompt-expansion и сама генерация картинки.
  // Они настраиваются как разные фичи, потому что модели и режимы разные
  // (chat-completion vs images endpoint).
  const expansionConfig = await getAiSetting('instruction.inlinePrompt.imageExpansion')
  const imageConfig = await getAiSetting('image.generate')

  try {
    // Expand the short user prompt into a rich image prompt using the
    // surrounding context. Cheap and short, so worth the extra hop.
    // Existing instruction images go in too so the model can match style
    // (composition, palette, framing) instead of producing a mismatched
    // illustration.
    const imagesInPrompt = context.images.slice(0, 6)
    const imagesNote = imagesInPrompt.length
      ? `\n\nПрикреплены ${imagesInPrompt.length} существующих иллюстраций инструкции — сохрани их визуальный стиль (композиция, цвет, ракурс).`
      : ''
    const expansionContent: any[] = [
      { type: 'input_text', text: `Контекст из инструкции:\n${context.text}${imagesNote}\n\nЗапрос пользователя на иллюстрацию:\n${prompt}` }
    ]
    for (const img of imagesInPrompt) {
      expansionContent.push({ type: 'input_image', image_url: img.url })
    }
    const promptExpansion = await client.responses.create({
      model: expansionConfig.model,
      input: [
        { role: 'system', content: expansionConfig.systemPrompt },
        { role: 'user', content: expansionContent }
      ],
      ...(expansionConfig.reasoningEffort !== 'none'
        ? { reasoning: { effort: expansionConfig.reasoningEffort } }
        : {})
    })
    const expanded = extractOutputText(promptExpansion)?.trim() || prompt
    const imagePrompt = expanded.length > 1800 ? expanded.slice(0, 1800) : expanded

    const result = await client.images.generate({
      model: imageConfig.model,
      prompt: imagePrompt,
      size: imageConfig.size,
      n: imageConfig.n
    })
    const first = result.data?.[0]
    if (!first) throw createError({ statusCode: 502, statusMessage: 'OpenAI не вернул изображение' })

    let outBuf: Buffer
    if (first.b64_json) {
      outBuf = Buffer.from(first.b64_json, 'base64')
    } else if (first.url) {
      const resp = await fetch(first.url)
      if (!resp.ok) throw createError({ statusCode: 502, statusMessage: 'Не удалось скачать результат генерации' })
      outBuf = Buffer.from(await resp.arrayBuffer())
    } else {
      throw createError({ statusCode: 502, statusMessage: 'Пустой результат от OpenAI' })
    }

    const key = `ai-inline/${tenant.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`
    publicUrl = await uploadObject(key, outBuf, 'image/png')
    usageStatus = 'success'
    return { kind: 'image' as const, url: publicUrl }
  } catch (e: any) {
    usageError = e?.statusMessage || e?.message || 'Ошибка ИИ'
    throw e
  } finally {
    await recordAiUsage({
      tenantId: tenant.id,
      userId: user.id,
      feature: 'inline-prompt-image',
      model: imageConfig.model,
      status: usageStatus,
      errorMessage: usageError,
      imageCount: usageStatus === 'success' ? 1 : 0,
      durationMs: Date.now() - startedAt,
      metadata: {
        promptChars: prompt.length,
        outputUrl: publicUrl
      }
    })
  }
}

function extractOutputText(res: any): string | null {
  if (typeof res?.output_text === 'string' && res.output_text.length) return res.output_text
  const out = res?.output
  if (Array.isArray(out)) {
    for (const item of out) {
      const content = item?.content
      if (!Array.isArray(content)) continue
      for (const c of content) {
        if (typeof c?.text === 'string' && c.text.length) return c.text
      }
    }
  }
  return null
}

// Flatten the TipTap doc into plain text with <<HERE>> kept as a marker, and
// collect the URLs of all images in the doc. Image markers in the flattened
// text reference the same index as the returned `images` array, so the model
// can correlate a `[IMAGE_N]` mention in the context with the Nth attached
// input_image. We keep ~4000 chars total around <<HERE>> to bound token cost.
function summarizeContext(doc: any, instr: { title: string; description: string | null }): DocContext {
  const fallbackText = `Заголовок: ${instr.title}${instr.description ? `\nОписание: ${instr.description}` : ''}\n<<HERE>>`
  if (!doc || typeof doc !== 'object') {
    return { text: fallbackText, images: [] }
  }
  const lines: string[] = []
  const images: ContextImage[] = []
  const walk = (node: any, depth: number) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 'text' && typeof node.text === 'string') {
      lines.push(node.text)
      return
    }
    if (node.type === 'heading') {
      const text = collectText(node)
      const level = Math.min(3, Math.max(1, Number(node.attrs?.level) || 1))
      lines.push(`${'#'.repeat(level)} ${text}`)
      return
    }
    if (node.type === 'paragraph') {
      const text = collectText(node)
      if (text) lines.push(text)
      return
    }
    if (node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') {
      for (const item of node.content ?? []) {
        const text = collectText(item)
        if (text) lines.push(`- ${text}`)
      }
      return
    }
    if (node.type === 'blockquote') {
      const text = collectText(node)
      if (text) lines.push(`> ${text}`)
      return
    }
    if (node.type === 'codeBlock') {
      lines.push('```')
      lines.push(collectText(node))
      lines.push('```')
      return
    }
    if (node.type === 'safetyBlock') {
      const sev = node.attrs?.severity || 'warning'
      lines.push(`[${sev}] ${collectText(node)}`)
      return
    }
    if (node.type === 'toggle') {
      const children = Array.isArray(node.content) ? node.content : []
      const summary = collectText(children[0])
      const body = collectText(children[1])
      if (summary || body) lines.push(`▸ ${summary}${body ? `\n   ${body}` : ''}`)
      return
    }
    if (node.type === 'image') {
      const url = typeof node.attrs?.src === 'string' ? node.attrs.src : ''
      const alt = typeof node.attrs?.alt === 'string' ? node.attrs.alt : ''
      // Skip non-public sources (blob: / data:) — they're useless to the
      // model and would only inflate token usage.
      if (/^https?:\/\//i.test(url)) {
        const index = images.length + 1
        images.push({ index, url, alt })
        lines.push(`[IMAGE_${index}${alt ? `: ${alt}` : ''}]`)
      } else if (alt) {
        lines.push(`[image: ${alt}]`)
      }
      return
    }
    if (node.type === 'table') {
      lines.push('[table]')
      return
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child, depth + 1)
    }
  }
  walk(doc, 0)
  let text = lines.join('\n').trim()
  if (!text) return { text: fallbackText, images: [] }
  // If <<HERE>> isn't in the flattened text, append it so the model still has
  // a fallback marker.
  if (!text.includes('<<HERE>>')) text += '\n<<HERE>>'
  // Trim around the marker: keep up to 2000 chars before and after.
  const idx = text.indexOf('<<HERE>>')
  const before = text.slice(Math.max(0, idx - 2000), idx)
  const after = text.slice(idx, idx + 2000)
  const trimmed = `Заголовок: ${instr.title}${instr.description ? `\nОписание: ${instr.description}` : ''}\n\n${before}${after}`
  // Filter image attachments down to the ones that still appear inside the
  // trimmed window — no point sending images we sliced out of the context.
  const visibleImages = images.filter((img) => trimmed.includes(`[IMAGE_${img.index}`))
  return { text: trimmed, images: visibleImages }
}

function collectText(node: any): string {
  if (!node || typeof node !== 'object') return ''
  if (typeof node.text === 'string') return node.text
  if (!Array.isArray(node.content)) return ''
  return node.content.map(collectText).join('')
}
