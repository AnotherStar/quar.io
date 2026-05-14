// Обёртка над window.ym(...,'reachGoal',...) для Яндекс.Метрики.
//
//   const { track } = useTrackGoal()
//   track('signup_completed')
//   track('editor_ai_used', { mode: 'text' })
//
// - SSR-safe: на сервере ничего не делает.
// - Тихо игнорирует случаи, когда ym ещё не успел загрузиться или
//   заблокирован адблокером — метрика никогда не должна ломать UX.
// - Тип YmGoal не даёт случайно выстрелить произвольный код: всё, что
//   шлём, перечислено в shared/constants/yandexMetrika.ts.

import { YM_COUNTER_ID, type YmGoal } from '~~/shared/constants/yandexMetrika'

declare global {
  interface Window {
    ym?: (counterId: number, action: string, ...args: unknown[]) => void
  }
}

export function useTrackGoal() {
  function track(goal: YmGoal, params?: Record<string, unknown>) {
    if (!import.meta.client) return
    const ym = window.ym
    if (typeof ym !== 'function') return
    try {
      if (params) ym(YM_COUNTER_ID, 'reachGoal', goal, params)
      else ym(YM_COUNTER_ID, 'reachGoal', goal)
    } catch {
      // ignore
    }
  }
  return { track }
}
