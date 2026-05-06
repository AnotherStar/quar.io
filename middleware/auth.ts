export default defineNuxtRouteMiddleware(async () => {
  const { user, refresh } = useAuthState()
  if (!user.value) await refresh()
  if (!user.value) {
    return navigateTo('/auth/login')
  }
})
