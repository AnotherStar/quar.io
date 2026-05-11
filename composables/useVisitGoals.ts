// Public-page composable for recording per-visit goals.
//
//   const { goal } = useVisitGoals()
//   goal('WARRANTY_FORM_OPENED')
//   goal('WARRANTY_SUBMITTED', { sku: 'X-123' })
//
// - No-op if cookie consent has not been accepted.
// - Pulls instructionId / versionId / sessionId from the `publicRefs` provide
//   set by the public instruction page, so consumers don't need to thread them.
// - Codes are free-form strings matching /^[A-Z][A-Z0-9_]{2,63}$/.

import { GOAL_CODE_REGEX } from '~~/shared/schemas/goals'

interface PublicRefs {
  instructionId: string
  versionId: string | null
  viewerSessionId: string
}

const CONSENT_KEY = 'quar:cookie-consent'

export function useVisitGoals() {
  const refs = inject<PublicRefs>('publicRefs', null as any)

  async function goal(code: string, meta?: Record<string, unknown>): Promise<boolean> {
    if (!import.meta.client) return false
    if (!refs?.instructionId || !refs?.viewerSessionId) return false
    if (localStorage.getItem(CONSENT_KEY) !== 'accepted') return false
    if (!GOAL_CODE_REGEX.test(code)) {
      console.warn(`[useVisitGoals] invalid goal code: ${code}`)
      return false
    }
    try {
      await $fetch('/api/public/goal', {
        method: 'POST',
        body: {
          instructionId: refs.instructionId,
          versionId: refs.versionId ?? undefined,
          sessionId: refs.viewerSessionId,
          code,
          meta
        }
      })
      return true
    } catch {
      return false
    }
  }

  return { goal }
}
