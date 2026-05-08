// Wrapper around $fetch that:
//  - on the server, forwards the incoming request's cookies (via
//    useRequestFetch) so /api/auth/me, /api/instructions/* etc. can read
//    the session and the user is authenticated during SSR;
//  - injects the current tenant id header so server endpoints
//    requireTenant() can resolve the tenant.
//
// useRequestFetch() doesn't expose .create(), so we wrap it manually on the
// server. On the client we use the same async wrapper so a dashboard request
// can wait for auth/tenant state after dev-server reloads and HMR reconnects.
export function useApi() {
  const { currentTenant, clientTenantRestored, refresh } = useAuthState()

  async function ensureTenantReady(url: any) {
    const path = typeof url === 'string' ? url : String(url)
    if (path.startsWith('/api/auth/')) return
    if (import.meta.client && !clientTenantRestored.value) await refresh()
    if (!currentTenant.value) await refresh()
  }

  if (import.meta.server) {
    const reqFetch = useRequestFetch()
    return (async <T = any>(url: any, opts: any = {}) => {
      await ensureTenantReady(url)
      const headers = Object.fromEntries(new Headers((opts.headers as HeadersInit) || {}).entries())
      const tid = currentTenant.value?.id
      if (tid) headers['x-tenant-id'] = tid
      return reqFetch<T>(url, { ...opts, headers })
    }) as typeof $fetch
  }

  return (async <T = any>(url: any, opts: any = {}) => {
    await ensureTenantReady(url)
    const headers = new Headers((opts.headers as HeadersInit) || {})
    const tid = currentTenant.value?.id
    if (tid) headers.set('x-tenant-id', tid)
    return $fetch<T>(url, { ...opts, headers })
  }) as typeof $fetch
}
