// Глобальный стор счётчиков для сайдбар-бейджей inbox-модулей (feedback,
// chat-consultant, warranty-registration). Поллит /api/modules/badges раз в
// 30 секунд из layout-а; страницы модулей зовут markSeen(code), чтобы
// оптимистично обнулить свой счётчик и сбросить lastSeenAt на сервере.
import type { BadgeModuleCode } from '~~/shared/constants/moduleBadges'

type BadgeCounts = Record<string, number>

export function useModuleBadges() {
  const api = useApi()
  const { user, currentTenant } = useAuthState()
  const counts = useState<BadgeCounts>('mo:moduleBadges:counts', () => ({}))
  const total = useState<number>('mo:moduleBadges:total', () => 0)
  const pollState = useState<{ timer: ReturnType<typeof setInterval> | null; stopped: boolean }>(
    'mo:moduleBadges:poll',
    () => ({ timer: null, stopped: true })
  )

  async function refresh() {
    if (import.meta.server) return
    if (!user.value || !currentTenant.value || pollState.value.stopped) return
    try {
      const res = await api<{ counts: BadgeCounts; total: number }>('/api/modules/badges')
      counts.value = res.counts
      total.value = res.total
    } catch {
      // Тихо игнорируем: бейджи best-effort, следующий тик попробует снова.
      // 401 после логаута тоже сюда — не шумим в консоль.
    }
  }

  function startPolling(intervalMs = 30_000) {
    if (import.meta.server) return
    if (!user.value) return
    pollState.value.stopped = false
    if (pollState.value.timer) return
    refresh()
    pollState.value.timer = setInterval(refresh, intervalMs)
  }

  function stopPolling() {
    pollState.value.stopped = true
    if (pollState.value.timer) {
      clearInterval(pollState.value.timer)
      pollState.value.timer = null
    }
    counts.value = {}
    total.value = 0
  }

  async function markSeen(code: BadgeModuleCode) {
    if (!user.value || !currentTenant.value) return
    // Оптимистично гасим счётчик — пользователь уже на странице модуля,
    // ждать round-trip не нужно. Если запрос упадёт, refresh подтянет
    // актуальное значение.
    const prev = counts.value[code] ?? 0
    if (prev > 0) {
      counts.value = { ...counts.value, [code]: 0 }
      total.value = Math.max(0, total.value - prev)
    }
    try {
      await api('/api/modules/badges/seen', { method: 'POST', body: { code } })
    } catch {
      refresh()
    }
  }

  return { counts, total, refresh, startPolling, stopPolling, markSeen }
}
