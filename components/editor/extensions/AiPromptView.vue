<script setup lang="ts">
// NodeView for the AiPrompt block. Purple-themed inline prompt box where the
// author writes a request and clicks "Сгенерировать". On success the block is
// replaced with the generated content (text blocks or an image).
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import type { AiPromptMode } from './AiPrompt'

const props = defineProps(nodeViewProps)

const route = useRoute()
const api = useApi()
const { track } = useTrackGoal()

const prompt = ref((props.node.attrs.prompt as string) ?? '')
const mode = ref<AiPromptMode>((props.node.attrs.mode as AiPromptMode) ?? 'text')
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Переключалка режимов с «едущим» индикатором — мини-копия UiSegmentedTabs,
// чтобы не тянуть его стилизацию (серый фон / белая плашка), но сохранить
// поведение. Индикатор позиционируется по offsetLeft/offsetWidth активной
// кнопки и пересчитывается через ResizeObserver.
const modeTabs = [
  { value: 'text', label: 'Сгенерировать текст' },
  { value: 'image', label: 'Сгенерировать изображение' }
] as const
const modeContainerRef = ref<HTMLElement | null>(null)
const modeBtnRefs = ref<HTMLButtonElement[]>([])
const modeIndicator = reactive({ left: 0, width: 0, ready: false })

function setModeBtnRef(el: Element | ComponentPublicInstance | null, i: number) {
  if (el instanceof HTMLButtonElement) modeBtnRefs.value[i] = el
}

function measureModeIndicator() {
  const idx = modeTabs.findIndex((t) => t.value === mode.value)
  const btn = modeBtnRefs.value[idx < 0 ? 0 : idx]
  if (!btn) return
  modeIndicator.left = btn.offsetLeft
  modeIndicator.width = btn.offsetWidth
  modeIndicator.ready = true
}

let modeRO: ResizeObserver | null = null

watch(mode, async () => {
  await nextTick()
  measureModeIndicator()
})

function persistPrompt() {
  // Persist prompt text into the doc so a page reload doesn't drop it.
  // We only write on blur to avoid hammering the autosave on every keystroke.
  if ((props.node.attrs.prompt as string) === prompt.value) return
  props.updateAttributes({ prompt: prompt.value })
}

function setMode(next: AiPromptMode) {
  if (mode.value === next) return
  mode.value = next
  props.updateAttributes({ mode: next })
}

function autosize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 320)}px`
}

function focusTextarea() {
  nextTick(() => {
    textareaRef.value?.focus()
    autosize()
  })
}

onMounted(() => {
  // Brand-new prompt block opens focused so the user can start typing.
  if (!prompt.value) focusTextarea()
  else autosize()

  nextTick(measureModeIndicator)
  if (typeof ResizeObserver !== 'undefined' && modeContainerRef.value) {
    modeRO = new ResizeObserver(measureModeIndicator)
    modeRO.observe(modeContainerRef.value)
    for (const btn of modeBtnRefs.value) if (btn) modeRO.observe(btn)
  }
})

onBeforeUnmount(() => {
  modeRO?.disconnect()
  modeRO = null
})

watch(prompt, autosize)

// Replace this node with the given JSON nodes. Resolves position INSIDE the
// transaction callback so we always operate on fresh state — `getPos()` and
// `node.nodeSize` captured before an `await` can drift if the editor is edited
// in the meantime. Range is clamped to doc bounds to avoid ProseMirror's
// "Position N out of range" RangeError.
function replaceSelfWith(jsonNodes: any[]): boolean {
  return props.editor
    .chain()
    .command(({ tr, state, dispatch }) => {
      const getPos = props.getPos
      const pos = typeof getPos === 'function' ? getPos() : null
      if (pos == null || pos < 0) return false
      const docSize = state.doc.content.size
      const size = props.node.nodeSize || 1
      const from = Math.min(pos, docSize)
      const to = Math.min(pos + size, docSize)
      if (to <= from) return false
      if (!dispatch) return true
      try {
        const parsed = jsonNodes.map((n) => state.schema.nodeFromJSON(n))
        tr.replaceWith(from, to, parsed)
        return true
      } catch (err) {
        console.error('[ai-prompt] replace failed', err)
        return false
      }
    })
    .focus()
    .run()
}

function deleteBlock() {
  props.editor
    .chain()
    .command(({ tr, state, dispatch }) => {
      const pos = typeof props.getPos === 'function' ? props.getPos() : null
      if (pos == null || pos < 0) return false
      const docSize = state.doc.content.size
      const size = props.node.nodeSize || 1
      const from = Math.min(pos, docSize)
      const to = Math.min(pos + size, docSize)
      if (to <= from) return false
      if (dispatch) tr.delete(from, to)
      return true
    })
    .focus()
    .run()
}

function buildContextDoc() {
  // Send the full draft as context. Replace this aiPrompt node with a
  // <<HERE>> marker so the model knows exactly where the generated content
  // should slot in. Other aiPrompt blocks become <<PROMPT>> placeholders.
  const myAttrs = props.node.attrs
  const doc = JSON.parse(JSON.stringify(props.editor.getJSON()))
  const rewrite = (arr: any[] | undefined): any[] | undefined => {
    if (!Array.isArray(arr)) return arr
    return arr.map((child) => {
      if (child?.type === 'aiPrompt') {
        const isMe = child.attrs?.prompt === myAttrs.prompt && child.attrs?.mode === myAttrs.mode
        return {
          type: 'paragraph',
          content: [{ type: 'text', text: isMe ? '<<HERE>>' : '<<PROMPT>>' }]
        }
      }
      if (child?.content) return { ...child, content: rewrite(child.content) }
      return child
    })
  }
  return { ...doc, content: rewrite(doc.content) }
}

async function generate() {
  const text = prompt.value.trim()
  if (!text || loading.value) return
  const instructionId = route.params.id as string | undefined
  if (!instructionId) {
    errorMsg.value = 'Контекст инструкции недоступен'
    return
  }
  loading.value = true
  errorMsg.value = null
  try {
    const contextDoc = buildContextDoc()
    const result = await api<
      | { kind: 'text'; nodes: any[] }
      | { kind: 'image'; url: string }
    >(`/api/instructions/${instructionId}/ai-prompt`, {
      method: 'POST',
      body: { prompt: text, mode: mode.value, contextDoc }
    })

    const nodes = result.kind === 'image'
      ? [
          { type: 'image', attrs: { src: result.url, alt: text } },
          { type: 'paragraph' }
        ]
      : (Array.isArray(result.nodes) && result.nodes.length
          ? result.nodes
          : [{ type: 'paragraph' }])

    if (!replaceSelfWith(nodes)) {
      errorMsg.value = 'Не удалось вставить результат в редактор'
    } else {
      track('editor_ai_used', { source: 'inline_prompt', mode: mode.value })
    }
  } catch (e: any) {
    errorMsg.value = e?.data?.statusMessage || e?.message || 'Не удалось сгенерировать'
  } finally {
    loading.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    generate()
  } else if (e.key === 'Escape' && !prompt.value.trim()) {
    e.preventDefault()
    deleteBlock()
  }
}
</script>

<template>
  <NodeViewWrapper class="mo-ai-prompt my-3 not-prose" data-type="ai-prompt">
    <div class="mo-ai-prompt__box" contenteditable="false">
      <div class="mo-ai-prompt__header">
        <Icon name="lucide:sparkles" class="h-4 w-4" />
        <span class="text-caption-bold uppercase tracking-wide">ИИ-помощник</span>
      </div>

      <div class="mo-ai-prompt__composer">
        <textarea
          ref="textareaRef"
          v-model="prompt"
          :placeholder="mode === 'image'
            ? 'Опишите изображение, которое нужно сгенерировать…'
            : 'Опишите, какой текст или часть инструкции нужно написать…'"
          :disabled="loading"
          class="mo-ai-prompt__textarea"
          rows="2"
          spellcheck="false"
          @blur="persistPrompt"
          @keydown="onKeydown"
        />

        <div class="mo-ai-prompt__bar">
          <div
            ref="modeContainerRef"
            class="mo-ai-prompt__mode"
            role="tablist"
            aria-label="Что сгенерировать"
          >
            <span
              aria-hidden="true"
              class="mo-ai-prompt__mode-indicator"
              :style="{
                left: `${modeIndicator.left}px`,
                width: `${modeIndicator.width}px`,
                opacity: modeIndicator.ready ? 1 : 0
              }"
            />
            <button
              v-for="(t, i) in modeTabs"
              :key="t.value"
              :ref="(el) => setModeBtnRef(el, i)"
              type="button"
              role="tab"
              :aria-selected="mode === t.value"
              :class="['mo-ai-prompt__mode-btn', mode === t.value && 'mo-ai-prompt__mode-btn--active']"
              :disabled="loading"
              @click="setMode(t.value)"
            >
              {{ t.label }}
            </button>
          </div>

          <button
            type="button"
            class="mo-ai-prompt__send"
            :disabled="loading || !prompt.trim()"
            :title="loading
              ? (mode === 'image' ? 'Генерирую изображение…' : 'Генерирую текст…')
              : (mode === 'image' ? 'Сгенерировать изображение — ⌘+Enter' : 'Сгенерировать текст — ⌘+Enter')"
            :aria-label="mode === 'image' ? 'Сгенерировать изображение' : 'Сгенерировать текст'"
            @click="generate"
          >
            <Icon
              :name="loading ? 'lucide:loader-2' : 'lucide:send-horizontal'"
              :class="['h-4 w-4', loading && 'animate-spin']"
            />
          </button>
        </div>
      </div>

      <div v-if="errorMsg" class="mo-ai-prompt__error">{{ errorMsg }}</div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
/* Purple-themed prompt block. Только тонированный фон, без обводок —
 * композер внутри тоже без рамки. Паддинги привязаны к токенам spacing
 * (xs=8 / sm=12 / md=16). */
.mo-ai-prompt__box {
  border-radius: 12px;
  padding: 12px; /* sm */
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(217, 70, 239, 0.06));
  color: #6d28d9;
}

.mo-ai-prompt__header {
  display: flex;
  align-items: center;
  gap: 8px; /* xs */
  margin-bottom: 8px; /* xs */
  color: #7c3aed;
}

/* Composer: textarea + нижняя панель «режимы + отправка». Без рамки,
 * фон белый, разделение визуальное только через цвет. */
.mo-ai-prompt__composer {
  display: flex;
  flex-direction: column;
  gap: 8px; /* xs */
  border-radius: 10px;
  background: #fff;
  padding: 12px; /* sm */
}

.mo-ai-prompt__textarea {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 0;
  min-height: 72px;
  max-height: 320px;
  border: 0;
  background: transparent;
  color: #4c1d95;
  font-size: 15px;
  line-height: 1.5;
  resize: none;
  outline: none;
}
.mo-ai-prompt__textarea::placeholder {
  color: #a78bfa;
  opacity: 1;
}
.mo-ai-prompt__textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mo-ai-prompt__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px; /* sm */
}

/* Сегментированный переключатель с «едущим» индикатором — поведение
 * скопировано с UiSegmentedTabs, стилизация под фиолетовую тему. */
.mo-ai-prompt__mode {
  position: relative;
  display: inline-flex;
  align-items: stretch;
  padding: 3px;
  border-radius: 8px;
  background: rgba(139, 92, 246, 0.10);
}
.mo-ai-prompt__mode-indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  border-radius: 6px;
  background: #7c3aed;
  transition: left 300ms ease-out, width 300ms ease-out, opacity 200ms ease-out;
  pointer-events: none;
}
.mo-ai-prompt__mode-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 12px; /* sm */
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #6d28d9;
  background: transparent;
  transition: color 0.18s ease-out;
  white-space: nowrap;
}
.mo-ai-prompt__mode-btn--active {
  color: #fff;
}
.mo-ai-prompt__mode-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mo-ai-prompt__send {
  display: inline-grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  color: #fff;
  transition: filter 0.12s, background 0.12s;
  box-shadow: 0 2px 8px -2px rgba(124, 58, 237, 0.4);
}
.mo-ai-prompt__send:hover:not(:disabled) {
  filter: brightness(1.08);
}
.mo-ai-prompt__send:disabled {
  cursor: not-allowed;
  background: rgba(139, 92, 246, 0.25);
  box-shadow: none;
}

.mo-ai-prompt__error {
  margin-top: 8px; /* xs */
  padding: 8px 12px; /* xs sm */
  border-radius: 6px;
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
  font-size: 13px;
}
</style>
