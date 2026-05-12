// Client-side consumer for /api/instructions/[id]/generate-stream.
// POSTs a multipart file, reads SSE response, calls callbacks for `meta`,
// `block`, `done`, `error` events.
import type { AiBlock } from '~~/server/utils/aiInstructionGenerator'

export interface StreamHandlers {
  onMeta?: (meta: Partial<{ title: string; slug: string; description: string; language: string }>) => void
  onBlock?: (block: AiBlock) => void
  onProgress?: (payload: any) => void
  onExtractedImage?: (payload: any) => void | Promise<void>
  onUsage?: (payload: any) => void
  onDone?: (payload: any) => void
  onError?: (msg: string) => void
}

export interface StreamOptions {
  imageLibrary?: Array<{
    index: number
    url: string
    page: number
    width: number
    height: number
    hash?: string
  }>
  userPrompt?: string
  skipExtraction?: boolean
}

export async function streamInstructionFromFile(
  instructionId: string,
  files: File | File[],
  handlers: StreamHandlers,
  signal?: AbortSignal,
  options?: StreamOptions
) {
  const headers: Record<string, string> = {}
  // Preserve x-tenant-id like useApi does
  const { currentTenant } = useAuthState()
  if (currentTenant.value?.id) headers['x-tenant-id'] = currentTenant.value.id

  const fileList = Array.isArray(files) ? files : [files]
  const promptText = options?.userPrompt?.trim() ?? ''
  if (!fileList.length && !promptText) {
    handlers.onError?.('Нужен хотя бы один файл или текст подсказки')
    return
  }
  const fd = new FormData()
  fileList.forEach((f, i) => fd.append(`file_${i}`, f))
  if (promptText) {
    fd.append('userPrompt', promptText)
  }
  if (options?.imageLibrary?.length) {
    fd.append('imageLibrary', JSON.stringify(options.imageLibrary))
  }
  if (options?.skipExtraction) {
    fd.append('skipExtraction', '1')
  }

  const res = await fetch(`/api/instructions/${instructionId}/generate-stream`, {
    method: 'POST',
    body: fd,
    headers,
    signal
  })
  if (!res.ok || !res.body) {
    handlers.onError?.(`HTTP ${res.status}`)
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE messages are separated by blank lines
    let sep
    while ((sep = buffer.indexOf('\n\n')) >= 0) {
      const raw = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      await handleEvent(raw, handlers)
    }
  }
  // Flush trailing
  if (buffer.trim()) await handleEvent(buffer, handlers)
}

async function handleEvent(raw: string, h: StreamHandlers) {
  const lines = raw.split('\n')
  let event = 'message'
  let data = ''
  for (const l of lines) {
    if (l.startsWith('event:')) event = l.slice(6).trim()
    else if (l.startsWith('data:')) data += l.slice(5).trim()
  }
  if (!data) return
  let parsed: any
  try { parsed = JSON.parse(data) } catch { return }
  if (event === 'meta') h.onMeta?.(parsed)
  else if (event === 'block') h.onBlock?.(parsed)
  else if (event === 'progress') h.onProgress?.(parsed)
  else if (event === 'extracted-image') await h.onExtractedImage?.(parsed)
  else if (event === 'usage') h.onUsage?.(parsed)
  else if (event === 'done') h.onDone?.(parsed)
  else if (event === 'error') h.onError?.(parsed.message || 'Ошибка')
}
