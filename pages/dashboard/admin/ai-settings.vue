<script setup lang="ts">
// Управление AI-конфигами: для каждой фичи можно выбрать модель, отредактировать
// системный промпт, выкрутить reasoning effort или параметры image-генерации.
// Каждое сохранение создаёт новую версию (immutable history). Откат — через
// блок «История версий».
//
// Источник схем и дефолтов — shared/aiSettings.ts. UI не дублирует список
// фич, читает его с сервера.
import { AI_MODEL_CATALOG, type OpenAIModelId } from '~~/shared/openaiModels'
import {
  IMAGE_GENERATION_MODELS,
  IMAGE_GENERATION_SIZES,
  PROMPT_WRAPPER_PLACEHOLDER,
  REASONING_EFFORTS,
  type AiSettingKey,
  type ImageGenerationConfig,
  type PromptWrapperConfig,
  type ReasoningEffort,
  type TextLlmConfig
} from '~~/shared/aiSettings'

definePageMeta({ layout: 'dashboard', middleware: 'admin' })

const api = useApi()
const toast = useToast()

interface ActiveVersionInfo {
  version: number
  isValid: boolean
  createdAt: string
  note: string | null
  createdBy: { id: string; name: string | null; email: string } | null
}

type SettingKind = 'text-llm' | 'image-generation' | 'prompt-wrapper'
type SettingValue = TextLlmConfig | ImageGenerationConfig | PromptWrapperConfig

interface AiSettingItem {
  key: AiSettingKey
  label: string
  description: string
  kind: SettingKind
  effective: SettingValue | null
  isConfigured: boolean
  activeVersion: ActiveVersionInfo | null
  totalVersions: number
}

// Стартовые значения формы, когда у фичи нет активной версии. Это не
// «дефолты» в продуктовом смысле — runtime ими не пользуется, они нужны
// только чтобы форма открылась хоть с чем-то. Содержательную часть
// заполняет администратор.
function blankDraft(kind: SettingKind): SettingValue {
  if (kind === 'text-llm') {
    return { model: 'gpt-5.4-mini', systemPrompt: '', reasoningEffort: 'none' }
  }
  if (kind === 'image-generation') {
    return { model: 'gpt-image-1.5', size: '1024x1024', n: 1 }
  }
  return { template: `${PROMPT_WRAPPER_PLACEHOLDER}` }
}

interface VersionItem {
  version: number
  value: SettingValue
  note: string | null
  createdAt: string
  createdBy: { id: string; name: string | null; email: string } | null
  isActive: boolean
}

const { data, pending, refresh } = await useAsyncData(
  'admin-ai-settings',
  () => api<{ items: AiSettingItem[] }>('/api/admin/ai-settings')
)

// Локальные копии форм по ключу — редактируются независимо от effective.
// При раскрытии строки копируем effective → drafts[key]. При «Сохранить»
// шлём drafts[key]. После refresh сбрасываем.
const drafts = reactive<Record<string, SettingValue>>({})
const notes = reactive<Record<string, string>>({})
const expanded = reactive(new Set<string>())
const savingKey = ref<string | null>(null)
const activatingVersion = ref<{ key: string; version: number } | null>(null)

// Историческое окно. Лениво подгружается при открытии секции «История».
const historyOpen = reactive(new Set<string>())
const historyData = reactive<Record<string, { loading: boolean; versions: VersionItem[] }>>({})

function startEditing(item: AiSettingItem) {
  drafts[item.key] = item.effective
    ? structuredClone(toRaw(item.effective))
    : blankDraft(item.kind)
  notes[item.key] = ''
}

function toggle(item: AiSettingItem) {
  if (expanded.has(item.key)) {
    expanded.delete(item.key)
    return
  }
  expanded.add(item.key)
  startEditing(item)
}

function isDirty(item: AiSettingItem) {
  const draft = drafts[item.key]
  if (!draft) return false
  return JSON.stringify(draft) !== JSON.stringify(item.effective)
}

async function save(item: AiSettingItem) {
  const draft = drafts[item.key]
  if (!draft) return
  savingKey.value = item.key
  try {
    await api(`/api/admin/ai-settings/${item.key}`, {
      method: 'PUT',
      body: { value: draft, note: notes[item.key]?.trim() || undefined }
    })
    toast.success('Новая версия сохранена и активирована', { title: item.label })
    notes[item.key] = ''
    historyData[item.key] = { loading: false, versions: [] }
    await refresh()
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || 'Не удалось сохранить')
  } finally {
    savingKey.value = null
  }
}

async function loadHistory(key: AiSettingKey) {
  historyData[key] = { loading: true, versions: [] }
  try {
    const res = await api<{ versions: VersionItem[] }>(`/api/admin/ai-settings/${key}/versions`)
    historyData[key] = { loading: false, versions: res.versions }
  } catch (e: any) {
    historyData[key] = { loading: false, versions: [] }
    toast.error(e?.statusMessage || e?.message || 'Не удалось загрузить историю')
  }
}

function toggleHistory(item: AiSettingItem) {
  if (historyOpen.has(item.key)) {
    historyOpen.delete(item.key)
    return
  }
  historyOpen.add(item.key)
  if (!historyData[item.key]) loadHistory(item.key)
}

async function activateVersion(item: AiSettingItem, version: number) {
  activatingVersion.value = { key: item.key, version }
  try {
    await api(`/api/admin/ai-settings/${item.key}/activate`, {
      method: 'POST',
      body: { version }
    })
    toast.success(`Активирована версия ${version}`, { title: item.label })
    await refresh()
    await loadHistory(item.key)
    const fresh = data.value?.items.find((it) => it.key === item.key)
    if (fresh) startEditing(fresh)
  } catch (e: any) {
    toast.error(e?.statusMessage || e?.message || 'Не удалось переключить версию')
  } finally {
    activatingVersion.value = null
  }
}

// Effort'ы, доступные для выбранной модели. Заодно гасит мусор: если в БД
// был сохранён effort, который выбранная модель не поддерживает, при смене
// модели он автоматически переключится на первый разрешённый.
function availableEfforts(model: OpenAIModelId): readonly ReasoningEffort[] {
  const supported = AI_MODEL_CATALOG[model]?.reasoningEfforts ?? []
  // 'none' — наш zero-effort, всегда доступен (мы просто не передаём reasoning).
  const set = new Set<ReasoningEffort>(['none'])
  for (const e of supported) {
    if ((REASONING_EFFORTS as readonly string[]).includes(e)) set.add(e as ReasoningEffort)
  }
  return [...set].sort(
    (a, b) => REASONING_EFFORTS.indexOf(a) - REASONING_EFFORTS.indexOf(b)
  )
}

function onModelChange(item: AiSettingItem) {
  const draft = drafts[item.key]
  if (!draft || item.kind !== 'text-llm') return
  const textDraft = draft as TextLlmConfig
  const allowed = availableEfforts(textDraft.model)
  if (!allowed.includes(textDraft.reasoningEffort)) {
    textDraft.reasoningEffort = allowed[0] ?? 'none'
  }
}

function formatDateTime(s: string) {
  return new Date(s).toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function userLabel(u: ActiveVersionInfo['createdBy']) {
  if (!u) return 'неизвестный пользователь'
  return u.name?.trim() || u.email
}

const configuredCount = computed(
  () => data.value?.items.filter((it) => it.isConfigured).length ?? 0
)
const unconfiguredCount = computed(
  () => (data.value?.items.length ?? 0) - configuredCount.value
)

const modelOptions = Object.values(AI_MODEL_CATALOG).map((m) => ({
  id: m.id,
  label: m.label,
  hint: m.recommendedFor
}))

const effortLabels: Record<ReasoningEffort, string> = {
  none: 'Без reasoning',
  minimal: 'Минимальный',
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  xhigh: 'Максимальный'
}
</script>

<template>
  <div>
    <PageHeader icon="lucide:bot" title="AI: модели и промпты">
      <template #actions>
        <UiButton variant="secondary" size="sm" :loading="pending" @click="refresh">
          <Icon name="lucide:refresh-cw" class="h-4 w-4" />
          Обновить
        </UiButton>
        <UiButton to="/dashboard/admin" variant="secondary" size="sm">
          <Icon name="lucide:arrow-left" class="h-4 w-4" />
          К админке
        </UiButton>
      </template>
    </PageHeader>

    <div class="mt-sm space-y-2xl">
      <p class="text-body-sm text-steel">
        Здесь настраиваются модели OpenAI и системные промпты для каждой AI-фичи quar.io.
        Каждое сохранение создаёт новую версию — старые остаются доступны для отката.
        Если у фичи нет активной версии, соответствующий AI-эндпоинт возвращает ошибку,
        пока администратор не создаст конфигурацию.
      </p>

      <UiAlert v-if="unconfiguredCount > 0" variant="warning">
        Не настроено фич: {{ unconfiguredCount }}. Соответствующие AI-функции
        возвращают ошибку. Создайте первую версию для каждой из них.
      </UiAlert>

      <div class="grid grid-cols-2 gap-md md:grid-cols-4">
        <UiStatCard label="Всего фич">
          {{ data?.items.length ?? 0 }}
        </UiStatCard>
        <UiStatCard label="Настроено" hint="есть активная версия">
          {{ configuredCount }}
        </UiStatCard>
        <UiStatCard label="Не настроено" hint="runtime вернёт 503">
          {{ unconfiguredCount }}
        </UiStatCard>
        <UiStatCard label="Всего версий" hint="суммарно в БД">
          {{ data?.items.reduce((sum, i) => sum + i.totalVersions, 0) ?? 0 }}
        </UiStatCard>
      </div>

      <div class="space-y-md">
        <div
          v-for="item in data?.items ?? []"
          :key="item.key"
          class="rounded-lg border border-hairline bg-surface"
        >
          <button
            type="button"
            class="flex w-full items-start justify-between gap-md px-lg py-md text-left hover:bg-surface/60"
            @click="toggle(item)"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <Icon
                  :name="expanded.has(item.key) ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                  class="h-4 w-4 text-steel"
                />
                <span class="text-body-md-md text-ink">{{ item.label }}</span>
                <UiBadge v-if="item.isConfigured" variant="tag-blue">
                  v{{ item.activeVersion?.version }}
                </UiBadge>
                <UiBadge v-else variant="tag-orange">не настроено</UiBadge>
                <UiBadge
                  v-if="item.activeVersion && !item.activeVersion.isValid"
                  variant="tag-orange"
                >
                  значение невалидно
                </UiBadge>
              </div>
              <p class="mt-xs text-body-sm text-steel">{{ item.description }}</p>
              <p
                v-if="item.activeVersion"
                class="mt-xs text-caption text-steel"
              >
                Изменил {{ userLabel(item.activeVersion.createdBy) }} ·
                {{ formatDateTime(item.activeVersion.createdAt) }}
                <span v-if="item.activeVersion.note"> · «{{ item.activeVersion.note }}»</span>
              </p>
            </div>
            <div class="shrink-0 text-right text-caption text-steel">
              <div v-if="item.effective && item.kind !== 'prompt-wrapper'" class="font-mono">
                {{ (item.effective as any).model }}
              </div>
              <div v-else-if="item.effective" class="font-mono">
                шаблон · {{ (item.effective as PromptWrapperConfig).template.length }} симв.
              </div>
              <div v-else class="text-error">—</div>
              <div class="mt-xs">{{ item.totalVersions }} версий</div>
            </div>
          </button>

          <!-- Раскрытая редактируемая форма -->
          <div
            v-if="expanded.has(item.key) && drafts[item.key]"
            class="space-y-lg border-t border-hairline px-lg py-lg"
          >
            <!-- Поля для text-llm -->
            <template v-if="item.kind === 'text-llm'">
              <div class="grid gap-md md:grid-cols-2">
                <label class="block">
                  <span class="mb-1 block text-body-sm-md text-charcoal">Модель OpenAI</span>
                  <select
                    v-model="(drafts[item.key] as TextLlmConfig).model"
                    class="h-10 w-full rounded-md border border-transparent bg-canvas px-md text-body-sm-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    @change="onModelChange(item)"
                  >
                    <option v-for="m in modelOptions" :key="m.id" :value="m.id">
                      {{ m.label }}
                    </option>
                  </select>
                  <p class="mt-xs text-caption text-steel">
                    {{ AI_MODEL_CATALOG[(drafts[item.key] as TextLlmConfig).model]?.recommendedFor }}
                  </p>
                </label>

                <label class="block">
                  <span class="mb-1 block text-body-sm-md text-charcoal">Reasoning effort</span>
                  <select
                    v-model="(drafts[item.key] as TextLlmConfig).reasoningEffort"
                    class="h-10 w-full rounded-md border border-transparent bg-canvas px-md text-body-sm-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option
                      v-for="eff in availableEfforts((drafts[item.key] as TextLlmConfig).model)"
                      :key="eff"
                      :value="eff"
                    >
                      {{ effortLabels[eff] }}
                    </option>
                  </select>
                  <p class="mt-xs text-caption text-steel">
                    «Без reasoning» — модель отвечает максимально быстро. Высокие уровни замедляют ответ, но улучшают качество на сложных инструкциях.
                  </p>
                </label>
              </div>

              <label class="block">
                <span class="mb-1 block text-body-sm-md text-charcoal">Системный промпт</span>
                <textarea
                  v-model="(drafts[item.key] as TextLlmConfig).systemPrompt"
                  rows="14"
                  class="block w-full rounded-md border border-transparent bg-canvas px-md py-sm font-mono text-body-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p class="mt-xs text-caption text-steel">
                  Длина: {{ (drafts[item.key] as TextLlmConfig).systemPrompt.length }} символов.
                  Не описывай задачу как «MVP» или «временное решение» — это попадает в ответ модели и в UI пользователя.
                </p>
              </label>
            </template>

            <!-- Поля для image-generation -->
            <template v-else-if="item.kind === 'image-generation'">
              <div class="grid gap-md md:grid-cols-3">
                <label class="block">
                  <span class="mb-1 block text-body-sm-md text-charcoal">Модель</span>
                  <select
                    v-model="(drafts[item.key] as ImageGenerationConfig).model"
                    class="h-10 w-full rounded-md border border-transparent bg-canvas px-md text-body-sm-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option v-for="m in IMAGE_GENERATION_MODELS" :key="m" :value="m">
                      {{ m }}
                    </option>
                  </select>
                </label>

                <label class="block">
                  <span class="mb-1 block text-body-sm-md text-charcoal">Размер</span>
                  <select
                    v-model="(drafts[item.key] as ImageGenerationConfig).size"
                    class="h-10 w-full rounded-md border border-transparent bg-canvas px-md text-body-sm-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    <option v-for="s in IMAGE_GENERATION_SIZES" :key="s" :value="s">
                      {{ s }}
                    </option>
                  </select>
                </label>

                <label class="block">
                  <span class="mb-1 block text-body-sm-md text-charcoal">Количество (n)</span>
                  <input
                    v-model.number="(drafts[item.key] as ImageGenerationConfig).n"
                    type="number"
                    min="1"
                    max="4"
                    class="h-10 w-full rounded-md border border-transparent bg-canvas px-md text-body-sm-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <p class="mt-xs text-caption text-steel">
                    В inline-сценариях используется только первая картинка из ответа.
                  </p>
                </label>
              </div>
            </template>

            <!-- Поля для prompt-wrapper -->
            <template v-else>
              <label class="block">
                <span class="mb-1 block text-body-sm-md text-charcoal">Шаблон обвязки</span>
                <textarea
                  v-model="(drafts[item.key] as PromptWrapperConfig).template"
                  rows="14"
                  class="block w-full rounded-md border border-transparent bg-canvas px-md py-sm font-mono text-body-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p class="mt-xs text-caption text-steel">
                  Длина: {{ (drafts[item.key] as PromptWrapperConfig).template.length }} символов.
                  Обязательный плейсхолдер
                  <span class="font-mono text-ink">{{ PROMPT_WRAPPER_PLACEHOLDER }}</span> —
                  на его место подставляется пользовательский ввод.
                </p>
                <p
                  v-if="!(drafts[item.key] as PromptWrapperConfig).template.includes(PROMPT_WRAPPER_PLACEHOLDER)"
                  class="mt-xs text-caption text-error"
                >
                  Шаблон должен содержать {{ PROMPT_WRAPPER_PLACEHOLDER }} — иначе пользовательский ввод никуда не подставится.
                </p>
              </label>
            </template>

            <!-- Комментарий + действия -->
            <div class="flex flex-wrap items-end gap-md border-t border-hairline pt-md">
              <label class="block min-w-[280px] flex-1">
                <span class="mb-1 block text-body-sm-md text-charcoal">
                  Комментарий к версии (необязательно)
                </span>
                <input
                  v-model="notes[item.key]"
                  type="text"
                  maxlength="500"
                  placeholder="Например: расширили инструкции по safety-блокам"
                  class="h-10 w-full rounded-md border border-transparent bg-canvas px-md text-body-sm-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <div class="flex items-center gap-2">
                <UiButton
                  variant="primary"
                  size="sm"
                  :disabled="!isDirty(item) || savingKey === item.key"
                  :loading="savingKey === item.key"
                  @click="save(item)"
                >
                  <Icon name="lucide:save" class="h-4 w-4" />
                  {{ item.isConfigured ? 'Сохранить новую версию' : 'Создать первую версию' }}
                </UiButton>
              </div>
            </div>

            <!-- История -->
            <div class="border-t border-hairline pt-md">
              <button
                type="button"
                class="flex items-center gap-2 text-body-sm-md text-charcoal hover:text-ink"
                @click="toggleHistory(item)"
              >
                <Icon
                  :name="historyOpen.has(item.key) ? 'lucide:chevron-down' : 'lucide:chevron-right'"
                  class="h-4 w-4"
                />
                История версий ({{ item.totalVersions }})
              </button>

              <div v-if="historyOpen.has(item.key)" class="mt-md">
                <p
                  v-if="historyData[item.key]?.loading"
                  class="text-body-sm text-steel"
                >
                  Загружаем историю…
                </p>
                <p
                  v-else-if="!historyData[item.key]?.versions.length"
                  class="text-body-sm text-steel"
                >
                  Версий ещё нет. Сохрани первую, чтобы создать запись.
                </p>
                <ul v-else class="divide-y divide-hairline">
                  <li
                    v-for="v in historyData[item.key].versions"
                    :key="v.version"
                    class="flex items-start justify-between gap-md py-sm"
                  >
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="text-body-sm-md text-ink">Версия {{ v.version }}</span>
                        <UiBadge v-if="v.isActive" variant="tag-green">активна</UiBadge>
                      </div>
                      <p class="mt-xs text-caption text-steel">
                        {{ userLabel(v.createdBy) }} · {{ formatDateTime(v.createdAt) }}
                        <span v-if="v.note"> · «{{ v.note }}»</span>
                      </p>
                      <p class="mt-xs font-mono text-caption text-steel">
                        <template v-if="item.kind === 'text-llm'">
                          {{ (v.value as TextLlmConfig).model }}
                          · effort: {{ (v.value as TextLlmConfig).reasoningEffort }}
                          · prompt: {{ (v.value as TextLlmConfig).systemPrompt.length }} симв.
                        </template>
                        <template v-else-if="item.kind === 'image-generation'">
                          {{ (v.value as ImageGenerationConfig).model }}
                          · {{ (v.value as ImageGenerationConfig).size }}
                          · n={{ (v.value as ImageGenerationConfig).n }}
                        </template>
                        <template v-else>
                          шаблон · {{ (v.value as PromptWrapperConfig).template.length }} симв.
                        </template>
                      </p>
                    </div>
                    <UiButton
                      v-if="!v.isActive"
                      variant="secondary"
                      size="sm"
                      :loading="activatingVersion?.key === item.key && activatingVersion?.version === v.version"
                      @click="activateVersion(item, v.version)"
                    >
                      <Icon name="lucide:check" class="h-4 w-4" />
                      Сделать активной
                    </UiButton>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
