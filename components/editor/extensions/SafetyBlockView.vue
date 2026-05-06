<script setup lang="ts">
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const severity = computed(() => (props.node.attrs.severity as 'info' | 'warning' | 'danger') ?? 'warning')

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

function cycle() {
  const order: Array<'info' | 'warning' | 'danger'> = ['info', 'warning', 'danger']
  const next = order[(order.indexOf(severity.value) + 1) % order.length]
  props.updateAttributes({ severity: next })
}
</script>

<template>
  <NodeViewWrapper :class="['rounded-md p-md my-3 not-prose flex gap-3', styles.bg]" data-type="safety-block">
    <button
      type="button"
      class="select-none text-2xl leading-none transition-transform hover:scale-110"
      :title="`Сменить уровень (текущий: ${styles.label})`"
      contenteditable="false"
      @click="cycle"
    >
      {{ styles.icon }}
    </button>
    <div class="flex-1">
      <p class="text-caption-bold uppercase tracking-wide opacity-70" contenteditable="false">{{ styles.label }}</p>
      <NodeViewContent class="text-body mt-1" />
    </div>
  </NodeViewWrapper>
</template>
