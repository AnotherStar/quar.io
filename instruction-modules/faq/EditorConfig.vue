<script setup lang="ts">
// Per-instance FAQ editor. Hosted inside the modal opened from the module-ref
// dropdown's "Настроить" button. v-model receives the current configOverride
// from ModuleRefView and emits updates back; that component persists edits
// onto the TipTap node attribute.

interface FaqItem {
  question: string
  answer: string
}

const MAX_ITEMS = 10

const props = defineProps<{
  modelValue: Record<string, any>
}>()
const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>]
}>()

const title = computed({
  get: () => String(props.modelValue?.title ?? 'Часто задаваемые вопросы'),
  set: (v: string) => emit('update:modelValue', { ...props.modelValue, title: v })
})

const expandedByDefault = computed({
  get: () => Boolean(props.modelValue?.expandedByDefault ?? false),
  set: (v: boolean) => emit('update:modelValue', { ...props.modelValue, expandedByDefault: v })
})

const items = computed<FaqItem[]>(() => {
  const raw = props.modelValue?.items
  return Array.isArray(raw)
    ? raw.slice(0, MAX_ITEMS).map((it: any) => ({ question: String(it?.question ?? ''), answer: String(it?.answer ?? '') }))
    : []
})

function commitItems(next: FaqItem[]) {
  emit('update:modelValue', { ...props.modelValue, items: next.slice(0, MAX_ITEMS) })
}

function addItem() {
  if (items.value.length >= MAX_ITEMS) return
  commitItems([...items.value, { question: '', answer: '' }])
}

function removeItem(i: number) {
  const next = items.value.slice()
  next.splice(i, 1)
  commitItems(next)
}

function moveUp(i: number) {
  if (i === 0) return
  const next = items.value.slice()
  ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
  commitItems(next)
}

function moveDown(i: number) {
  if (i === items.value.length - 1) return
  const next = items.value.slice()
  ;[next[i + 1], next[i]] = [next[i], next[i + 1]]
  commitItems(next)
}

function updateField(i: number, key: keyof FaqItem, value: string) {
  const next = items.value.slice()
  next[i] = { ...next[i], [key]: value }
  commitItems(next)
}
</script>

<template>
  <div class="space-y-md">
    <div class="space-y-2">
      <label class="block text-body-sm-md text-ink">Заголовок блока</label>
      <input
        v-model="title"
        type="text"
        class="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-body outline-none focus:border-primary"
        placeholder="Часто задаваемые вопросы"
      />
    </div>

    <label class="flex items-center gap-2 text-body-sm text-ink">
      <input v-model="expandedByDefault" type="checkbox" class="rounded border-hairline" />
      Раскрывать все вопросы по умолчанию
    </label>

    <div>
      <div class="mb-sm flex items-center justify-between">
        <h4 class="text-body-md text-ink">
          Вопросы и ответы
          <span class="text-caption text-steel font-normal">{{ items.length }} / {{ MAX_ITEMS }}</span>
        </h4>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-body-sm text-link hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="items.length >= MAX_ITEMS"
          @click="addItem"
        >
          <Icon name="lucide:plus" class="h-4 w-4" /> Добавить
        </button>
      </div>

      <p v-if="!items.length" class="rounded-md border border-dashed border-hairline px-md py-3 text-body-sm text-steel">
        Пока нет вопросов. Нажмите «Добавить», чтобы создать первый.
      </p>

      <ul v-else class="space-y-md">
        <li
          v-for="(item, i) in items"
          :key="i"
          class="rounded-md border border-hairline bg-canvas p-md"
        >
          <div class="mb-2 flex items-center justify-between gap-2">
            <span class="text-caption text-steel">#{{ i + 1 }}</span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                :disabled="i === 0"
                class="grid h-7 w-7 place-items-center rounded-sm text-steel hover:bg-surface disabled:opacity-30"
                title="Вверх"
                @click="moveUp(i)"
              >
                <Icon name="lucide:arrow-up" class="h-4 w-4" />
              </button>
              <button
                type="button"
                :disabled="i === items.length - 1"
                class="grid h-7 w-7 place-items-center rounded-sm text-steel hover:bg-surface disabled:opacity-30"
                title="Вниз"
                @click="moveDown(i)"
              >
                <Icon name="lucide:arrow-down" class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="grid h-7 w-7 place-items-center rounded-sm text-error hover:bg-tint-peach"
                title="Удалить"
                @click="removeItem(i)"
              >
                <Icon name="lucide:trash-2" class="h-4 w-4" />
              </button>
            </div>
          </div>
          <input
            :value="item.question"
            type="text"
            placeholder="Вопрос"
            class="mb-2 w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-body outline-none focus:border-primary"
            @input="updateField(i, 'question', ($event.target as HTMLInputElement).value)"
          />
          <textarea
            :value="item.answer"
            rows="3"
            placeholder="Ответ"
            class="w-full rounded-md border border-hairline bg-canvas px-3 py-2 text-body outline-none focus:border-primary"
            @input="updateField(i, 'answer', ($event.target as HTMLTextAreaElement).value)"
          />
        </li>
      </ul>
    </div>
  </div>
</template>
