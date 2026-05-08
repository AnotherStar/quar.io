interface AuthMembership {
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  tenant: { id: string; slug: string; name: string; plan: string; brandingLogoUrl: string | null }
}
interface AuthMe {
  user: { id: string; email: string; name: string | null; avatarUrl: string | null } | null
  memberships: AuthMembership[]
}

const CURRENT_TENANT_KEY = 'mo:currentTenantId'
const CURRENT_TENANT_COOKIE = 'mo_currentTenantId'

export function useAuthState() {
  const currentTenantCookie = useCookie<string | null>(CURRENT_TENANT_COOKIE, {
    sameSite: 'lax',
    path: '/'
  })
  const me = useState<AuthMe>('mo:me', () => ({ user: null, memberships: [] }))
  const currentTenantId = useState<string | null>('mo:currentTenantId', () => currentTenantCookie.value ?? null)
  const clientTenantRestored = useState('mo:clientTenantRestored', () => false)

  if (import.meta.client && !clientTenantRestored.value) {
    const stored = localStorage.getItem(CURRENT_TENANT_KEY) || currentTenantCookie.value
    if (stored && currentTenantId.value !== stored) currentTenantId.value = stored
  }

  const user = computed(() => me.value.user)
  const memberships = computed(() => me.value.memberships)
  const currentTenant = computed(
    () => memberships.value.find((m) => m.tenant.id === currentTenantId.value)?.tenant ?? memberships.value[0]?.tenant ?? null
  )
  const currentRole = computed(
    () => memberships.value.find((m) => m.tenant.id === currentTenant.value?.id)?.role ?? null
  )

  function pickTenantId(memberships: AuthMembership[]) {
    const stored = import.meta.client
      ? localStorage.getItem(CURRENT_TENANT_KEY) || currentTenantCookie.value
      : currentTenantCookie.value
    const storedMembership = stored ? memberships.find((m) => m.tenant.id === stored) : null
    return storedMembership?.tenant.id ?? memberships[0]?.tenant.id ?? null
  }

  function rememberTenantId(id: string | null) {
    currentTenantId.value = id
    currentTenantCookie.value = id
    if (import.meta.client) {
      if (id) localStorage.setItem(CURRENT_TENANT_KEY, id)
      else localStorage.removeItem(CURRENT_TENANT_KEY)
    }
  }

  async function refresh() {
    // On the server, $fetch doesn't forward incoming request headers.
    // useRequestFetch() returns a $fetch that does — needed so the session
    // cookie reaches /api/auth/me during SSR (otherwise user is always null
    // on the server, causing hydration mismatch with the client).
    const data = (import.meta.server
      ? await (useRequestFetch() as any)('/api/auth/me')
      : await ($fetch as any)('/api/auth/me')) as AuthMe
    me.value = data
    rememberTenantId(pickTenantId(data.memberships))
    if (import.meta.client) {
      clientTenantRestored.value = true
    }
  }

  function setTenant(id: string) {
    rememberTenantId(id)
  }

  return { me, user, memberships, currentTenant, currentRole, clientTenantRestored, refresh, setTenant }
}
