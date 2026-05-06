// Wrapper around $fetch that injects the current tenant id header automatically.
// Server endpoints that touch tenant data read x-tenant-id via requireTenant().
export function useApi() {
  const { currentTenant } = useAuthState()
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
