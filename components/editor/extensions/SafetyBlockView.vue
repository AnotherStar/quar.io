<script setup lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const severity = computed(() => (props.node.attrs.severity as 'info' | 'warning' | 'danger') ?? 'warning')
const customLabel = computed(() => (props.node.attrs.label as string | null) ?? null)

const styles = computed(() => {
  switch (severity.value) {
    case 'info':
      return { bg: 'bg-tint-sky', icon: 'ℹ️', label: 'Информация' }
    case 'danger':
      return { bg: 'bg-[#fde0e0] text-[#8a1212]', icon: '⛔', label: 'Опасно' }
    default:
      return { bg: 'bg-tint-peach text-charcoal', icon: '⚠️', label: 'Внимание' }
  }
})

const displayLabel = computed(() => customLabel.value ?? styles.value.label)

function cycle() {
  const order: Array<'info' | 'warning' | 'danger'> = ['info', 'warning', 'danger']
  const next = order[(order.indexOf(severity.value) + 1) % order.length]
  props.updateAttributes({ severity: next })
}

function onLabelInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.trim()
  // Empty or matching default → reset to null so a later severity change
  // picks up the new default label automatically.
  props.updateAttributes({ label: raw && raw !== styles.value.label ? raw : null })
}

function onLabelKey(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    ;(e.target as HTMLInputElement).blur()
  }
}
</script>

<template>
  <!-- Layout (CSS grid template-areas):
       Mobile (default):     icon + title in a row, body wraps below full-width.
       md+ (≥768px):         icon spans both rows on the left, title above body.
       Why grid (not flex):  with flex we'd either need to duplicate the icon
                             or wrap it in a sub-row that breaks the desktop
                             "icon next to body" arrangement. Grid areas give
                             us both layouts from a single source. -->
  <NodeViewWrapper
    :class="['mo-safety rounded-md p-md my-3 not-prose', styles.bg]"
    data-type="safety-block"
  >
    <button
      type="button"
      class="mo-safety__icon select-none text-2xl leading-none transition-transform hover:scale-110"
      :title="`Сменить уровень (текущий: ${styles.label})`"
      contenteditable="false"
      @click="cycle"
    >
      {{ styles.icon }}
    </button>
    <input
      type="text"
      :value="displayLabel"
      :placeholder="styles.label"
      :readonly="!props.editor.isEditable"
      :title="customLabel ? 'Свой заголовок. Очистите поле, чтобы вернуть стандартный.' : 'Кликните, чтобы задать свой заголовок'"
      spellcheck="false"
      contenteditable="false"
      class="mo-safety__title mo-safety-label block w-full bg-transparent text-caption-bold uppercase tracking-wide opacity-70 outline-none border border-transparent rounded-sm px-1 -mx-1 cursor-text hover:bg-black/5 focus:opacity-100 focus:bg-black/5"
      @input="onLabelInput"
      @keydown="onLabelKey"
      @mousedown.stop
      @click.stop
    />
    <NodeViewContent class="mo-safety__body text-body" />
  </NodeViewWrapper>
</template>

<style scoped>
.mo-safety {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-areas:
    'icon title'
    'body  body';
  column-gap: 12px;
  row-gap: 6px;
  align-items: start;
}
.mo-safety__icon { grid-area: icon; align-self: start; }
.mo-safety__title { grid-area: title; align-self: center; }
.mo-safety__body { grid-area: body; }

/* Tailwind md = 768px. Switch to "icon left, two-row content right" so the
 * icon stays a visual anchor instead of leaning on a tall body of text. */
@media (min-width: 768px) {
  .mo-safety {
    grid-template-areas:
      'icon title'
      'icon body';
    row-gap: 4px;
  }
  .mo-safety__body { margin-top: 4px; }
}

.mo-safety-label::placeholder {
  color: currentColor;
  opacity: 0.5;
}
</style>
