<script setup lang="ts">
// Auto-built table of contents for the public instruction page.
//
// Scans h1/h2/h3 inside `rootSelector` (matches what useHeadingAnchors tracks
// and what the editor lets users insert) and renders a nav list. Tracks the
// currently-visible heading via the same scroll-line heuristic as the URL-hash
// anchor tracker — keep REFERENCE_OFFSET_PX in sync with it so active item in
// the TOC and the heading the reader is "under" agree.

const props = defineProps<{ rootSelector: string }>()

type TocItem = { id: string; text: string; level: number }

const REFERENCE_OFFSET_PX = 96

const items = ref<TocItem[]>([])
const activeId = ref('')

let cachedHeadings: HTMLHeadingElement[] = []
let scheduled = false
let attempts = 0

function refresh() {
  if (!import.meta.client) return
  const root = document.querySelector(props.rootSelector)
  if (!root) return
  cachedHeadings = Array.from(root.querySelectorAll<HTMLHeadingElement>('h1, h2, h3'))
    .filter((h) => !!h.id && !!(h.textContent || '').trim())
  items.value = cachedHeadings.map((h) => ({
    id: h.id,
    text: (h.textContent || '').trim(),
    level: Number(h.tagName.charAt(1))
  }))
}

function updateActive() {
  if (!cachedHeadings.length) return
  let active: HTMLHeadingElement | null = null
  for (const h of cachedHeadings) {
    if (h.getBoundingClientRect().top <= REFERENCE_OFFSET_PX) active = h
    else break
  }
  activeId.value = active ? active.id : ''
}

function onScroll() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    updateActive()
  })
}

// Headings come from <InstructionContent>, which hydrates inside ClientOnly.
// Poll briefly until ids are assigned by useHeadingAnchors, same budget.
function tryUntilReady() {
  refresh()
  if (items.value.length) {
    updateActive()
    return
  }
  if (attempts++ < 30) setTimeout(tryUntilReady, 100)
}

onMounted(() => {
  nextTick(tryUntilReady)
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <!-- data-toc lets the page-level `.prose-mo` rules opt out of styling
       lists / links inside the TOC. Without it the inline mobile TOC inherits
       prose bullet markers and link colors meant for the article body. -->
  <nav v-if="items.length" data-toc aria-label="Оглавление">
    <p class="text-caption uppercase tracking-wide text-steel mb-2">Содержание</p>
    <ul class="border-l border-hairline">
      <li
        v-for="item in items"
        :key="item.id"
        :class="[
          item.level === 1 ? 'pl-3' : item.level === 2 ? 'pl-6' : 'pl-9'
        ]"
        class="-ml-px border-l-2"
        :style="{ borderColor: activeId === item.id ? 'var(--color-primary)' : 'transparent' }"
      >
        <a
          :href="`#${item.id}`"
          :class="[
            'block py-1.5 text-body-sm leading-snug transition-colors hover:text-ink',
            activeId === item.id ? 'text-ink' : 'text-steel'
          ]"
        >
          {{ item.text }}
        </a>
      </li>
    </ul>
  </nav>
</template>
