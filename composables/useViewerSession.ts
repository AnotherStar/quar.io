import { customAlphabet } from 'nanoid'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const newSid = customAlphabet(ALPHABET, 24)
const COOKIE = 'mo_vid'
const CONSENT_KEY = 'quar:cookie-consent'

// Stable per-viewer session id stored in a cookie. Long-lived (1 year).
// Used purely to correlate analytics events client-side.
export function useViewerSession() {
  if (import.meta.server) return ref('')
  const sid = useState('mo:viewerSession', () => {
    const existing = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`))
    if (existing) return existing.split('=')[1]
    const fresh = newSid()
    if (localStorage.getItem(CONSENT_KEY) !== 'accepted') return fresh
    writeViewerCookie(fresh)
    return fresh
  })

  if (import.meta.client) {
    window.addEventListener('quar:cookie-consent-accepted', () => {
      const existing = document.cookie.split('; ').find((c) => c.startsWith(`${COOKIE}=`))
      if (!existing && sid.value) writeViewerCookie(sid.value)
    }, { once: true })
  }

  return sid
}

function writeViewerCookie(value: string) {
  const oneYear = 60 * 60 * 24 * 365
  document.cookie = `${COOKIE}=${value}; Max-Age=${oneYear}; Path=/; SameSite=Lax`
}
