// Универсальный обработчик CTA «Попробовать бесплатно / без регистрации».
//
// - Если у пользователя уже есть сессия (анонимный trial или полноценный
//   аккаунт) — просто ведём в /dashboard, новый tenant не создаём.
// - Иначе POST /api/auth/anonymous-start → /dashboard.
// - От двойного клика защищаемся через общий useState — если в любой кнопке
//   нажали, остальные тоже залочены.

export function useStartTrial() {
  const { user, refresh } = useAuthState()
  const { track } = useTrackGoal()
  const loading = useState('mo:startTrial:loading', () => false)
  const error = useState<string | null>('mo:startTrial:error', () => null)

  async function startTrial() {
    if (loading.value) return
    error.value = null

    // Лендинг CTA: фиксируем намерение независимо от того, дойдём ли до
    // создания нового trial или просто отправим залогиненного в дашборд.
    track('landing_cta_click')

    // Уже залогинен (в т.ч. анонимный trial) — отправляем прямо в дашборд.
    // На случай устаревшего me — освежим перед решением.
    if (!user.value) {
      try { await refresh() } catch { /* offline / 401 — поедем по обычной ветке */ }
    }
    if (user.value) {
      await navigateTo('/dashboard')
      return
    }

    loading.value = true
    try {
      await $fetch('/api/auth/anonymous-start', { method: 'POST' })
      await refresh()
      track('trial_started')
      await navigateTo('/dashboard')
    } catch (e: any) {
      error.value = e?.data?.statusMessage ?? e?.statusMessage ?? 'Не удалось создать trial-аккаунт'
    } finally {
      loading.value = false
    }
  }

  return { startTrial, loading, error }
}
