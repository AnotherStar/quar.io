<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    tone?: 'dot' | 'pill' | 'plain'
    onDark?: boolean
  }>(),
  { tone: 'plain', onDark: false }
)
</script>

<template>
  <p
    v-if="tone === 'dot'"
    :class="[
      'inline-flex items-center gap-md text-h5 font-semibold',
      onDark ? 'text-white/55' : 'text-steel'
    ]"
  >
    <span class="h-sm w-sm rounded-full bg-primary" />
    <span>{{ label }}</span>
  </p>
  <p
    v-else-if="tone === 'pill'"
    :class="[
      'inline-flex rounded-sm px-sm py-xxs text-body-sm-md uppercase',
      onDark ? 'bg-white text-primary' : 'bg-primary/10 text-primary'
    ]"
  >
    {{ label }}
  </p>
  <p
    v-else
    :class="[
      'text-caption-bold uppercase tracking-wide',
      onDark ? 'text-white/50' : 'text-steel'
    ]"
  >
    {{ label }}
  </p>
</template>
