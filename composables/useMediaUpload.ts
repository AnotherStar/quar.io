// Unified file upload — tries presigned-direct flow (S3) first, falls back
// to legacy server-proxy upload (local driver / older endpoints).
//
// Returns the public URL of the uploaded file.
export interface UploadProgress { loaded: number; total: number }
export interface UploadOptions { signal?: AbortSignal }

export async function uploadFile(
  file: File,
  onProgress?: (p: UploadProgress) => void,
  options: UploadOptions = {}
): Promise<{ url: string; mimeType: string; assetId?: string }> {
  const api = useApi()
  const { signal } = options

  if (signal?.aborted) throw createAbortError()

  const sign = await api<
    | { fallback: true }
    | {
        fallback: false
        uploadUrl: string
        publicUrl: string
        key: string
        headers: Record<string, string>
        sizeBytes: number
        contentType: string
      }
  >('/api/media/sign', {
    method: 'POST',
    body: { filename: file.name, contentType: file.type || 'application/octet-stream', sizeBytes: file.size },
    signal
  })

  if (sign.fallback) {
    // legacy server-proxied upload (used by local storage driver)
    const fd = new FormData()
    fd.append('file', file)
    const { asset } = await api<{ asset: { id: string; url: string; mimeType: string } }>(
      '/api/media/upload',
      { method: 'POST', body: fd, signal }
    )
    return { url: asset.url, mimeType: asset.mimeType, assetId: asset.id }
  }

  // direct browser → S3 PUT, with progress
  await new Promise<void>((res, rej) => {
    const xhr = new XMLHttpRequest()
    let settled = false
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort)
    }
    const reject = (error: unknown) => {
      if (settled) return
      settled = true
      cleanup()
      rej(error)
    }
    const resolve = () => {
      if (settled) return
      settled = true
      cleanup()
      res()
    }
    const onAbort = () => {
      xhr.abort()
      reject(createAbortError())
    }

    if (signal?.aborted) {
      reject(createAbortError())
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    xhr.open('PUT', sign.uploadUrl)
    for (const [k, v] of Object.entries(sign.headers)) xhr.setRequestHeader(k, v)
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress({ loaded: e.loaded, total: e.total })
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 PUT ${xhr.status}: ${xhr.responseText.slice(0, 200)}`)))
    xhr.onerror = () => reject(new Error('S3 PUT network error (VPN/firewall?)'))
    xhr.onabort = () => reject(createAbortError())
    xhr.send(file)
  })

  const { asset } = await api<{ asset: { id: string; url: string; mimeType: string } }>(
    '/api/media/confirm',
    {
      method: 'POST',
      body: { key: sign.key, url: sign.publicUrl, mimeType: sign.contentType, sizeBytes: file.size },
      signal
    }
  )
  return { url: asset.url, mimeType: asset.mimeType, assetId: asset.id }
}

function createAbortError() {
  if (typeof DOMException !== 'undefined') return new DOMException('Upload aborted', 'AbortError')
  const error = new Error('Upload aborted')
  error.name = 'AbortError'
  return error
}
