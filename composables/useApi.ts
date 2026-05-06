// Wrapper around $fetch that:
//  - on the server, forwards the incoming request's cookies (via
//    useRequestFetch) so /api/auth/me, /api/instructions/* etc. can read
//    the session and the user is authenticated during SSR;
//  - injects the current tenant id header so server endpoints
//    requireTenant() can resolve the tenant.
//
// useRequestFetch() doesn't expose .create(), so we wrap it manually on the
// server. On the client we keep the lighter $fetch.create() form.
export function useApi() {
  const { currentTenant } = useAuthState()

  if (import.meta.server) {
    const reqFetch = useRequestFetch()
    return (<T = any>(url: any, opts: any = {}) => {
      const headers = new Headers((opts.headers as HeadersInit) || {})
      const tid = currentTenant.value?.id
      if (tid) headers.set('x-tenant-id', tid)
      return reqFetch<T>(url, { ...opts, headers })
    }) as typeof $fetch
  }

  return $fetch.create({
    onRequest({ options }) {
      const tid = currentTenant.value?.id
      if (tid) {
        options.headers = new Headers(options.headers as HeadersInit)
        options.headers.set('x-tenant-id', tid)
      }
    }
  })
}
