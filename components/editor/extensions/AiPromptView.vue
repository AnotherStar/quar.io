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
        <div class="flex items-center gap-2">
          <Icon name="lucide:sparkles" class="h-4 w-4" />
          <span class="text-caption-bold uppercase tracking-wide">ИИ-помощник</span>
        </div>
        <div class="mo-ai-prompt__mode">
          <button
            type="button"
            :class="['mo-ai-prompt__mode-btn', mode === 'text' && 'mo-ai-prompt__mode-btn--active']"
            :disabled="loading"
            @click="setMode('text')"
          >
            <Icon name="lucide:type" class="h-3.5 w-3.5" />
            Текст
          </button>
          <button
            type="button"
            :class="['mo-ai-prompt__mode-btn', mode === 'image' && 'mo-ai-prompt__mode-btn--active']"
            :disabled="loading"
            @click="setMode('image')"
          >
            <Icon name="lucide:image" class="h-3.5 w-3.5" />
            Изображение
          </button>
        </div>
        <button
          type="button"
          class="mo-ai-prompt__close"
          :disabled="loading"
          title="Удалить блок"
          @click="deleteBlock"
        >
          <Icon name="lucide:x" class="h-4 w-4" />
        </button>
      </div>

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

      <div v-if="errorMsg" class="mo-ai-prompt__error">{{ errorMsg }}</div>

      <div class="mo-ai-prompt__footer">
        <span class="mo-ai-prompt__hint">
          {{ loading
            ? (mode === 'image' ? 'Генерирую изображение…' : 'Генерирую текст…')
            : '⌘+Enter — сгенерировать' }}
        </span>
        <button
          type="button"
          class="mo-ai-prompt__submit"
          :disabled="loading || !prompt.trim()"
          @click="generate"
        >
          <Icon
            :name="loading ? 'lucide:loader-2' : 'lucide:sparkles'"
            :class="['h-4 w-4', loading && 'animate-spin']"
          />
          {{ loading ? 'Подождите' : 'Сгенерировать' }}
        </button>
      </div>
    </div>
  </NodeViewWrapper>
</template>

<style scoped>
/* Purple-themed prompt block — visually distinct from the rest of the
 * instruction so the author immediately sees it's "scaffolding" that will
 * be replaced after generation. */
.mo-ai-prompt__box {
  border-radius: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(217, 70, 239, 0.06));
  border: 1px solid rgba(139, 92, 246, 0.35);
  box-shadow: 0 1px 0 rgba(139, 92, 246, 0.05);
  color: #6d28d9;
}

.mo-ai-prompt__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  color: #7c3aed;
}

.mo-ai-prompt__mode {
  display: inline-flex;
  align-items: center;
  margin-left: auto;
  padding: 2px;
  border-radius: 8px;
  background: rgba(139, 92, 246, 0.12);
}
.mo-ai-prompt__mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #6d28d9;
  transition: background 0.12s, color 0.12s;
}
.mo-ai-prompt__mode-btn:hover:not(:disabled) {
  background: rgba(139, 92, 246, 0.16);
}
.mo-ai-prompt__mode-btn--active {
  background: #7c3aed !important;
  color: #fff;
}
.mo-ai-prompt__mode-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mo-ai-prompt__close {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: #7c3aed;
  transition: background 0.12s, color 0.12s;
}
.mo-ai-prompt__close:hover:not(:disabled) {
  background: rgba(139, 92, 246, 0.16);
}
.mo-ai-prompt__close:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.mo-ai-prompt__textarea {
  width: 100%;
  min-height: 60px;
  max-height: 320px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(139, 92, 246, 0.25);
  color: #6d28d9;
  font-size: 15px;
  line-height: 1.5;
  resize: none;
  outline: none;
  transition: border-color 0.12s, background 0.12s;
}
.mo-ai-prompt__textarea::placeholder {
  color: rgba(139, 92, 246, 0.55);
}
.mo-ai-prompt__textarea:focus {
  border-color: #7c3aed;
  background: #fff;
}
.mo-ai-prompt__textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.mo-ai-prompt__error {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
  font-size: 13px;
}

.mo-ai-prompt__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 10px;
}
.mo-ai-prompt__hint {
  font-size: 12px;
  color: rgba(139, 92, 246, 0.7);
}

.mo-ai-prompt__submit {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  background: linear-gradient(135deg, #7c3aed, #c026d3);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  transition: filter 0.12s, opacity 0.12s;
  box-shadow: 0 2px 8px -2px rgba(124, 58, 237, 0.4);
}
.mo-ai-prompt__submit:hover:not(:disabled) {
  filter: brightness(1.08);
}
.mo-ai-prompt__submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
</style>
