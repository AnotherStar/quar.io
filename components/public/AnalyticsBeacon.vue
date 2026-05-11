<script setup lang="ts">
// Public-page analytics collector.
// - PAGE_VIEW on mount (+ first-flush visit meta: utm, timezone, screen, viewport)
// - PAGE_LEAVE on beforeunload + visibilitychange (with sendBeacon)
// - BLOCK_VIEW via IntersectionObserver
// - BLOCK_DWELL with honest duration: timer starts at BLOCK_VIEW and emits the
//   real time-in-viewport when the block leaves (or page hides).
// Uses the stable mo_vid session id so events from the same viewer correlate.

const props = defineProps<{
  instructionId: string
  versionId?: string | null
  sessionId: string
}>()

interface BeaconEvent {
  type: 'PAGE_VIEW' | 'PAGE_LEAVE' | 'BLOCK_VIEW' | 'BLOCK_DWELL'
  blockId?: string
  durationMs?: number
  scrollDepth?: number
}

interface BeaconMeta {
  timezone?: string
  screenWidth?: number
  screenHeight?: number
  viewportWidth?: number
  viewportHeight?: number
  devicePixelRatio?: number
  url?: string
  isBotClient?: boolean
}

const queue: any[] = []
let scrollMax = 0
let pageStart = Date.now()
let metaSent = false
const dwellStart = new Map<string, number>()
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

function buildMeta(): BeaconMeta {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth: window.screen?.width,
    screenHeight: window.screen?.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    url: window.location.href,
    isBotClient: !!(navigator as any).webdriver
  }
}

function track(ev: BeaconEvent) {
  queue.push({ ...commonFields(), ...ev })
  if (queue.length >= 10) flush()
}

async function flush(useBeacon = false) {
  if (!queue.length) return
  const events = queue.splice(0, queue.length)
  const meta = metaSent ? undefined : buildMeta()
  metaSent = true
  const payload = JSON.stringify({ events, meta })
  if (useBeacon && navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' })
    navigator.sendBeacon('/api/public/analytics', blob)
  } else {
    try {
      await $fetch('/api/public/analytics', { method: 'POST', body: { events, meta } })
    } catch { /* swallow — analytics never breaks page */ }
  }
}

function onScroll() {
  const h = document.documentElement
  const pct = Math.round(((h.scrollTop + h.clientHeight) / h.scrollHeight) * 100)
  if (pct > scrollMax) scrollMax = Math.min(100, pct)
}

let observer: IntersectionObserver | null = null

function emitDwell(id: string) {
  const startedAt = dwellStart.get(id)
  if (!startedAt) return
  dwellStart.delete(id)
  const durationMs = Date.now() - startedAt
  if (durationMs < 300) return // ignore flicker
  track({ type: 'BLOCK_DWELL', blockId: id, durationMs })
}

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
        if (!dwellStart.has(id)) dwellStart.set(id, Date.now())
      } else {
        emitDwell(id)
      }
    }
  }, { threshold: 0.5 })
  document.querySelectorAll('[data-block-id]').forEach((el) => observer!.observe(el))
}

function flushAllDwells() {
  for (const id of Array.from(dwellStart.keys())) emitDwell(id)
}

function onVisibility() {
  if (document.visibilityState === 'hidden') {
    flushAllDwells()
    track({
      type: 'PAGE_LEAVE',
      durationMs: Date.now() - pageStart,
      scrollDepth: scrollMax
    })
    flush(true)
  }
}

function onBeforeUnload() {
  flushAllDwells()
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
  requestAnimationFrame(observeBlocks)
})
onBeforeUnmount(() => {
  document.removeEventListener('scroll', onScroll)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('beforeunload', onBeforeUnload)
  observer?.disconnect()
  dwellStart.clear()
})
</script>

<template>
  <div hidden />
</template>
