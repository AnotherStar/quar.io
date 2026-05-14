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

const canAddItem = computed(() => {
  if (items.value.length >= MAX_ITEMS) return false
  const last = items.value[items.value.length - 1]
  if (!last) return true
  return last.question.trim().length > 0 && last.answer.trim().length > 0
})

function addItem() {
  if (!canAddItem.value) return
  commitItems([...items.value, { question: '', answer: '' }])
}

// Auto-seed первый пустой айтем, когда модалка открывается на «свежем» модуле
// без вопросов — иначе пользователь видит пустое состояние и лишний клик
// «Добавить» перед тем, как начать вводить.
onMounted(() => {
  if (!items.value.length) {
    commitItems([{ question: '', answer: '' }])
  }
})

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
  <div class="space-y-lg">
    <UiInput
      v-model="title"
      label="Заголовок блока"
      placeholder="Часто задаваемые вопросы"
    />

    <label class="flex cursor-pointer items-center gap-3 text-body-sm-md text-ink">
      <UiSwitch v-model="expandedByDefault" aria-label="Раскрывать все вопросы по умолчанию" />
      Раскрывать все вопросы по умолчанию
    </label>

    <div>
      <div class="mb-sm flex items-center justify-between">
        <div class="flex items-baseline gap-2">
          <h4 class="text-body-md text-ink">Вопросы и ответы</h4>
          <span class="text-caption text-steel">{{ items.length }} / {{ MAX_ITEMS }}</span>
        </div>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-body-sm-md text-link transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          :disabled="!canAddItem"
          :title="items.length >= MAX_ITEMS
            ? 'Достигнут максимум вопросов'
            : (!canAddItem ? 'Заполните предыдущий вопрос и ответ' : undefined)"
          @click="addItem"
        >
          <Icon name="lucide:plus" class="h-4 w-4" /> Добавить
        </button>
      </div>

      <p
        v-if="!items.length"
        class="rounded-md border border-dashed border-hairline px-md py-3 text-center text-body-sm text-steel"
      >
        Пока нет вопросов. Нажмите «Добавить», чтобы создать первый.
      </p>

      <ul v-else class="space-y-md">
        <li v-for="(item, i) in items" :key="i">
          <div class="mb-2 flex items-center justify-between gap-2">
            <span class="text-caption-bold uppercase tracking-wide text-steel">№ {{ i + 1 }}</span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                :disabled="i === 0"
                class="grid h-7 w-7 place-items-center rounded-md text-steel transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Переместить вверх"
                @click="moveUp(i)"
              >
                <Icon name="lucide:arrow-up" class="h-4 w-4" />
              </button>
              <button
                type="button"
                :disabled="i === items.length - 1"
                class="grid h-7 w-7 place-items-center rounded-md text-steel transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Переместить вниз"
                @click="moveDown(i)"
              >
                <Icon name="lucide:arrow-down" class="h-4 w-4" />
              </button>
              <button
                type="button"
                class="grid h-7 w-7 place-items-center rounded-md text-steel transition-colors hover:bg-tint-peach hover:text-error"
                aria-label="Удалить"
                @click="removeItem(i)"
              >
                <Icon name="lucide:trash-2" class="h-4 w-4" />
              </button>
            </div>
          </div>
          <div class="space-y-2">
            <UiInput
              :model-value="item.question"
              placeholder="Вопрос"
              @update:model-value="(v) => updateField(i, 'question', v)"
            />
            <textarea
              :value="item.answer"
              rows="3"
              placeholder="Ответ"
              class="block w-full resize-y rounded-md border border-hairline bg-canvas px-md py-2 text-body-sm-md text-ink placeholder:text-hairline-strong outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15"
              @input="updateField(i, 'answer', ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
