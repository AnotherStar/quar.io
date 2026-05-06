<script setup lang="ts">
// Public-page analytics collector.
// - PAGE_VIEW on mount
// - PAGE_LEAVE on beforeunload + visibilitychange (with sendBeacon)
// - BLOCK_VIEW via IntersectionObserver
// - BLOCK_DWELL when a block stays in viewport > 5s
// Uses a stable cookie-based session id so events from the same viewer correlate.

const props = defineProps<{
  instructionId: string
  versionId?: string | null
  sessionId: string
}>()

const queue: any[] = []
let scrollMax = 0
let pageStart = Date.now()
const dwellTimers = new Map<string, number>()
const seenBlocks = new Set<string>()

function commonFields() {
  return {
    instructionId: props.instructionId,
    versionId: props.versionId ?? undefined,
    sessionId: props.sessionId,
    referrer: document.referrer || undefined,
    language: navigator.language
  }
}

function track(ev: any) {
  queue.push({ ...commonFields(), ...ev })
  if (queue.length >= 10) flush()
}

async function flush(useBeacon = false) {
  if (!queue.length) return
  const events = queue.splice(0, queue.length)
  const payload = JSON.stringify({ events })
  if (useBeacon && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' })
    navigator.sendBeacon('/api/public/analytics', blob)
  } else {
    try {
      await $fetch('/api/public/analytics', { method: 'POST', body: { events } })
    } catch { /* swallow — analytics never breaks page */ }
  }
}

function onScroll() {
  const h = document.documentElement
  const pct = Math.round(((h.scrollTop + h.clientHeight) / h.scrollHeight) * 100)
  if (pct > scrollMax) scrollMax = Math.min(100, pct)
}

let observer: IntersectionObserver | null = null

function observeBlocks() {
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const id = (e.target as HTMLElement).dataset.blockId
      if (!id) continue
      if (e.isIntersecting) {
        if (!seenBlocks.has(id)) {
          seenBlocks.add(id)
          track({ type: 'BLOCK_VIEW', blockId: id })
        }
        // start dwell timer
        if (!dwellTimers.has(id)) {
          dwellTimers.set(id, window.setTimeout(() => {
            track({ type: 'BLOCK_DWELL', blockId: id, durationMs: 5000 })
            dwellTimers.delete(id)
          }, 5000))
        }
      } else {
        const t = dwellTimers.get(id)
        if (t) { clearTimeout(t); dwellTimers.delete(id) }
      }
    }
  }, { threshold: 0.5 })
  document.querySelectorAll('[data-block-id]').forEach((el) => observer!.observe(el))
}

function onVisibility() {
  if (document.visibilityState === 'hidden') {
    track({
      type: 'PAGE_LEAVE',
      durationMs: Date.now() - pageStart,
      scrollDepth: scrollMax
    })
    flush(true)
  }
}

function onBeforeUnload() {
  track({ type: 'PAGE_LEAVE', durationMs: Date.now() - pageStart, scrollDepth: scrollMax })
  flush(true)
}

onMounted(() => {
  pageStart = Date.now()
  track({ type: 'PAGE_VIEW' })
  flush()
  document.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('beforeunload', onBeforeUnload)
  // observe blocks after current frame so DOM is mounted
  requestAnimationFrame(observeBlocks)
})
onBeforeUnmount(() => {
  document.removeEventListener('scroll', onScroll)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('beforeunload', onBeforeUnload)
  observer?.disconnect()
  dwellTimers.forEach((t) => clearTimeout(t))
})
</script>

<template>
  <div hidden />
</template>
