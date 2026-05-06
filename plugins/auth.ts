// Hydrate auth state on app boot (client + SSR via universal fetch).
export default defineNuxtPlugin(async () => {
  const { refresh } = useAuthState()
  await refresh()
})
