<script setup lang="ts">
// Floating per-block feedback widget. Attaches to all [data-block-id] on the
// public instruction page. Hover a block → see a small "Was this helpful?" pill.
const props = defineProps<{
  instructionId: string
  versionId?: string | null
  sessionId: string
  rootSelector?: string
}>()

const activeBlockId = ref<string | null>(null)
const popoverPos = ref<{ top: number; left: number } | null>(null)
const popoverState = ref<'menu' | 'comment' | 'thanks'>('menu')
const comment = ref('')
const submitting = ref(false)

let observer: MutationObserver | null = null
let hoverTarget: HTMLElement | null = null

function nearestBlock(target: HTMLElement | null): HTMLElement | null {
  let n: HTMLElement | null = target
  while (n && !n.dataset?.blockId) n = n.parentElement
  return n
}

function onPointerOver(e: PointerEvent) {
  const block = nearestBlock(e.target as HTMLElement)
  if (!block || hoverTarget === block) return
  hoverTarget = block
  activeBlockId.value = block.dataset.blockId!
  const rect = block.getBoundingClientRect()
  popoverPos.value = { top: rect.top + window.scrollY, left: rect.right + 12 }
  popoverState.value = 'menu'
}

async function send(kind: 'HELPFUL' | 'CONFUSING' | 'INCORRECT' | 'COMMENT', commentText?: string) {
  if (!activeBlockId.value) return
  submitting.value = true
  try {
    await $fetch('/api/public/feedback', {
      method: 'POST',
      body: {
        instructionId: props.instructionId,
        versionId: props.versionId ?? undefined,
        sessionId: props.sessionId,
        blockId: activeBlockId.value,
        kind,
        comment: commentText
      }
    })
    popoverState.value = 'thanks'
    setTimeout(() => { activeBlockId.value = null; popoverPos.value = null }, 1500)
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  const root = document.querySelector(props.rootSelector ?? 'body')
  root?.addEventListener('pointerover', onPointerOver as EventListener)
})
onBeforeUnmount(() => {
  const root = document.querySelector(props.rootSelector ?? 'body')
  root?.removeEventListener('pointerover', onPointerOver as EventListener)
  observer?.disconnect()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="popoverPos && activeBlockId"
      class="absolute z-30 hidden md:block"
      :style="{ top: popoverPos.top + 'px', left: popoverPos.left + 'px' }"
      @mouseleave="activeBlockId = null; popoverPos = null"
    >
      <div v-if="popoverState === 'menu'" class="flex items-center gap-1 rounded-md border border-hairline bg-canvas p-1 shadow-card">
        <button class="rounded-sm px-2 py-1 text-caption hover:bg-surface" :disabled="submitting" @click="send('HELPFUL')">👍 Полезно</button>
        <button class="rounded-sm px-2 py-1 text-caption hover:bg-surface" :disabled="submitting" @click="send('CONFUSING')">😕 Непонятно</button>
        <button class="rounded-sm px-2 py-1 text-caption hover:bg-surface" :disabled="submitting" @click="send('INCORRECT')">⚠️ Ошибка</button>
        <button class="rounded-sm px-2 py-1 text-caption hover:bg-surface" :disabled="submitting" @click="popoverState = 'comment'">💬</button>
      </div>
      <div v-else-if="popoverState === 'comment'" class="w-[260px] rounded-md border border-hairline bg-canvas p-2 shadow-card">
        <textarea
          v-model="comment"
          class="w-full resize-none rounded-sm border border-hairline px-2 py-1 text-caption focus:outline-none focus:border-primary"
          rows="3"
          placeholder="Ваш комментарий..."
        />
        <div class="mt-2 flex justify-end gap-1">
          <button class="rounded-sm px-2 py-1 text-caption hover:bg-surface" @click="popoverState = 'menu'">Назад</button>
          <button class="rounded-sm bg-primary px-2 py-1 text-caption text-white hover:bg-primary-pressed" :disabled="submitting || !comment" @click="send('COMMENT', comment); comment = ''">Отправить</button>
        </div>
      </div>
      <div v-else class="rounded-md border border-hairline bg-canvas px-3 py-2 text-caption shadow-card">
        ✓ Спасибо за отзыв!
      </div>
    </div>
  </Teleport>
</template>
