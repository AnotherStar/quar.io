// Heading-anchor tracker for the public instruction view.
//
// Walks the headings (h1/h2/h3) inside the given root selector, assigns each
// an `id` slugified from its text (with collision suffixes), and keeps
// `location.hash` in sync with the heading the reader is currently under.
// On arrival via /path#anchor, scrolls to the matching heading after the
// content hydrates.
//
// Strategy: scroll-driven (not IntersectionObserver). On every scroll tick
// (rAF-throttled) we find the LAST heading whose top has crossed the
// reference line near the top of the viewport. That one is "current".
// If no heading has crossed yet — i.e. the reader is still above the first
// heading — we clear the hash. IntersectionObserver doesn't fit because
// when the reader scrolls above the first heading, that heading exits the
// viewport but we get no signal "and now nothing is active" — leaving a
// stale `#first-heading` in the URL. Scroll-based picks up that case
// naturally because the heading's `top` becomes positive (below the line).

const REFERENCE_OFFSET_PX = 96 // distance from top where "current" flips

export function useHeadingAnchors(rootSelector: string) {
  if (!import.meta.client) return

  let lastHash = ''
  let scheduled = false
  let cachedHeadings: HTMLHeadingElement[] = []

  // Cyrillic-aware slug. Server has the same logic (server/utils/slug.ts) but
  // we keep this duplicated rather than importing — it's tiny and avoids
  // dragging server utils into the client bundle.
  function slug(text: string): string {
    const s = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
    return s || 'h'
  }

  function collectHeadings(): HTMLHeadingElement[] {
    const root = document.querySelector(rootSelector)
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLHeadingElement>('h1, h2, h3'))
  }

  function assignIds(headings: HTMLHeadingElement[]) {
    const used = new Set<string>()
    for (const h of headings) {
      if (h.id) {
        used.add(h.id)
        continue
      }
      const base = slug(h.textContent || '')
      let id = base
      let n = 2
      while (used.has(id)) id = `${base}-${n++}`
      used.add(id)
      h.id = id
    }
  }

  function writeHash(id: string) {
    const next = `#${id}`
    if (next === lastHash) return
    lastHash = next
    // Keep the rest of the URL intact; replaceState avoids history entries
    // and never fires hashchange — the page won't scroll-jump under us.
    history.replaceState(null, '', `${location.pathname}${location.search}${next}`)
  }

  function clearHash() {
    if (lastHash === '') return
    lastHash = ''
    // Drop just the fragment; pathname + query stay.
    history.replaceState(null, '', `${location.pathname}${location.search}`)
  }

  function updateActive() {
    if (!cachedHeadings.length) return
    let active: HTMLHeadingElement | null = null
    for (const h of cachedHeadings) {
      // Headings are in document order — once we find one BELOW the line,
      // all subsequent are too, so we can break early.
      if (h.getBoundingClientRect().top <= REFERENCE_OFFSET_PX) active = h
      else break
    }
    if (active) writeHash(active.id)
    else clearHash()
  }

  function onScroll() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      updateActive()
    })
  }

  function setup(): boolean {
    cachedHeadings = collectHeadings()
    if (!cachedHeadings.length) return false

    assignIds(cachedHeadings)

    // Initial-hash handling. Browsers try to scroll to a matching id on load,
    // but our content hydrates AFTER navigation so the id wasn't there yet.
    // Re-scroll once it is, then mark `lastHash` so updateActive() doesn't
    // clear the URL on the very first tick if the user happens to land
    // slightly above the heading.
    const initial = decodeURIComponent(location.hash.slice(1))
    if (initial) {
      const target = cachedHeadings.find((h) => h.id === initial)
      if (target) {
        requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: 'auto' }))
        lastHash = `#${initial}`
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    // First-pass run so the URL is correct even before any user scroll.
    updateActive()
    return true
  }

  let attempts = 0
  function tryUntilReady() {
    if (setup()) return
    if (attempts++ < 30) setTimeout(tryUntilReady, 100) // up to ~3s budget
  }

  onMounted(() => nextTick(tryUntilReady))
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
  })
}
