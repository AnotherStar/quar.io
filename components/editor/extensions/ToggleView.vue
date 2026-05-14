<script setup lang="ts">
// Toggle NodeView. Renders a single NodeViewContent that streams both child
// nodes (summary + content). The caret button sits absolutely on the left
// and toggles `open` attr. CSS in scoped styles uses `data-open` on the
// wrapper to collapse the body via display: none.
//
// In the public renderer (editor.isEditable === false) the click also
// updates the doc attribute, but since the doc is never saved back from
// the viewer it's effectively view-local state — acceptable trade-off
// for keeping a single source of truth.
import { NodeViewWrapper, NodeViewContent, nodeViewProps } from '@tiptap/vue-3'

const props = defineProps(nodeViewProps)

const editable = computed(() => props.editor?.isEditable !== false)

// В редакторе isOpen хранится на node.attrs, чтобы автору было удобно
// редактировать тело. В публичном просмотре блок всегда стартует свёрнутым
// (атрибут open в TipTap-документе игнорируется) и состояние держится
// в локальной ref'е этой ноды — иначе пользователь, открывший инструкцию,
// сразу видел бы развёрнутые тоглы, потеряв смысл блока.
const viewOpen = ref(false)

const isOpen = computed(() => (editable.value ? Boolean(props.node.attrs.open) : viewOpen.value))

function toggle() {
  if (editable.value) {
    props.updateAttributes({ open: !props.node.attrs.open })
  } else {
    viewOpen.value = !viewOpen.value
  }
}

// Empty-summary detection — показываем placeholder только когда первый
// дочерний узел (toggleSummary) пуст. Перечитываем при каждом изменении
// доковой текстуры через .childCount/.textContent reactivity (NodeView
// получает свежий node на каждом transaction'е).
const summaryEmpty = computed(() => {
  const first = props.node.child(0)
  return !first || first.textContent.trim().length === 0
})
</script>

<template>
  <NodeViewWrapper
    :class="['mo-toggle not-prose my-3', summaryEmpty ? 'mo-toggle--empty-summary' : '']"
    data-type="toggle"
    :data-open="isOpen ? 'true' : 'false'"
  >
    <button
      type="button"
      class="mo-toggle__caret"
      :title="isOpen ? 'Свернуть' : 'Развернуть'"
      :aria-expanded="isOpen"
      :aria-label="isOpen ? 'Свернуть' : 'Развернуть'"
      contenteditable="false"
      @click="toggle"
      @mousedown.prevent
    >
      <Icon
        name="lucide:chevron-right"
        :class="['mo-toggle__caret-icon h-4 w-4', isOpen ? 'mo-toggle__caret-icon--open' : '']"
      />
    </button>
    <NodeViewContent class="mo-toggle__inner" />
  </NodeViewWrapper>
</template>

<style scoped>
.mo-toggle {
  position: relative;
  padding-left: 32px;
}

.mo-toggle__caret {
  position: absolute;
  left: 0;
  top: 2px;
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  color: var(--color-steel);
  background: transparent;
  cursor: pointer;
  transition: background 0.12s, color 0.12s;
}
.mo-toggle__caret:hover {
  background: var(--color-surface);
  color: var(--color-ink);
}
.mo-toggle__caret-icon {
  transition: transform 0.18s ease;
}
.mo-toggle__caret-icon--open {
  transform: rotate(90deg);
}

/* Summary — всегда видна. Стилизуем как «жирная строка-заголовок».
 * Body — collapse через display: none, когда блок свёрнут. */
.mo-toggle__inner :deep([data-type='toggle-summary']) {
  position: relative;
  font-weight: 600;
  color: var(--color-ink);
  min-height: 1.5em;
}

.mo-toggle__inner :deep([data-type='toggle-content']) {
  margin-top: 6px;
  padding: 10px 14px;
  background: var(--color-surface);
  border-radius: 8px;
  color: var(--color-charcoal);
  font-style: italic;
}

.mo-toggle__inner :deep([data-type='toggle-content']) > * + * {
  margin-top: 0.75em;
}

.mo-toggle[data-open='false'] .mo-toggle__inner :deep([data-type='toggle-content']) {
  display: none;
}

/* Placeholder для пустой summary — мягкий hint, чтобы пользователь понимал,
 * что туда писать. Не перебивает реальный текст: показывается только
 * когда node реально пустой (см. summaryEmpty в скрипте). */
.mo-toggle--empty-summary .mo-toggle__inner :deep([data-type='toggle-summary'])::before {
  content: 'Заголовок (видно всегда)';
  position: absolute;
  left: 0;
  top: 0;
  color: var(--color-hairline-strong);
  font-weight: 400;
  pointer-events: none;
}
</style>
