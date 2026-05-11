<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    size?: 'sm' | 'md' | 'lg'
    closeOnBackdrop?: boolean
    closeOnEsc?: boolean
  }>(),
  {
    size: 'md',
    closeOnBackdrop: true,
    closeOnEsc: true
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  close: []
}>()

const modalRef = ref<HTMLElement | null>(null)
const titleId = useId()

const sizeClass = computed(() => ({
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl'
}[props.size]))

function close() {
  emit('update:open', false)
  emit('close')
}

function onBackdrop() {
  if (props.closeOnBackdrop) close()
}

function onKeydown(event: KeyboardEvent) {
  if (props.open && props.closeOnEsc && event.key === 'Escape') close()
}

watch(
  () => props.open,
  async (open) => {
    if (!import.meta.client) return
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) {
      await nextTick()
      modalRef.value?.focus()
    }
  },
  { immediate: true }
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (import.meta.client) document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-ink/30 p-md backdrop-blur-md"
        @click.self="onBackdrop"
      >
        <section
          ref="modalRef"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="title ? titleId : undefined"
          tabindex="-1"
          :class="['my-xl w-full rounded-2xl bg-surface shadow-mockup outline-none', sizeClass]"
        >
          <header class="flex items-start justify-between gap-md px-lg py-md">
            <slot name="header">
              <h2 v-if="title" :id="titleId" class="text-h4 text-navy">{{ title }}</h2>
            </slot>
            <button
              type="button"
              class="grid h-8 w-8 shrink-0 place-items-center rounded-md text-steel transition-colors hover:bg-hairline-soft hover:text-ink"
              aria-label="Закрыть"
              @click="close"
            >
              <Icon name="lucide:x" class="h-4 w-4" />
            </button>
          </header>

          <div class="m-md rounded-xl bg-canvas p-lg">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="border-t border-hairline-soft px-lg py-md">
            <slot name="footer" />
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
