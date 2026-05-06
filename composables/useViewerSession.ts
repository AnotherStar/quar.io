import { customAlphabet } from 'nanoid'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const newSid = customAlphabet(ALPHABET, 24)
const COOKIE = 'mo_vid'

// Stable per-viewer session id stored in a cookie. Long-lived (1 year).
// Used purely to correlate analytics events client-side.
export function useViewerSession() {
  if (import.meta.server) return ref('')
  const sid = useState('mo:viewerSession', () => {
    const existing = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`))
    if (existing) return existing.split('=')[1]
    const fresh = newSid()
    const oneYear = 60 * 60 * 24 * 365
    document.cookie = `${COOKIE}=${fresh}; Max-Age=${oneYear}; Path=/; SameSite=Lax`
    return fresh
  })
  return sid
}
