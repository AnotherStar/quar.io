// Гард для admin-only страниц (/dashboard/admin/*). Сначала прогоняет
// обычный auth-flow (как middleware/auth.ts), затем проверяет глобальный
// флаг isAdmin. Неадминов отправляем на /dashboard, чтобы не выдавать
// факт существования админ-секции.
export default defineNuxtRouteMiddleware(async () => {
  const { user, clientTenantRestored, refresh } = useAuthState()
  if (!user.value || (import.meta.client && !clientTenantRestored.value)) await refresh()
  if (!user.value) {
    return navigateTo('/auth/login')
  }
  if (!user.value.isAdmin) {
    return navigateTo('/dashboard')
  }
})
