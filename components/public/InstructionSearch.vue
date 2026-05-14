<script setup lang="ts">
// Client-side full-text search over the rendered DOM blocks of the instruction.
// Lightweight: builds index lazily on first open, scrolls to + highlights matches.
const props = defineProps<{ rootSelector?: string }>()

const open = ref(false)
const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const results = ref<Array<{ id: string; preview: string }>>([])
let index: Array<{ id: string; text: string }> = []

function buildIndex() {
  if (index.length) return
  const root = document.querySelector(props.rootSelector ?? '#instruction-root')
  if (!root) return
  index = Array.from(root.querySelectorAll('[data-block-id]')).map((el) => ({
    id: (el as HTMLElement).dataset.blockId!,
    text: (el.textContent || '').replace(/\s+/g, ' ').trim()
  }))
}

watch(query, (q) => {
  if (!q || q.length < 2) { results.value = []; return }
  buildIndex()
  const lower = q.toLowerCase()
  results.value = index
    .filter((b) => b.text.toLowerCase().includes(lower))
    .slice(0, 30)
    .map((b) => ({ id: b.id, preview: snippet(b.text, lower) }))
})

watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  searchInput.value?.focus()
})

function snippet(text: string, term: string) {
  const i = text.toLowerCase().indexOf(term)
  if (i < 0) return text.slice(0, 100)
  const start = Math.max(0, i - 40)
  const end = Math.min(text.length, i + term.length + 80)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

function scrollTo(id: string) {
  const el = document.querySelector(`[data-block-id="${id}"]`) as HTMLElement | null
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('search-highlight')
  setTimeout(() => el.classList.remove('search-highlight'), 1600)
  open.value = false
}

function onKey(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    open.value = !open.value
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<template>
  <div>
    <button
      type="button"
      class="instruction-search-launcher"
      aria-label="Поиск по инструкции"
      title="Поиск (⌘K)"
      @click="open = true"
    >
      <Icon name="lucide:search" class="h-6 w-6" />
    </button>
    <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 px-4 pt-[12vh]" @click.self="open = false">
      <div class="w-full max-w-xl rounded-lg border border-hairline bg-canvas p-md shadow-modal">
        <input
          ref="searchInput"
          v-model="query"
          autofocus
          type="text"
          placeholder="Найти в инструкции..."
          class="w-full rounded-md border border-hairline-strong px-md py-sm text-body outline-none focus:border-primary"
        >
        <div v-if="results.length" class="mt-md max-h-[50vh] overflow-y-auto">
          <button
            v-for="r in results"
            :key="r.id"
            class="block w-full rounded-sm px-md py-sm text-left text-body-sm text-charcoal hover:bg-surface"
            @click="scrollTo(r.id)"
          >
            {{ r.preview }}
          </button>
        </div>
        <p v-else-if="query.length >= 2" class="mt-md text-body-sm text-steel">Ничего не найдено</p>
        <p v-else class="mt-md text-caption text-steel">⌘K — открыть, Esc — закрыть</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Pair with the chat launcher in <GlobalChatWidget>: same surface, same size,
 * sits immediately to its left so both corner controls read as a row. Both
 * launchers use a flat surface fill — no shadow, no border — to stay quiet
 * and not compete for the eye over the actual content. */
.instruction-search-launcher {
  position: fixed;
  right: 88px;
  bottom: 20px;
  z-index: 60;
  display: inline-grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 9999px;
  background: var(--color-surface);
  color: var(--color-steel);
  transition: background 0.15s ease, color 0.15s ease;
}

.instruction-search-launcher:hover {
  background: var(--color-hairline);
  color: var(--color-charcoal);
}

.instruction-search-launcher:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 3px;
}

@media (max-width: 639px) {
  .instruction-search-launcher {
    right: 80px;
    bottom: 16px;
  }
}
</style>

<style>
.search-highlight {
  outline: 3px solid var(--color-primary);
  outline-offset: 4px;
  border-radius: 4px;
  transition: outline 0.2s;
}
</style>
