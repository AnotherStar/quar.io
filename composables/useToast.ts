// Глобальные тост-уведомления.
// Источник — общий useState, рендерит их единственный <UiToaster /> в
// layouts/dashboard.vue. Дубли не схлопываем намеренно: при массовом импорте
// инструкций один успешный тост на каждую готовую инструкцию — это ожидаемое
// поведение, не шум.

export type ToastKind = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  /** Может быть либо колбэком, либо ссылкой Nuxt — обработает <UiToaster>. */
  onClick?: () => void
  to?: string
}

export interface ToastItem {
  id: string
  kind: ToastKind
  title?: string
  message: string
  action?: ToastAction
  /** Автозакрытие в мс. 0 — не закрывать автоматически. По умолчанию 5000. */
  durationMs: number
  createdAt: number
}

export interface ToastOptions {
  title?: string
  action?: ToastAction
  /** 0 — не закрывать автоматически. */
  durationMs?: number
}

const DEFAULT_DURATION = 5000

function makeId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useToast() {
  const items = useState<ToastItem[]>('mo:toasts', () => [])

  function push(kind: ToastKind, message: string, opts: ToastOptions = {}) {
    const item: ToastItem = {
      id: makeId(),
      kind,
      title: opts.title,
      message,
      action: opts.action,
      durationMs: opts.durationMs ?? DEFAULT_DURATION,
      createdAt: Date.now()
    }
    items.value = [...items.value, item]
    return item.id
  }

  function dismiss(id: string) {
    items.value = items.value.filter((i) => i.id !== id)
  }

  function clear() {
    items.value = []
  }

  return {
    items,
    push,
    dismiss,
    clear,
    success: (message: string, opts?: ToastOptions) => push('success', message, opts),
    error: (message: string, opts?: ToastOptions) => push('error', message, opts),
    warning: (message: string, opts?: ToastOptions) => push('warning', message, opts),
    info: (message: string, opts?: ToastOptions) => push('info', message, opts)
  }
}
