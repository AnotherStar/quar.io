// Client-side consumer for /api/instructions/[id]/generate-stream.
// POSTs a multipart file, reads SSE response, calls callbacks for `meta`,
// `block`, `done`, `error` events.
import type { AiBlock } from '~~/server/utils/aiInstructionGenerator'

export interface StreamHandlers {
  onMeta?: (meta: Partial<{ title: string; slug: string; description: string; language: string }>) => void
  onBlock?: (block: AiBlock) => void
  onDone?: () => void
  onError?: (msg: string) => void
}

export async function streamInstructionFromFile(
  instructionId: string,
  file: File,
  handlers: StreamHandlers,
  signal?: AbortSignal
) {
  const headers: Record<string, string> = {}
  // Preserve x-tenant-id like useApi does
  const { currentTenant } = useAuthState()
  if (currentTenant.value?.id) headers['x-tenant-id'] = currentTenant.value.id

  const fd = new FormData()
  fd.append('file', file)

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
      handleEvent(raw, handlers)
    }
  }
  // Flush trailing
  if (buffer.trim()) handleEvent(buffer, handlers)
}

function handleEvent(raw: string, h: StreamHandlers) {
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
  else if (event === 'done') h.onDone?.()
  else if (event === 'error') h.onError?.(parsed.message || 'Ошибка')
}
