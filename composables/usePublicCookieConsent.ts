const COOKIE_CONSENT_KEY = 'quar:cookie-consent'

export function usePublicCookieConsent() {
  const accepted = useState('quar:cookie-consent-accepted', () => false)

  if (import.meta.client && !accepted.value) {
    accepted.value = localStorage.getItem(COOKIE_CONSENT_KEY) === 'accepted'
  }

  function accept() {
    accepted.value = true
    if (import.meta.client) {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
      window.dispatchEvent(new CustomEvent('quar:cookie-consent-accepted'))
    }
  }

  return { accepted, accept }
}
