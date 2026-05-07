<script setup lang="ts">
// FAQ accordion — follows Notion's `faq-accordion-item` token spec:
//   • each item is canvas-bg, padding {spacing.xl} (24px),
//     bottom border 1px {colors.hairline}
//   • question typography {heading-5} (18px / 600 / 1.40)
//   • plain divs (not <ul>/<li>) so the public page's .prose-mo bullets
//     don't bleed in.
interface FaqItem {
  question: string
  answer: string
}

const props = defineProps<{
  instructionId: string
  config: Record<string, any>
  viewerSessionId: string
}>()

const title = computed(() => String(props.config?.title ?? 'Часто задаваемые вопросы'))
const expandedByDefault = computed(() => Boolean(props.config?.expandedByDefault ?? false))
const items = computed<FaqItem[]>(() => {
  const raw = props.config?.items
  if (!Array.isArray(raw)) return []
  return raw
    .map((it: any) => ({ question: String(it?.question ?? '').trim(), answer: String(it?.answer ?? '').trim() }))
    .filter((it) => it.question || it.answer)
})

const openIndex = ref<Set<number>>(new Set(expandedByDefault.value ? items.value.map((_, i) => i) : []))

function toggle(i: number) {
  const next = new Set(openIndex.value)
  if (next.has(i)) next.delete(i)
  else next.add(i)
  openIndex.value = next
}
</script>

<template>
  <section v-if="items.length" class="my-section-sm" data-module="faq">
    <h3 v-if="title" class="mb-md text-h3 text-ink">{{ title }}</h3>
    <div class="overflow-hidden">
      <div
        v-for="(item, i) in items"
        :key="i"
        class="border-b border-hairline last:border-b-0"
      >
        <button
          type="button"
          class="flex w-full items-start justify-between gap-md px-0 py-md text-left transition-colors"
          :aria-expanded="openIndex.has(i)"
          @click="toggle(i)"
        >
          <span class="flex-1 text-h5 text-ink">{{ item.question }}</span>
          <Icon
            name="lucide:chevron-down"
            class="mt-1 h-5 w-5 flex-shrink-0 text-steel transition-transform duration-150"
            :class="openIndex.has(i) ? 'rotate-180' : ''"
          />
        </button>
        <div
          v-if="openIndex.has(i) && item.answer"
          class="pb-md pr-xxl text-body text-charcoal whitespace-pre-line leading-relaxed"
        >
          {{ item.answer }}
        </div>
      </div>
    </div>
  </section>
</template>
