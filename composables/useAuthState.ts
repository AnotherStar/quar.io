interface AuthMembership {
  role: 'OWNER' | 'EDITOR' | 'VIEWER'
  tenant: { id: string; slug: string; name: string; plan: string }
}
interface AuthMe {
  user: { id: string; email: string; name: string | null; avatarUrl: string | null } | null
  memberships: AuthMembership[]
}

const CURRENT_TENANT_KEY = 'mo:currentTenantId'

export function useAuthState() {
  const me = useState<AuthMe>('mo:me', () => ({ user: null, memberships: [] }))
  const currentTenantId = useState<string | null>('mo:currentTenantId', () => null)

  const user = computed(() => me.value.user)
  const memberships = computed(() => me.value.memberships)
  const currentTenant = computed(
    () => memberships.value.find((m) => m.tenant.id === currentTenantId.value)?.tenant ?? memberships.value[0]?.tenant ?? null
  )
  const currentRole = computed(
    () => memberships.value.find((m) => m.tenant.id === currentTenant.value?.id)?.role ?? null
  )

  async function refresh() {
    // On the server, $fetch doesn't forward incoming request headers.
    // useRequestFetch() returns a $fetch that does — needed so the session
    // cookie reaches /api/auth/me during SSR (otherwise user is always null
    // on the server, causing hydration mismatch with the client).
    const f = import.meta.server ? useRequestFetch() : $fetch
    const data = await f<AuthMe>('/api/auth/me')
    me.value = data
    if (import.meta.client) {
      const stored = localStorage.getItem(CURRENT_TENANT_KEY)
      if (stored && data.memberships.find((m) => m.tenant.id === stored)) {
        currentTenantId.value = stored
      } else {
        currentTenantId.value = data.memberships[0]?.tenant.id ?? null
      }
    } else {
      currentTenantId.value = data.memberships[0]?.tenant.id ?? null
    }
  }

  function setTenant(id: string) {
    currentTenantId.value = id
    if (import.meta.client) localStorage.setItem(CURRENT_TENANT_KEY, id)
  }

  return { me, user, memberships, currentTenant, currentRole, refresh, setTenant }
}
