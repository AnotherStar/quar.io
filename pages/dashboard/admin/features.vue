<script setup lang="ts">
// Сводная таблица фич и их распределения по тарифам.
// Источник — `shared/featuresMatrix.ts`. Это рабочая спецификация
// продукта, не runtime-данные тарифа.
import {
  FEATURE_MATRIX,
  FEATURE_MATRIX_PLANS,
  FEATURE_STATUS_LABEL,
  type FeatureCell,
  type FeatureStatus
} from '~/shared/featuresMatrix'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const statusVariant = (status: FeatureStatus) => {
  if (status === 'ready') return 'tag-green'
  if (status === 'preview') return 'tag-blue'
  return 'tag-gray'
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

interface CellView {
  text: string
  tone: 'positive' | 'negative' | 'value' | 'muted'
}

function viewCell(value: FeatureCell): CellView {
  if (value === null) return { text: '—', tone: 'muted' }
  if (value === true) return { text: 'да', tone: 'positive' }
  if (value === false) return { text: 'нет', tone: 'negative' }
  return { text: value, tone: 'value' }
}

const counts = computed(() => {
  const acc: Record<FeatureStatus, number> = { ready: 0, preview: 0, draft: 0 }
  for (const row of FEATURE_MATRIX) acc[row.status] += 1
  return acc
})

// Раскрытие описаний. Несколько строк одновременно — нормально.
const expanded = reactive(new Set<string>())
function toggle(code: string) {
  if (expanded.has(code)) expanded.delete(code)
  else expanded.add(code)
}
const allExpanded = computed(() => expanded.size === FEATURE_MATRIX.length)
function toggleAll() {
  if (allExpanded.value) expanded.clear()
  else for (const r of FEATURE_MATRIX) expanded.add(r.code)
}

// Колспан под строку с описанием: 1 (название) + 1 (статус) + N тарифов + 1 (превышение).
const descriptionColspan = 1 + 1 + FEATURE_MATRIX_PLANS.length + 1

// Состояние копирования по строкам, чтобы показать «Скопировано» рядом
// именно с той кнопкой, которую нажали.
const copiedCode = ref<string | null>(null)
let copiedTimeout: ReturnType<typeof setTimeout> | null = null

async function copyDescription(code: string, text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // Fallback на устаревший путь — на случай non-secure context.
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'absolute'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  }
  copiedCode.value = code
  if (copiedTimeout) clearTimeout(copiedTimeout)
  copiedTimeout = setTimeout(() => {
    if (copiedCode.value === code) copiedCode.value = null
  }, 1500)
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:layers" title="Фичи и тарифы">
      <template #actions>
        <UiButton variant="secondary" size="sm" @click="toggleAll">
          <Icon
            :name="allExpanded ? 'lucide:chevrons-down-up' : 'lucide:chevrons-up-down'"
            class="h-4 w-4"
          />
          {{ allExpanded ? 'Свернуть все' : 'Развернуть все' }}
        </UiButton>
        <UiButton to="/dashboard/admin" variant="secondary" size="sm">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          К админке
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm space-y-2xl">
      <!-- Сводка по статусам -->
      <div class="grid grid-cols-2 gap-md md:grid-cols-4">
        <UiStatCard label="Всего фич">
          {{ FEATURE_MATRIX.length }}
        </UiStatCard>
        <UiStatCard label="Готово">
          {{ counts.ready }}
        </UiStatCard>
        <UiStatCard label="Превью">
          {{ counts.preview }}
        </UiStatCard>
        <UiStatCard label="Черновик">
          {{ counts.draft }}
        </UiStatCard>
      </div>

      <!-- Матрица фич × тарифы -->
      <div>
        <SectionHeader icon="lucide:table" title="Матрица возможностей" />
        <p class="mt-xs text-caption text-steel">
          Клик по строке раскрывает описание-промпт, кнопка «Копировать» рядом — для передачи в работу.
        </p>
        <UiTable min-width="960px" class="mt-md">
          <thead>
            <tr>
              <th class="w-[28px]" />
              <th class="text-left">Функционал</th>
              <th class="text-left">Статус</th>
              <th
                v-for="plan in FEATURE_MATRIX_PLANS"
                :key="plan.code"
                class="text-left"
              >
                <div class="flex flex-col">
                  <span>{{ plan.name }}</span>
                  <span class="text-caption text-steel">
                    {{ formatPrice(plan.price) }} ₽
                    <span v-if="plan.priceNote">· {{ plan.priceNote }}</span>
                  </span>
                </div>
              </th>
              <th class="text-left">Превышение</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="row in FEATURE_MATRIX" :key="row.code">
              <tr
                class="cursor-pointer hover:bg-surface/60"
                :class="{ 'bg-surface/40': expanded.has(row.code) }"
                @click="toggle(row.code)"
              >
                <td class="text-steel">
                  <Icon
                    :name="expanded.has(row.code) ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                    class="h-4 w-4"
                  />
                </td>
                <td class="text-body-sm-md text-ink">{{ row.name }}</td>
                <td>
                  <UiBadge :variant="statusVariant(row.status)">
                    {{ FEATURE_STATUS_LABEL[row.status] }}
                  </UiBadge>
                </td>
                <td
                  v-for="plan in FEATURE_MATRIX_PLANS"
                  :key="plan.code"
                >
                  <span
                    :class="{
                      'text-body-sm text-ink': viewCell(row.byPlan[plan.code]).tone === 'value',
                      'text-body-sm-md text-brand-green': viewCell(row.byPlan[plan.code]).tone === 'positive',
                      'text-body-sm-md text-error': viewCell(row.byPlan[plan.code]).tone === 'negative',
                      'text-body-sm text-steel': viewCell(row.byPlan[plan.code]).tone === 'muted'
                    }"
                  >
                    {{ viewCell(row.byPlan[plan.code]).text }}
                  </span>
                </td>
                <td class="text-caption text-steel">
                  {{ row.overage || '—' }}
                </td>
              </tr>
              <tr v-if="expanded.has(row.code)" class="bg-surface/30">
                <td />
                <td :colspan="descriptionColspan - 1" class="py-md">
                  <div class="flex items-start justify-between gap-md">
                    <p class="max-w-3xl whitespace-pre-line text-body-sm leading-relaxed text-ink">
                      {{ row.description }}
                    </p>
                    <div class="flex shrink-0 items-center gap-2">
                      <span
                        v-if="copiedCode === row.code"
                        class="text-caption text-brand-green"
                      >
                        Скопировано
                      </span>
                      <UiButton
                        variant="secondary"
                        size="sm"
                        @click.stop="copyDescription(row.code, row.description)"
                      >
                        <Icon name="lucide:copy" class="h-4 w-4" />
                        Копировать
                      </UiButton>
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </UiTable>
      </div>

      <p class="text-caption text-steel">
        Источник: <span class="font-mono">shared/featuresMatrix.ts</span>. Описания
        в строках намеренно написаны как ТЗ — их можно копировать и передавать агенту
        как задачу. Биллинговые лимиты применяются отдельно в
        <span class="font-mono">server/utils/plan.ts</span>.
      </p>
    </div>
  </div>
</template>
