/**
 * v-keep-in-viewport — директива удерживает абсолютно-позиционированный
 * элемент (попап, дропдаун, тултип) в пределах viewport'а. После каждой
 * перерисовки замеряет getBoundingClientRect и, если элемент торчит за
 * границу окна, выставляет CSS-переменные `--keep-shift-x` / `--keep-shift-y`,
 * которые потом подхватываются классом-владельцем через
 * `transform: translate3d(var(--keep-shift-x, 0), var(--keep-shift-y, 0), 0)`.
 *
 * Класс `.popover-menu` (assets/css/global.css) уже использует эти переменные.
 * Для других носителей директивы стоит либо переопределить `transform`, либо
 * накинуть утилитарный класс `.keep-in-viewport-shift` (см. global.css).
 *
 * Использование:
 *   <div v-keep-in-viewport class="popover-menu absolute left-0 top-full ...">
 *   <div v-keep-in-viewport="{ margin: 12 }" class="popover-menu ...">
 *
 * Сдвиг по умолчанию делается по обеим осям с отступом 8px от края окна.
 *
 * Почему директива, а не floating-ui: попапы у нас простые (не нужны
 * стрелки, авто-flip и т.д.), а floating-ui добавил бы ~10kb. Здесь хватает
 * 50 строк ResizeObserver + rAF.
 */
import type { Directive, DirectiveBinding } from 'vue'

interface KeepInViewportOptions {
  /** Минимальный отступ от края окна в px. По умолчанию 8. */
  margin?: number
  /** По какой оси корректировать: 'x', 'y' или обе. По умолчанию 'both'. */
  axis?: 'x' | 'y' | 'both'
}

interface State {
  options: Required<KeepInViewportOptions>
  onResize: () => void
  ro?: ResizeObserver
  rafId: number | null
}

const STATE = new WeakMap<HTMLElement, State>()

function normalizeOptions(value: unknown): Required<KeepInViewportOptions> {
  const opts = (value && typeof value === 'object' ? value : {}) as KeepInViewportOptions
  return {
    margin: typeof opts.margin === 'number' ? opts.margin : 8,
    axis: opts.axis ?? 'both'
  }
}

function adjust(el: HTMLElement) {
  const state = STATE.get(el)
  if (!state) return

  // Сбрасываем сдвиг перед замером, иначе getBoundingClientRect возвращает
  // уже сдвинутую позицию и коррекция накапливается.
  el.style.setProperty('--keep-shift-x', '0px')
  el.style.setProperty('--keep-shift-y', '0px')

  // Чтобы успел применить сброс, замеряем в следующий rAF.
  if (state.rafId !== null) cancelAnimationFrame(state.rafId)
  state.rafId = requestAnimationFrame(() => {
    state.rafId = null
    const { margin, axis } = state.options
    const rect = el.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    const vh = document.documentElement.clientHeight

    let dx = 0
    let dy = 0
    if (axis !== 'y') {
      if (rect.right > vw - margin) dx = vw - margin - rect.right
      else if (rect.left < margin) dx = margin - rect.left
    }
    if (axis !== 'x') {
      if (rect.bottom > vh - margin) dy = vh - margin - rect.bottom
      else if (rect.top < margin) dy = margin - rect.top
    }

    el.style.setProperty('--keep-shift-x', `${dx}px`)
    el.style.setProperty('--keep-shift-y', `${dy}px`)
  })
}

const keepInViewport: Directive<HTMLElement, KeepInViewportOptions | undefined> = {
  mounted(el, binding: DirectiveBinding<KeepInViewportOptions | undefined>) {
    const options = normalizeOptions(binding.value)
    const onResize = () => adjust(el)
    const state: State = { options, onResize, rafId: null }

    if (typeof ResizeObserver !== 'undefined') {
      state.ro = new ResizeObserver(onResize)
      state.ro.observe(el)
    }
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('scroll', onResize, { passive: true, capture: true })

    STATE.set(el, state)
    adjust(el)
  },

  updated(el, binding) {
    const state = STATE.get(el)
    if (!state) return
    state.options = normalizeOptions(binding.value)
    adjust(el)
  },

  beforeUnmount(el) {
    const state = STATE.get(el)
    if (!state) return
    if (state.rafId !== null) cancelAnimationFrame(state.rafId)
    state.ro?.disconnect()
    window.removeEventListener('resize', state.onResize)
    window.removeEventListener('scroll', state.onResize, { capture: true } as EventListenerOptions)
    STATE.delete(el)
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('keep-in-viewport', keepInViewport)
})
