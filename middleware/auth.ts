export default defineNuxtRouteMiddleware(async () => {
  const { user, clientTenantRestored, refresh } = useAuthState()
  if (!user.value || (import.meta.client && !clientTenantRestored.value)) await refresh()
  if (!user.value) {
    return navigateTo('/auth/login')
  }
})
