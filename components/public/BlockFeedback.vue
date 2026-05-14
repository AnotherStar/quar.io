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

let rootEl: HTMLElement | null = null
let hoverTarget: HTMLElement | null = null

function nearestBlock(target: HTMLElement | null): HTMLElement | null {
  let n: HTMLElement | null = target
  while (n && !n.dataset?.blockId) n = n.parentElement
  return n
}

function isEmptyBlock(block: HTMLElement): boolean {
  if (block.textContent && block.textContent.trim().length > 0) return false
  // Treat blocks with media/embeds as non-empty even without text
  if (block.querySelector('img, video, iframe, audio, svg, [data-type="youtube"]')) return false
  return true
}

// Ширина menu-состояния (4 иконки × 28 + gap-0.5 ×3 + padding ×2 + borders).
const MENU_WIDTH = 140
// Естественная ширина comment-state — ограничивается max-width, если справа
// от попапа места меньше.
const COMMENT_NATURAL_WIDTH = 260
const VIEWPORT_PADDING = 8

function onPointerOver(e: PointerEvent) {
  const block = nearestBlock(e.target as HTMLElement)
  if (!block || hoverTarget === block) return
  if (isEmptyBlock(block)) {
    hoverTarget = null
    activeBlockId.value = null
    popoverPos.value = null
    return
  }
  const rect = block.getBoundingClientRect()
  const left = rect.right + 8

  // Если за правой границей блока менюшке некуда встать — не показываем
  // вовсе, чтобы не накрывать контент и не растягивать body. Это лучше,
  // чем сдвиг внутрь блока (как делал предыдущий клампинг).
  if (left + MENU_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
    hoverTarget = null
    activeBlockId.value = null
    popoverPos.value = null
    return
  }

  hoverTarget = block
  activeBlockId.value = block.dataset.blockId!
  popoverPos.value = { top: rect.top + window.scrollY, left: left + window.scrollX }
  popoverState.value = 'menu'
}

// Максимальная ширина comment-state — то, что осталось в правой полосе
// вьюпорта от левого края попапа. Так textarea не вылезет и не растянет body.
const commentMaxWidth = computed(() => {
  if (!popoverPos.value) return COMMENT_NATURAL_WIDTH
  const inViewportLeft = popoverPos.value.left - (import.meta.client ? window.scrollX : 0)
  const remaining = (import.meta.client ? window.innerWidth : 0) - inViewportLeft - VIEWPORT_PADDING
  return Math.max(180, Math.min(COMMENT_NATURAL_WIDTH, remaining))
})

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
  rootEl = document.querySelector(props.rootSelector ?? 'body') as HTMLElement | null
  rootEl?.addEventListener('pointerover', onPointerOver as EventListener)
})
onBeforeUnmount(() => {
  rootEl?.removeEventListener('pointerover', onPointerOver as EventListener)
  rootEl = null
})
</script>

<template>
  <Teleport to="body">
    <Transition
      mode="out-in"
      enter-active-class="transition-opacity duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
    <div
      v-if="popoverPos && activeBlockId"
      :key="activeBlockId"
      class="absolute z-30 hidden md:block"
      :style="{ top: popoverPos.top + 'px', left: popoverPos.left + 'px' }"
      @mouseleave="activeBlockId = null; popoverPos = null"
    >
      <div
        v-if="popoverState === 'menu'"
        class="flex items-center gap-0.5 rounded-md border border-hairline bg-canvas p-1 shadow-card"
      >
        <UiTooltip text="Полезно">
          <button
            class="grid h-7 w-7 place-items-center rounded-sm text-steel hover:bg-surface hover:text-success disabled:opacity-50"
            :disabled="submitting"
            aria-label="Полезно"
            @click="send('HELPFUL')"
          >
            <Icon name="lucide:thumbs-up" class="h-3.5 w-3.5" />
          </button>
        </UiTooltip>
        <UiTooltip text="Непонятно">
          <button
            class="grid h-7 w-7 place-items-center rounded-sm text-steel hover:bg-surface hover:text-warning disabled:opacity-50"
            :disabled="submitting"
            aria-label="Непонятно"
            @click="send('CONFUSING')"
          >
            <Icon name="lucide:circle-help" class="h-3.5 w-3.5" />
          </button>
        </UiTooltip>
        <UiTooltip text="Ошибка в инструкции">
          <button
            class="grid h-7 w-7 place-items-center rounded-sm text-steel hover:bg-surface hover:text-error disabled:opacity-50"
            :disabled="submitting"
            aria-label="Ошибка"
            @click="send('INCORRECT')"
          >
            <Icon name="lucide:triangle-alert" class="h-3.5 w-3.5" />
          </button>
        </UiTooltip>
        <UiTooltip text="Оставить комментарий">
          <button
            class="grid h-7 w-7 place-items-center rounded-sm text-steel hover:bg-surface hover:text-ink disabled:opacity-50"
            :disabled="submitting"
            aria-label="Оставить комментарий"
            @click="popoverState = 'comment'"
          >
            <Icon name="lucide:message-square" class="h-3.5 w-3.5" />
          </button>
        </UiTooltip>
      </div>
      <div
        v-else-if="popoverState === 'comment'"
        class="rounded-md border border-hairline bg-canvas p-2 shadow-card"
        :style="{ width: commentMaxWidth + 'px' }"
      >
        <textarea
          v-model="comment"
          class="w-full resize-none rounded-sm border border-hairline px-2 py-1 text-caption focus:outline-none focus:border-primary"
          rows="3"
          placeholder="Ваш комментарий..."
        />
        <div class="mt-2 flex justify-end gap-1">
          <button class="rounded-sm px-2 py-1 text-caption text-steel hover:bg-surface" @click="popoverState = 'menu'">Назад</button>
          <button class="rounded-sm bg-primary px-2 py-1 text-caption text-white hover:bg-primary-pressed disabled:opacity-50" :disabled="submitting || !comment" @click="send('COMMENT', comment); comment = ''">Отправить</button>
        </div>
      </div>
      <div v-else class="inline-flex items-center gap-1.5 rounded-md border border-hairline bg-canvas px-3 py-2 text-caption text-charcoal shadow-card">
        <Icon name="lucide:check" class="h-3.5 w-3.5 text-success" />
        Спасибо за отзыв!
      </div>
    </div>
    </Transition>
  </Teleport>
</template>

