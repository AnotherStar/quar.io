<script setup lang="ts">
// Витрина интерфейса дашборда. Точка сверки текущей реализации с
// DESIGN-notion.md: цвета, типографика, базовые UI-компоненты и каноничные
// шаблоны страницы собраны в одну прокручиваемую страницу. Доступ — только
// глобальным админам.
definePageMeta({ layout: 'dashboard', middleware: 'admin' })

useHead({ title: 'Интерфейс · Админ' })

const colors = {
  brand: [
    { token: 'primary', value: '#0c3fe9', note: 'CTA, активные пилюли' },
    { token: 'primary-pressed', value: '#0a36c7' },
    { token: 'on-primary', value: '#ffffff', onDark: true, note: 'Текст/иконки на primary' },
    { token: 'navy', value: '#0a1530', onDark: true, note: 'PageHeader, заголовки секций' },
    { token: 'navy-deep', value: '#070f24', onDark: true },
    { token: 'link', value: '#0075de', note: 'Inline-ссылки в тексте' }
  ],
  spectrum: [
    { token: 'brand-orange', value: '#dd5b00' },
    { token: 'brand-pink', value: '#ff64c8' },
    { token: 'brand-purple', value: '#7b3ff2' },
    { token: 'brand-teal', value: '#2a9d99' },
    { token: 'brand-green', value: '#1aae39' },
    { token: 'brand-yellow', value: '#f5d75e' }
  ],
  tints: [
    { token: 'tint-peach', value: '#ffe8d4' },
    { token: 'tint-rose', value: '#fde0ec' },
    { token: 'tint-mint', value: '#d9f3e1' },
    { token: 'tint-lavender', value: '#e6e0f5' },
    { token: 'tint-sky', value: '#dcecfa' },
    { token: 'tint-yellow', value: '#fef7d6' },
    { token: 'tint-yellow-bold', value: '#f9e79f' },
    { token: 'tint-gray', value: '#f0eeec' }
  ],
  surface: [
    { token: 'canvas', value: '#ffffff', note: 'Основной фон' },
    { token: 'surface', value: '#f6f5f4', note: 'info-card, search-pill, segmented-tabs' },
    { token: 'hairline', value: '#e5e3df', note: 'Бордеры таблиц, инпутов, разделители' },
    { token: 'hairline-strong', value: '#c8c4be', note: 'Off-трек UiSwitch, плейсхолдеры, disabled' }
  ],
  text: [
    { token: 'ink', value: '#1a1a1a', onDark: true, note: 'Заголовки таблиц, dark CTA' },
    { token: 'charcoal', value: '#37352f', onDark: true, note: 'Body, текст в пунктах меню' },
    { token: 'steel', value: '#787671', note: 'Вторичный/третичный текст, подписи' }
  ],
  semantic: [
    { token: 'success', value: '#1aae39' },
    { token: 'warning', value: '#dd5b00' },
    { token: 'error', value: '#e11d48' }
  ]
}

const typographyScale = [
  { token: 'text-h1', label: 'Heading 1 · 48/600', sample: 'Кабинет quar.io' },
  { token: 'text-h2', label: 'Heading 2 · 36/600', sample: 'Кабинет quar.io' },
  { token: 'text-h3', label: 'Heading 3 · 28/600 — PageHeader', sample: 'Кабинет quar.io' },
  { token: 'text-h4', label: 'Heading 4 · 22/600 — секция, brand-row', sample: 'Кабинет quar.io' },
  { token: 'text-h5', label: 'Heading 5 · 18/600', sample: 'Кабинет quar.io' },
  { token: 'text-subtitle', label: 'Subtitle · 18/400', sample: 'Покажите инструкцию покупателю' },
  { token: 'text-body', label: 'Body · 16/400', sample: 'Покажите инструкцию покупателю по QR-коду на упаковке.' },
  { token: 'text-body-md', label: 'Body Medium · 16/500', sample: 'Покажите инструкцию покупателю по QR-коду на упаковке.' },
  { token: 'text-body-sm', label: 'Body Small · 14/400 — таблицы, формы', sample: 'Покажите инструкцию покупателю по QR-коду на упаковке.' },
  { token: 'text-body-sm-md', label: 'Body Small Medium · 14/500 — пункты меню, кнопки', sample: 'Покажите инструкцию покупателю по QR-коду на упаковке.' },
  { token: 'text-caption', label: 'Caption · 13/400 — подписи', sample: 'Обновлено 2 минуты назад' },
  { token: 'text-caption-bold', label: 'Caption Bold · 13/600 — лейблы статов', sample: 'ВСЕГО · ОПУБЛИКОВАНО' },
  { token: 'text-micro', label: 'Micro · 12/500', sample: 'beta · pre-release' },
  { token: 'text-btn', label: 'Button · 14/500', sample: 'Создать инструкцию' }
]

const radii = [
  { token: 'rounded-xs', value: '4px' },
  { token: 'rounded-sm', value: '6px' },
  { token: 'rounded-md', value: '8px' },
  { token: 'rounded-lg', value: '12px' },
  { token: 'rounded-xl', value: '16px' },
  { token: 'rounded-2xl', value: '20px' },
  { token: 'rounded-3xl', value: '24px' },
  { token: 'rounded-full', value: '9999px' }
]

const spacingScale = [
  { token: 'xxs', value: '4px' },
  { token: 'xs', value: '8px' },
  { token: 'sm', value: '12px' },
  { token: 'md', value: '16px' },
  { token: 'lg', value: '20px' },
  { token: 'xl', value: '24px' },
  { token: '2xl', value: '32px' },
  { token: '3xl', value: '40px' },
  { token: 'section-sm', value: '48px' },
  { token: 'section', value: '64px' }
]

const shadows = [
  { token: 'shadow-subtle', note: 'Hover-плашки, индикатор segmented-tabs' },
  { token: 'shadow-card', note: 'Hover на section-preview' },
  { token: 'shadow-mockup', note: 'Мокапы продукта на маркетинге, модалки' },
  { token: 'shadow-modal', note: 'UiModal' }
]

// Демо состояния — интерактив для проверки переходов и фокус-стилей.
const inputDefault = ref('')
const inputFilled = ref('Сабельный диван')
const inputError = ref('not-an-email')

type SegmentedTab = 'all' | 'published' | 'drafts'
const segmentedValue = ref<SegmentedTab>('published')
const segmentedTabs = [
  { value: 'all' as SegmentedTab, label: 'Все', count: 24 },
  { value: 'published' as SegmentedTab, label: 'Опубликовано', count: 12 },
  { value: 'drafts' as SegmentedTab, label: 'Черновики', count: 12 }
]

type PillTab = 'all' | 'free' | 'linked' | 'pending' | 'archived'
const pillValue = ref<PillTab>('linked')
const pillTabs: { value: PillTab; label: string; count: number }[] = [
  { value: 'all', label: 'Все', count: 32 },
  { value: 'free', label: 'Свободные', count: 8 },
  { value: 'linked', label: 'Привязанные', count: 18 },
  { value: 'pending', label: 'В печать', count: 4 },
  { value: 'archived', label: 'Архив', count: 2 }
]

const modalOpen = ref(false)

// Демо-стейт для формы со всеми типами полей. Имитируют реальные дашборд-формы
// (settings, modules/*, qr-codes/[id], print/templates/new).
const formDemo = reactive({
  title: 'Сабельный диван',
  email: '',
  password: 'super-secret',
  qty: 12,
  birthday: '2025-05-01',
  url: 'https://quar.io/acme/divan',
  description: 'Премиальная гостиная серия 2025 — обновлённый каркас и расширенная гарантия.',
  // select
  visibility: 'public',
  // group checkboxes
  publishWithDocs: true,
  publishWithFeedback: false,
  publishWithWarranty: true,
  // single switch
  notificationsEnabled: true,
  // radio
  layout: 'grid'
})
const fileName = ref<string | null>(null)
function onFilePick(event: Event) {
  const input = event.target as HTMLInputElement
  fileName.value = input.files?.[0]?.name ?? null
}

// Свотчи цветов: вся плашка — это сам цвет, текст внутри. Контрастный
// цвет текста выбираем по перцептивной яркости (rec.601). На тёмном фоне —
// белый/слегка приглушённый, на светлом — наш charcoal.
function isDark(hex: string): boolean {
  const c = hex.replace('#', '')
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6
}
function swatchTextStrong(hex: string): string {
  return isDark(hex) ? '#ffffff' : 'var(--color-ink)'
}
function swatchTextMuted(hex: string): string {
  return isDark(hex) ? 'rgba(255,255,255,0.72)' : 'var(--color-steel)'
}

// Иконки, которые используются в навигации и заголовках — собраны для
// быстрой проверки и переиспользования.
const iconLibrary = [
  { name: 'lucide:layout-dashboard', use: 'Обзор' },
  { name: 'lucide:bar-chart-3', use: 'Аналитика' },
  { name: 'lucide:file-text', use: 'Инструкции' },
  { name: 'lucide:blocks', use: 'Секции' },
  { name: 'lucide:puzzle', use: 'Модули' },
  { name: 'lucide:qr-code', use: 'QR-коды' },
  { name: 'lucide:printer', use: 'Печать' },
  { name: 'lucide:settings', use: 'Настройки' },
  { name: 'lucide:shield-check', use: 'Админ' },
  { name: 'lucide:palette', use: 'Интерфейс' },
  { name: 'lucide:life-buoy', use: 'Поддержка' },
  { name: 'lucide:building-2', use: 'Компания' },
  { name: 'lucide:user-round', use: 'Профиль' },
  { name: 'lucide:credit-card', use: 'Тариф' },
  { name: 'lucide:clock', use: 'Последнее' },
  { name: 'lucide:plus', use: 'Создать' },
  { name: 'lucide:search', use: 'Поиск' },
  { name: 'lucide:check', use: 'Подтверждение' },
  { name: 'lucide:x', use: 'Закрыть' },
  { name: 'lucide:circle-alert', use: 'Attention badge' },
  { name: 'lucide:copy', use: 'Копировать' },
  { name: 'lucide:trash-2', use: 'Удалить' },
  { name: 'lucide:pencil', use: 'Редактировать' },
  { name: 'lucide:eye', use: 'Просмотр' },
  { name: 'lucide:sparkles', use: 'AI' }
]
</script>

<template>
  <div>
    <PageHeader icon="lucide:palette" title="Интерфейс">
      <template #actions>
        <UiBadge variant="tag-orange">только админ</UiBadge>
      </template>
    </PageHeader>

    <!-- Вводный info-card: что это за страница и зачем. Сама вёрстка
         блока — пример канонической «info-card» структуры (mini-header +
         тело + муфта подписей). -->
    <div class="mt-sm rounded-lg bg-surface p-xl">
      <div class="flex items-center gap-3">
        <Icon name="lucide:info" class="h-5 w-5 text-navy opacity-50" />
        <h2 class="text-h4 text-navy">Что здесь</h2>
      </div>
      <p class="mt-sm max-w-3xl text-body-sm text-charcoal">
        Витрина всех элементов, из которых сейчас собран дашборд quar.io. Цель — увидеть систему целиком,
        зафиксировать расхождения с <code class="rounded-sm bg-canvas px-1 text-caption text-charcoal">DESIGN-notion.md</code>
        и привести их к одному виду. Страница доступна только пользователю с глобальным флагом
        <code class="rounded-sm bg-canvas px-1 text-caption text-charcoal">isAdmin</code>.
      </p>
    </div>

    <!-- Вертикальный ритм между секциями реализован в <style scoped> ниже:
         `> section + section` получает margin-top 48px (воздух над hr) +
         padding-top 48px (воздух под hr) + 1px hairline на границе —
         симметрия избавляет от ощущения «hr прилип к верхнему блоку». Поэтому
         flex/gap здесь не используем: gap+margin/padding смешиваются плохо. -->
    <div class="ui-page-sections mt-2xl flex flex-col">
      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 1. Цвета                                                       -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:droplet" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Цвета</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          Все токены подключены через CSS-переменные в <code class="text-caption">assets/css/tokens.css</code>
          и проброшены в Tailwind. Tenant может переопределить значения в рантайме.
        </p>

        <div class="mt-md space-y-lg">
          <div>
            <p class="mb-xs text-caption-bold uppercase tracking-wide text-steel">Brand · Primary</p>
            <div class="grid grid-cols-2 gap-sm md:grid-cols-4">
              <div
                v-for="c in colors.brand"
                :key="c.token"
                class="rounded-lg p-md min-h-[112px] flex flex-col justify-end"
                :style="{ background: c.value }"
              >
                <p class="text-body-sm-md" :style="{ color: swatchTextStrong(c.value) }">{{ c.token }}</p>
                <p class="text-caption" :style="{ color: swatchTextMuted(c.value) }">{{ c.value }}</p>
                <p v-if="c.note" class="mt-1 text-caption" :style="{ color: swatchTextMuted(c.value) }">{{ c.note }}</p>
              </div>
            </div>
          </div>

          <div>
            <p class="mb-xs text-caption-bold uppercase tracking-wide text-steel">Brand spectrum</p>
            <div class="grid grid-cols-2 gap-sm md:grid-cols-6">
              <div
                v-for="c in colors.spectrum"
                :key="c.token"
                class="rounded-lg p-md min-h-[88px] flex flex-col justify-end"
                :style="{ background: c.value }"
              >
                <p class="text-body-sm-md" :style="{ color: swatchTextStrong(c.value) }">{{ c.token }}</p>
                <p class="text-caption" :style="{ color: swatchTextMuted(c.value) }">{{ c.value }}</p>
              </div>
            </div>
          </div>

          <div>
            <p class="mb-xs text-caption-bold uppercase tracking-wide text-steel">Tints</p>
            <p class="mb-sm text-caption text-steel">
              Пастельные карточные фоны. В дашборде используем <code class="text-caption">tint-peach</code>,
              <code class="text-caption">tint-mint</code>, <code class="text-caption">tint-lavender</code> и
              <code class="text-caption">tint-sky</code> для тегов и алёртов. Жёлтые/розовые/кремовые — для
              маркетинговых поверхностей.
            </p>
            <div class="grid grid-cols-3 gap-sm md:grid-cols-9">
              <div
                v-for="c in colors.tints"
                :key="c.token"
                class="rounded-lg p-md min-h-[88px] flex flex-col justify-end"
                :style="{ background: c.value }"
              >
                <p class="text-caption-bold text-charcoal">{{ c.token }}</p>
                <p class="text-caption text-charcoal/70">{{ c.value }}</p>
              </div>
            </div>
          </div>

          <div>
            <p class="mb-xs text-caption-bold uppercase tracking-wide text-steel">Поверхности и линии</p>
            <p class="mb-sm text-caption text-steel">
              Слева — нейтральные на белом canvas (как сейчас в дашборде). Справа — те же токены
              на <code class="text-caption">surface</code> (тёплый бежевый фон info-cards и сайдбара).
              Так видно, какие поверхности всё ещё читаются на штатном тёплом фоне, а какие в него сливаются.
            </p>
            <div class="grid gap-md md:grid-cols-2">
              <!-- На canvas (белый — рабочее полотно дашборда) -->
              <div class="rounded-lg bg-canvas p-md">
                <p class="mb-sm text-caption text-steel">На canvas (#ffffff)</p>
                <div class="grid grid-cols-2 gap-sm sm:grid-cols-3">
                  <div
                    v-for="c in colors.surface"
                    :key="`canvas-${c.token}`"
                    class="rounded-lg p-md min-h-[88px] flex flex-col justify-end"
                    :style="{ background: c.value }"
                  >
                    <p class="text-body-sm-md text-ink">{{ c.token }}</p>
                    <p class="text-caption text-steel">{{ c.value }}</p>
                    <p v-if="c.note" class="mt-1 text-caption text-steel">{{ c.note }}</p>
                  </div>
                </div>
              </div>

              <!-- На surface (бежевый фон info-cards и сайдбара) -->
              <div class="rounded-lg p-md" :style="{ background: 'var(--color-surface)' }">
                <p class="mb-sm text-caption text-steel">На surface (#f6f5f4)</p>
                <div class="grid grid-cols-2 gap-sm sm:grid-cols-3">
                  <div
                    v-for="c in colors.surface"
                    :key="`surface-${c.token}`"
                    class="rounded-lg p-md min-h-[88px] flex flex-col justify-end"
                    :style="{ background: c.value }"
                  >
                    <p class="text-body-sm-md text-ink">{{ c.token }}</p>
                    <p class="text-caption text-steel">{{ c.value }}</p>
                    <p v-if="c.note" class="mt-1 text-caption text-steel">{{ c.note }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p class="mb-xs text-caption-bold uppercase tracking-wide text-steel">Текст</p>
            <p class="mb-sm text-caption text-steel">
              Плашка залита самим цветом — это даёт мгновенное представление, насколько он
              тёмный. Внутри — «Aa» и метаданные на контрастном фоне.
            </p>
            <div class="grid grid-cols-2 gap-sm md:grid-cols-4">
              <div
                v-for="c in colors.text"
                :key="c.token"
                class="rounded-lg p-md min-h-[112px] flex flex-col justify-end"
                :style="{ background: c.value }"
              >
                <p class="text-h4" :style="{ color: swatchTextStrong(c.value) }">Aa</p>
                <p class="mt-1 text-body-sm-md" :style="{ color: swatchTextStrong(c.value) }">{{ c.token }}</p>
                <p class="text-caption" :style="{ color: swatchTextMuted(c.value) }">{{ c.value }}</p>
                <p v-if="c.note" class="mt-1 text-caption" :style="{ color: swatchTextMuted(c.value) }">{{ c.note }}</p>
              </div>
            </div>
          </div>

          <div>
            <p class="mb-xs text-caption-bold uppercase tracking-wide text-steel">Semantic</p>
            <div class="grid grid-cols-3 gap-sm md:max-w-xl">
              <div
                v-for="c in colors.semantic"
                :key="c.token"
                class="rounded-lg p-md min-h-[88px] flex flex-col justify-end"
                :style="{ background: c.value }"
              >
                <p class="text-body-sm-md" :style="{ color: swatchTextStrong(c.value) }">{{ c.token }}</p>
                <p class="text-caption" :style="{ color: swatchTextMuted(c.value) }">{{ c.value }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 2. Типографика                                                 -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:type" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Типографика</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          Шрифт — Inter с системным фолбэком. Маркетинговые поверхности используют тот же стек, что и дашборд.
        </p>

        <div class="mt-md rounded-lg bg-surface p-xl">
          <div class="divide-y divide-hairline">
            <div v-for="t in typographyScale" :key="t.token" class="flex flex-col gap-2 py-md md:flex-row md:items-baseline md:justify-between">
              <div class="md:w-72 shrink-0">
                <p class="text-caption-bold text-steel">{{ t.token }}</p>
                <p class="text-caption text-steel">{{ t.label }}</p>
              </div>
              <p :class="['flex-1 text-charcoal', t.token]">{{ t.sample }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 3. Отступы и радиусы                                           -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:ruler" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Отступы и радиусы</h2>
        </div>

        <div class="mt-md grid gap-md md:grid-cols-2">
          <div class="rounded-lg bg-surface p-xl">
            <p class="text-caption-bold uppercase tracking-wide text-steel">Spacing scale</p>
            <ul class="mt-md space-y-2">
              <li v-for="s in spacingScale" :key="s.token" class="flex items-center gap-md">
                <span class="w-20 shrink-0 text-caption text-steel">{{ s.token }}</span>
                <span class="text-caption text-steel">{{ s.value }}</span>
                <span class="h-3 rounded-sm bg-primary/20" :style="{ width: s.value }" />
              </li>
            </ul>
          </div>

          <div class="rounded-lg bg-surface p-xl">
            <p class="text-caption-bold uppercase tracking-wide text-steel">Radius scale</p>
            <div class="mt-md grid grid-cols-2 gap-md sm:grid-cols-4">
              <div v-for="r in radii" :key="r.token" class="flex flex-col items-center gap-2">
                <div
                  class="h-14 w-14 border border-hairline bg-canvas"
                  :style="{ borderRadius: r.value }"
                />
                <p class="text-caption text-steel">{{ r.token }}</p>
                <p class="text-caption text-hairline-strong">{{ r.value }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 4. Тени                                                        -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:layers" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Тени</h2>
        </div>

        <div class="mt-md grid grid-cols-2 gap-md md:grid-cols-4">
          <div v-for="s in shadows" :key="s.token" class="flex flex-col items-center gap-3 rounded-lg bg-surface p-xl">
            <div :class="['h-16 w-16 rounded-lg bg-canvas', s.token]" />
            <p class="text-caption-bold text-steel">{{ s.token }}</p>
            <p class="text-center text-caption text-steel">{{ s.note }}</p>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 5. Кнопки                                                      -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:square-mouse-pointer" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Кнопки · UiButton</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          Высота 32/40/48px, радиус 8/12/12px. <code class="text-caption">primary</code> — синий CTA quar.io,
          <code class="text-caption">secondary</code> — soft-pill на сером, <code class="text-caption">ghost</code> и
          <code class="text-caption">link</code> — для мест без шума.
        </p>

        <div class="mt-md space-y-md">
          <div class="rounded-lg bg-surface p-xl">
            <p class="mb-md text-caption-bold uppercase tracking-wide text-steel">Варианты · size md</p>
            <div class="flex flex-wrap items-center gap-sm">
              <UiButton variant="primary">Primary</UiButton>
              <UiButton variant="dark">Dark</UiButton>
              <UiButton variant="secondary">Secondary</UiButton>
              <UiButton variant="ghost">Ghost</UiButton>
              <UiButton variant="link">Link</UiButton>
              <UiButton variant="primary" :loading="true">Loading</UiButton>
              <UiButton variant="primary" :disabled="true">Disabled</UiButton>
            </div>

            <p class="mb-md mt-xl text-caption-bold uppercase tracking-wide text-steel">Размеры</p>
            <div class="flex flex-wrap items-center gap-sm">
              <UiButton size="sm">size sm · 32px</UiButton>
              <UiButton size="md">size md · 40px</UiButton>
              <UiButton size="lg">size lg · 48px</UiButton>
            </div>

            <p class="mb-md mt-xl text-caption-bold uppercase tracking-wide text-steel">С иконкой</p>
            <div class="flex flex-wrap items-center gap-sm">
              <UiButton>
                <Icon name="lucide:plus" class="h-4 w-4" />
                Создать инструкцию
              </UiButton>
              <UiButton variant="secondary">
                <Icon name="lucide:download" class="h-4 w-4" />
                Скачать
              </UiButton>
              <UiButton variant="ghost" size="sm">
                <Icon name="lucide:trash-2" class="h-4 w-4" />
                Удалить
              </UiButton>
            </div>
          </div>

          <div class="rounded-lg bg-navy p-xl">
            <p class="mb-md text-caption-bold uppercase tracking-wide text-white/70">На тёмном фоне</p>
            <div class="flex flex-wrap items-center gap-sm">
              <UiButton variant="on-dark">On dark</UiButton>
              <UiButton variant="secondary-on-dark">Secondary on dark</UiButton>
              <UiButton variant="primary">Primary</UiButton>
            </div>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 6. Бейджи                                                      -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:badge-check" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Бейджи · UiBadge</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          Solid-пилюли (purple / pink / orange / popular) — для маркетинга и хайлайтов. Tag-чипы
          (<code class="text-caption">tag-green</code>, <code class="text-caption">tag-orange</code>,
          <code class="text-caption">tag-blue</code>, <code class="text-caption">tag-gray</code>) —
          для статусов в таблицах дашборда.
        </p>

        <div class="mt-md rounded-lg bg-surface p-xl">
          <div class="flex flex-wrap items-center gap-sm">
            <UiBadge variant="purple">Purple</UiBadge>
            <UiBadge variant="pink">Pink</UiBadge>
            <UiBadge variant="orange">Orange</UiBadge>
            <UiBadge variant="popular">Popular</UiBadge>
          </div>
          <p class="mb-sm mt-xl text-caption-bold uppercase tracking-wide text-steel">Tag-чипы</p>
          <div class="flex flex-wrap items-center gap-sm">
            <UiBadge variant="tag-green">PUBLISHED</UiBadge>
            <UiBadge variant="tag-orange">IN_REVIEW</UiBadge>
            <UiBadge variant="tag-gray">DRAFT</UiBadge>
            <UiBadge variant="tag-blue">beta</UiBadge>
          </div>

          <p class="mb-sm mt-xl text-caption-bold uppercase tracking-wide text-steel">SidebarBadge</p>
          <div class="flex flex-wrap items-center gap-md">
            <div class="flex items-center gap-2">
              <SidebarBadge kind="attention" title="Нужно действие" />
              <span class="text-caption text-steel">kind=attention</span>
            </div>
            <div class="flex items-center gap-2">
              <SidebarBadge kind="count" :value="3" />
              <span class="text-caption text-steel">kind=count, value=3</span>
            </div>
            <div class="flex items-center gap-2">
              <SidebarBadge kind="count" :value="42" />
              <span class="text-caption text-steel">kind=count, value=42</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 7. Поля ввода и формы                                          -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:text-cursor-input" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Поля ввода и формы</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          Все формы дашборда собраны из шести элементов: <code class="text-caption">UiInput</code>,
          <code class="text-caption">&lt;textarea&gt;</code>, <code class="text-caption">&lt;select&gt;</code>,
          checkbox, radio и file. Геометрия одинаковая — h-10 / rounded-lg / border 1px hairline,
          фокус через ring без сдвига разметки.
        </p>

        <!-- 7.1 UiInput · все состояния и типы ------------------------------ -->
        <div class="mt-md">
          <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">UiInput · состояния</p>
          <div class="grid gap-md rounded-lg bg-surface p-xl md:grid-cols-2">
            <UiInput v-model="formDemo.title" label="С плейсхолдером" placeholder="Введите название" />
            <UiInput v-model="inputFilled" label="Заполненное" hint="Используется как title секции." />
            <UiInput v-model="inputError" label="С ошибкой" type="email" required error="Введите корректный email" />
            <UiInput model-value="Не редактируется" label="Disabled" disabled />
            <UiInput v-model="formDemo.title" label="С префиксом" prefix="quar.io/" placeholder="company-slug" />
            <UiInput v-model="formDemo.title" label="Обязательное" required placeholder="Заполните" hint="Звёздочка — required-индикатор" />
          </div>
        </div>

        <!-- 7.2 UiInput · типы ---------------------------------------------- -->
        <div class="mt-md">
          <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">UiInput · типы</p>
          <div class="grid gap-md rounded-lg bg-surface p-xl md:grid-cols-2">
            <UiInput v-model="formDemo.email" type="email" label="Email" placeholder="you@company.ru" autocomplete="email" />
            <UiInput v-model="formDemo.password" type="password" label="Пароль" hint="Минимум 8 символов" autocomplete="new-password" />
            <UiInput v-model="formDemo.qty" type="number" label="Количество" hint="Целое число" />
            <UiInput v-model="formDemo.birthday" type="date" label="Дата покупки" />
            <UiInput v-model="formDemo.url" type="url" label="Ссылка" placeholder="https://" />
            <UiInput v-model="formDemo.title" type="search" label="Поиск" placeholder="Найти инструкцию" />
          </div>
        </div>

        <!-- 7.3 Search pill ------------------------------------------------- -->
        <div class="mt-md grid gap-md md:grid-cols-2">
          <div class="rounded-lg bg-surface p-xl">
            <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">Search pill</p>
            <p class="mb-md text-caption text-steel">
              Поисковая строка в рабочей строке дашборда. h-10 / rounded-lg, фон canvas → focus с primary-ring.
            </p>
            <label class="flex h-10 items-center gap-2 rounded-lg border border-transparent bg-canvas px-md transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <Icon name="lucide:search" class="h-4 w-4 text-steel" />
              <input
                type="text"
                placeholder="Поиск по инструкциям"
                class="w-full bg-transparent text-body-sm-md placeholder:text-hairline-strong outline-none"
              >
            </label>
          </div>

          <!-- 7.4 Textarea ------------------------------------------------- -->
          <div class="rounded-lg bg-surface p-xl">
            <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">Textarea</p>
            <p class="mb-md text-caption text-steel">
              Многострочный ввод. Та же геометрия рамки и фокуса, что у UiInput. Минимум 3 строки, дальше растёт по контенту.
            </p>
            <textarea
              v-model="formDemo.description"
              placeholder="Описание инструкции…"
              rows="4"
              class="w-full rounded-lg border border-hairline bg-canvas p-md text-body-sm-md placeholder:text-hairline-strong outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        <!-- 7.5 Select ------------------------------------------------------ -->
        <div class="mt-md">
          <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">Select (native)</p>
          <p class="mb-md text-caption text-steel">
            Используется на /dashboard/analytics для фильтров. h-10 / rounded-lg / bg-surface (без бордера) — на фокусе фон сменяется на canvas + primary-ring.
            Нативный <code class="text-caption">&lt;select&gt;</code> сохраняет ОС-овое выпадающее меню и не требует JS.
          </p>
          <div class="rounded-lg bg-surface p-xl">
            <div class="grid gap-md md:grid-cols-3">
              <label class="block">
                <span class="mb-1 block text-body-sm-md text-charcoal">Видимость</span>
                <select
                  v-model="formDemo.visibility"
                  class="h-10 w-full rounded-lg border border-transparent bg-canvas px-md text-body-sm-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="public">Публичная</option>
                  <option value="unlisted">По прямой ссылке</option>
                  <option value="private">Приватная</option>
                </select>
              </label>

              <label class="block">
                <span class="mb-1 block text-body-sm-md text-charcoal">Источник трафика</span>
                <select
                  class="h-10 w-full rounded-lg border border-transparent bg-canvas px-md text-body-sm-md text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Все источники</option>
                  <option value="qr">QR</option>
                  <option value="utm">UTM</option>
                  <option value="referral">Реферал</option>
                  <option value="direct">Прямой</option>
                </select>
              </label>

              <label class="block">
                <span class="mb-1 block text-body-sm-md text-charcoal">Disabled</span>
                <select disabled class="h-10 w-full rounded-lg border border-hairline bg-canvas px-md text-body-sm text-hairline-strong outline-none">
                  <option>Недоступно</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <!-- 7.6 Checkbox / Radio / Switch ----------------------------------- -->
        <div class="mt-md grid gap-md md:grid-cols-2">
          <!-- Checkbox · одиночный и группа в fieldset -->
          <div class="rounded-lg bg-surface p-xl">
            <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">Checkbox</p>
            <p class="mb-md text-caption text-steel">
              Одиночный — для бинарных переключателей («Модуль включён»). Группа — в <code class="text-caption">&lt;fieldset&gt;</code>
              с <code class="text-caption">&lt;legend&gt;</code>, как в настройках модулей.
            </p>

            <label class="flex items-center gap-2 text-body-md text-ink">
              <input v-model="formDemo.notificationsEnabled" type="checkbox" class="h-4 w-4 rounded border-hairline" />
              Включить уведомления
            </label>

            <fieldset class="mt-md space-y-2 rounded-md border border-hairline px-md pb-md pt-[6px]">
              <legend class="px-1 text-body-sm-md text-ink">Что включать в публикацию</legend>
              <label class="flex items-center gap-2 text-body-sm text-charcoal">
                <input v-model="formDemo.publishWithDocs" type="checkbox" class="h-4 w-4 rounded border-hairline" />
                Документы (PDF, инструкции)
              </label>
              <label class="flex items-center gap-2 text-body-sm text-charcoal">
                <input v-model="formDemo.publishWithFeedback" type="checkbox" class="h-4 w-4 rounded border-hairline" />
                Форма обратной связи
              </label>
              <label class="flex items-center gap-2 text-body-sm text-charcoal">
                <input v-model="formDemo.publishWithWarranty" type="checkbox" class="h-4 w-4 rounded border-hairline" />
                Регистрация гарантии
              </label>
            </fieldset>
          </div>

          <!-- Radio + кастомный switch (нового шаблона ещё нет в проекте) -->
          <div class="rounded-lg bg-surface p-xl">
            <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">Radio</p>
            <p class="mb-md text-caption text-steel">
              Используем нативный radio с тем же 4×4-стилем, что и checkbox. Кружок вместо квадрата —
              атрибут <code class="text-caption">type="radio"</code> + <code class="text-caption">rounded-full</code>.
            </p>

            <div class="space-y-2">
              <label class="flex items-center gap-2 text-body-sm text-charcoal">
                <input v-model="formDemo.layout" type="radio" value="grid" class="h-4 w-4 border-hairline text-primary" />
                Сетка плиток
              </label>
              <label class="flex items-center gap-2 text-body-sm text-charcoal">
                <input v-model="formDemo.layout" type="radio" value="list" class="h-4 w-4 border-hairline text-primary" />
                Список
              </label>
              <label class="flex items-center gap-2 text-body-sm text-charcoal">
                <input v-model="formDemo.layout" type="radio" value="kanban" class="h-4 w-4 border-hairline text-primary" />
                Канбан-доска
              </label>
            </div>

            <p class="mb-sm mt-xl text-caption-bold uppercase tracking-wide text-steel">UiSwitch</p>
            <p class="mb-md text-caption text-steel">
              Мгновенный toggle для настроек без кнопки «Сохранить». Track 40×24, thumb 20×20,
              цвета on/off из <code class="text-caption">primary</code> / <code class="text-caption">surface</code>
              (off-трек подчёркнут 1px <code class="text-caption">hairline</code>).
            </p>

            <div class="space-y-3">
              <label class="flex items-center justify-between gap-3">
                <span class="text-body-sm text-charcoal">Тихий режим по выходным</span>
                <UiSwitch v-model="formDemo.notificationsEnabled" />
              </label>
              <label class="flex items-center justify-between gap-3">
                <span class="text-body-sm text-charcoal">Выключенный switch</span>
                <UiSwitch :model-value="false" />
              </label>
              <label class="flex items-center justify-between gap-3">
                <span class="text-body-sm text-hairline-strong">Disabled (доступно на старшем тарифе)</span>
                <UiSwitch :model-value="true" disabled />
              </label>
            </div>
          </div>
        </div>

        <!-- 7.7 File upload ------------------------------------------------- -->
        <div class="mt-md">
          <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">File upload</p>
          <p class="mb-md text-caption text-steel">
            Нативный <code class="text-caption">&lt;input type="file"&gt;</code> прячем и триггерим кнопкой —
            это даёт одинаковый вид во всех браузерах. Имя выбранного файла показываем рядом.
            Реальный пример — <code class="text-caption">GenerateFromFilesModal</code> и
            <code class="text-caption">print/templates/new</code>.
          </p>
          <div class="flex flex-wrap items-center gap-md rounded-lg bg-surface p-xl">
            <label class="inline-flex">
              <input type="file" class="hidden" accept="image/png,image/jpeg,image/webp,application/pdf" @change="onFilePick">
              <span class="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-canvas px-[18px] text-btn text-charcoal transition-colors hover:bg-tint-gray">
                <Icon name="lucide:upload" class="h-4 w-4" />
                Выбрать файл
              </span>
            </label>
            <span v-if="fileName" class="text-body-sm text-ink">{{ fileName }}</span>
            <span v-else class="text-caption text-steel">PDF / JPG / PNG, до 10 МБ</span>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 8. Карточки                                                    -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:square" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Карточки · UiCard</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          В дашборде используем <strong>info-card</strong> (серый surface на белом canvas, без бордера) —
          это <code class="text-caption">UiCard tint="gray"</code>/<code class="text-caption">div rounded-lg bg-surface</code>.
          Tinted-карточки — для маркетинга и редких акцентов.
        </p>

        <div class="mt-md grid gap-md md:grid-cols-3">
          <UiCard tint="canvas">
            <p class="text-caption-bold text-steel">canvas + bordered</p>
            <p class="mt-2 text-body-sm text-charcoal">Карточка с обводкой — для маркетинга и публичных страниц.</p>
          </UiCard>
          <UiCard tint="gray" :bordered="false">
            <p class="text-caption-bold text-steel">gray (info-card)</p>
            <p class="mt-2 text-body-sm text-charcoal">Контент внутри дашборда — без бордера, без тени.</p>
          </UiCard>
          <UiCard tint="peach" :bordered="false">
            <p class="text-caption-bold text-charcoal">peach</p>
            <p class="mt-2 text-body-sm text-charcoal">Акцент: уведомление, банка с предупреждением.</p>
          </UiCard>
          <UiCard tint="mint" :bordered="false">
            <p class="text-caption-bold text-charcoal">mint</p>
            <p class="mt-2 text-body-sm text-charcoal">Подтверждение, success-блок.</p>
          </UiCard>
          <UiCard tint="lavender" :bordered="false">
            <p class="text-caption-bold text-charcoal">lavender</p>
            <p class="mt-2 text-body-sm text-charcoal">Информация про модули и интеграции.</p>
          </UiCard>
          <UiCard tint="sky" :bordered="false">
            <p class="text-caption-bold text-charcoal">sky</p>
            <p class="mt-2 text-body-sm text-charcoal">Информационная подсказка.</p>
          </UiCard>
          <UiCard tint="rose" :bordered="false">
            <p class="text-caption-bold text-charcoal">rose</p>
            <p class="mt-2 text-body-sm text-charcoal">Акцент: pink-feature на маркетинге.</p>
          </UiCard>
          <UiCard tint="yellow" :bordered="false">
            <p class="text-caption-bold text-charcoal">yellow</p>
            <p class="mt-2 text-body-sm text-charcoal">Тихое внимание.</p>
          </UiCard>
          <UiCard tint="yellow-bold" :bordered="false">
            <p class="text-caption-bold text-charcoal">yellow-bold</p>
            <p class="mt-2 text-body-sm text-charcoal">Hero-баннер. Только для маркетинга.</p>
          </UiCard>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 9. Алёрты                                                      -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:bell" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Алёрты · UiAlert</h2>
        </div>

        <div class="mt-md grid gap-md md:grid-cols-2">
          <UiAlert kind="info" title="Информация">
            Подсказка о новом поведении продукта или функции.
          </UiAlert>
          <UiAlert kind="success" title="Успех">
            Инструкция опубликована. Поделитесь короткой ссылкой с покупателем.
          </UiAlert>
          <UiAlert kind="warning" title="Внимание">
            Не подтверждён email — некоторые действия будут недоступны.
          </UiAlert>
          <UiAlert kind="error" title="Ошибка">
            Не удалось сохранить изменения. Попробуйте ещё раз через минуту.
          </UiAlert>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 10. Сегментированные и pill-табы                               -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:rows-2" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Табы</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          Segmented — для 2–3 равных по длине пунктов, движется плашка-индикатор. Pill — для 3+ фильтров
          разной длины, индикатор фиксируется на каждой кнопке отдельно.
        </p>

        <div class="mt-md grid gap-md md:grid-cols-2">
          <div class="rounded-lg bg-surface p-xl">
            <p class="mb-md text-caption-bold uppercase tracking-wide text-steel">UiSegmentedTabs</p>
            <UiSegmentedTabs v-model="segmentedValue" :tabs="segmentedTabs" />
            <p class="mt-md text-caption text-steel">Активно: <span class="text-ink">{{ segmentedValue }}</span></p>
          </div>

          <div class="rounded-lg bg-surface p-xl">
            <p class="mb-md text-caption-bold uppercase tracking-wide text-steel">Pill-tabs (фильтры)</p>
            <div class="inline-flex h-10 max-w-full items-stretch overflow-x-auto rounded-lg bg-canvas p-1">
              <button
                v-for="t in pillTabs"
                :key="t.value"
                type="button"
                :class="[
                  'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-md text-body-sm-md transition-colors',
                  pillValue === t.value ? 'bg-surface text-ink shadow-subtle' : 'text-hairline-strong hover:text-ink'
                ]"
                @click="pillValue = t.value"
              >
                <span>{{ t.label }}</span>
                <span class="font-bold text-hairline-strong">·&nbsp;{{ t.count }}</span>
              </button>
            </div>
            <p class="mt-md text-caption text-steel">Активно: <span class="text-ink">{{ pillValue }}</span></p>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 11. Рабочая строка: tabs + search + CTA                        -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:arrow-left-right" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Рабочая строка</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          Канонический ряд под PageHeader: табы слева, поиск посередине, primary-CTA справа.
          Все три блока — высоты 40px и радиуса 12px.
        </p>

        <div class="mt-md flex flex-wrap items-center gap-md">
          <UiSegmentedTabs v-model="segmentedValue" :tabs="segmentedTabs" />
          <label class="flex h-10 min-w-[240px] flex-1 items-center gap-2 rounded-lg border border-transparent bg-surface px-md transition-all focus-within:border-primary focus-within:bg-canvas focus-within:ring-2 focus-within:ring-primary/20">
            <Icon name="lucide:search" class="h-4 w-4 text-steel" />
            <input
              type="text"
              placeholder="Поиск"
              class="w-full bg-transparent text-body-sm-md placeholder:text-hairline-strong outline-none"
            >
          </label>
          <UiButton>
            <Icon name="lucide:plus" class="h-4 w-4" />
            Создать инструкцию
          </UiButton>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 12. Таблицы                                                    -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:table" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Таблицы · UiTable</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          Без бордера-обёртки. Шапка — caption uppercase steel. Строки разделены 1px hairline. Первая
          и последняя колонка прижаты к краям контейнера — это выравнивает таблицу по PageHeader сверху.
        </p>

        <div class="mt-md">
          <UiTable min-width="720px">
            <thead>
              <tr>
                <th class="text-left">Инструкция</th>
                <th class="text-left">Slug</th>
                <th class="text-left">Статус</th>
                <th class="text-left">Обновлено</th>
                <th class="text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <p class="text-body-sm-md text-ink">Сабельный диван</p>
                  <p class="text-caption text-steel">Гостиная серия 2025</p>
                </td>
                <td class="text-caption text-steel">divan-sabel</td>
                <td><UiBadge variant="tag-green">PUBLISHED</UiBadge></td>
                <td class="text-caption text-steel">2 часа назад</td>
                <td class="text-right">
                  <UiButton variant="ghost" size="sm">
                    <Icon name="lucide:pencil" class="h-4 w-4" />
                  </UiButton>
                </td>
              </tr>
              <tr>
                <td>
                  <p class="text-body-sm-md text-ink">Кофемашина Aria Pro</p>
                  <p class="text-caption text-steel">Кухонная техника</p>
                </td>
                <td class="text-caption text-steel">aria-pro</td>
                <td><UiBadge variant="tag-orange">IN_REVIEW</UiBadge></td>
                <td class="text-caption text-steel">вчера</td>
                <td class="text-right">
                  <UiButton variant="ghost" size="sm">
                    <Icon name="lucide:pencil" class="h-4 w-4" />
                  </UiButton>
                </td>
              </tr>
              <tr>
                <td>
                  <p class="text-body-sm-md text-ink">Робот-пылесос Mira</p>
                  <p class="text-caption text-steel">Уборка</p>
                </td>
                <td class="text-caption text-steel">mira-vacuum</td>
                <td><UiBadge variant="tag-gray">DRAFT</UiBadge></td>
                <td class="text-caption text-steel">3 дня назад</td>
                <td class="text-right">
                  <UiButton variant="ghost" size="sm">
                    <Icon name="lucide:pencil" class="h-4 w-4" />
                  </UiButton>
                </td>
              </tr>
            </tbody>
          </UiTable>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 13. Тултип                                                     -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:message-circle" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Тултипы · UiTooltip</h2>
        </div>

        <div class="mt-md flex flex-wrap items-center gap-md rounded-lg bg-surface p-xl">
          <UiTooltip text="Жирный (⌘B)">
            <UiButton variant="secondary" size="sm">
              <Icon name="lucide:bold" class="h-4 w-4" />
            </UiButton>
          </UiTooltip>
          <UiTooltip text="Сохранить как черновик">
            <UiButton variant="secondary" size="sm">
              <Icon name="lucide:save" class="h-4 w-4" />
            </UiButton>
          </UiTooltip>
          <UiTooltip text="Открыть в новой вкладке (⌘↩)">
            <UiButton variant="secondary" size="sm">
              <Icon name="lucide:external-link" class="h-4 w-4" />
            </UiButton>
          </UiTooltip>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 14. Модалки                                                    -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:square-stack" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Модалка · UiModal</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          Серый surface-контейнер с белой внутренней рамкой контента и тенью modal. Закрытие — Esc / клик по фону.
        </p>

        <div class="mt-md rounded-lg bg-surface p-xl">
          <UiButton @click="modalOpen = true">Открыть модалку</UiButton>
        </div>

        <UiModal v-model:open="modalOpen" title="Подтвердить публикацию">
          <p class="text-body-sm text-charcoal">
            Опубликовать «Сабельный диван»? После публикации создаётся неизменяемая версия инструкции.
          </p>
          <UiAlert kind="info" class="mt-md">
            Покупатели увидят обновление, как только страница перезагрузится.
          </UiAlert>
          <template #footer>
            <div class="flex justify-end gap-sm">
              <UiButton variant="secondary" @click="modalOpen = false">Отмена</UiButton>
              <UiButton @click="modalOpen = false">Опубликовать</UiButton>
            </div>
          </template>
        </UiModal>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 15. Копируемая ссылка                                          -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:link" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Копируемая ссылка · UiCopyableUrl</h2>
        </div>

        <div class="mt-md grid gap-md md:grid-cols-2">
          <div class="rounded-lg bg-surface p-xl">
            <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">Публичный URL</p>
            <UiCopyableUrl url="https://quar.io/acme/divan-sabel" />
          </div>
          <div class="rounded-lg bg-surface p-xl">
            <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">Короткая ссылка</p>
            <UiCopyableUrl url="https://quar.io/s/Ab12Cd" />
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 16. Шаблоны страницы                                           -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:layout-template" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Шаблоны страницы</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          Из этих блоков собрана большая часть дашборда — PageHeader, ряды статов, info-card,
          section-mini-header, section-preview и пустое состояние.
        </p>

        <div class="mt-md space-y-lg">
          <!-- 16.1 PageHeader -->
          <div>
            <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">PageHeader</p>
            <div class="rounded-lg bg-surface p-xl">
              <div class="flex min-h-16 items-center justify-between gap-2 rounded-md bg-canvas px-md">
                <div class="flex items-center gap-3">
                  <Icon name="lucide:file-text" class="h-6 w-6 text-navy opacity-50" />
                  <h1 class="text-h3 text-navy">Инструкции</h1>
                </div>
                <div class="flex items-center gap-md">
                  <UiButton variant="secondary" size="sm">
                    <Icon name="lucide:filter" class="h-4 w-4" />
                    Фильтры
                  </UiButton>
                  <UiButton size="sm">
                    <Icon name="lucide:plus" class="h-4 w-4" />
                    Создать
                  </UiButton>
                </div>
              </div>
              <p class="mt-sm text-caption text-steel">
                Высота 64px. Y-координата иконки и заголовка совпадает с brand-row в сайдбаре.
              </p>
            </div>
          </div>

          <!-- 16.2 Stat row -->
          <div>
            <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">Ряд stat-карточек</p>
            <div class="grid grid-cols-2 gap-md md:grid-cols-4">
              <div class="rounded-lg bg-surface p-xl">
                <p class="text-caption-bold text-steel uppercase tracking-wide">Всего</p>
                <p class="mt-2 text-h2 text-navy">24</p>
              </div>
              <div class="rounded-lg bg-surface p-xl">
                <p class="text-caption-bold text-steel uppercase tracking-wide">Опубликовано</p>
                <p class="mt-2 text-h2 text-navy">12</p>
              </div>
              <div class="rounded-lg bg-surface p-xl">
                <p class="text-caption-bold text-steel uppercase tracking-wide">Черновики</p>
                <p class="mt-2 text-h2 text-navy">8</p>
              </div>
              <div class="rounded-lg bg-surface p-xl">
                <p class="text-caption-bold text-steel uppercase tracking-wide">На ревью</p>
                <p class="mt-2 text-h2 text-navy">4</p>
              </div>
            </div>
          </div>

          <!-- 16.3 Info-card with mini-header -->
          <div>
            <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">Info-card с mini-header</p>
            <div class="rounded-lg bg-surface p-xl">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <Icon name="lucide:clock" class="h-5 w-5 text-navy opacity-50" />
                  <h3 class="text-h4 text-navy">Последние инструкции</h3>
                </div>
                <UiButton variant="secondary" size="sm">Все инструкции</UiButton>
              </div>
              <ul class="mt-md divide-y divide-hairline">
                <li class="flex items-center justify-between py-sm">
                  <span class="text-body-sm-md text-ink">Сабельный диван</span>
                  <UiBadge variant="tag-green">PUBLISHED</UiBadge>
                </li>
                <li class="flex items-center justify-between py-sm">
                  <span class="text-body-sm-md text-ink">Кофемашина Aria Pro</span>
                  <UiBadge variant="tag-orange">IN_REVIEW</UiBadge>
                </li>
                <li class="flex items-center justify-between py-sm">
                  <span class="text-body-sm-md text-ink">Робот-пылесос Mira</span>
                  <UiBadge variant="tag-gray">DRAFT</UiBadge>
                </li>
              </ul>
            </div>
          </div>

          <!-- 16.4 Section preview card -->
          <div>
            <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">Section-preview card</p>
            <p class="mb-sm text-caption text-steel">
              Внешний серый бокс с 8px padding'ом, внутри — header и белый rounded-блок с обрезанным контентом.
            </p>
            <div class="grid gap-md md:grid-cols-2">
              <div class="rounded-lg bg-surface p-xs transition-shadow hover:shadow-card">
                <div class="px-md pb-sm pt-xs">
                  <p class="text-body-sm-md text-ink">Уход за тканью</p>
                  <p class="text-caption text-steel">Используется в 4 инструкциях</p>
                </div>
                <div class="relative h-32 overflow-hidden rounded-md bg-canvas p-md">
                  <p class="text-body-sm text-charcoal">
                    Регулярно пылесосьте поверхность дивана мягкой насадкой. Не используйте отбеливающие
                    средства — они изменят оттенок ткани.
                  </p>
                  <div class="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-canvas to-transparent" />
                </div>
              </div>
              <div class="rounded-lg bg-surface p-xs transition-shadow hover:shadow-card">
                <div class="px-md pb-sm pt-xs">
                  <p class="text-body-sm-md text-ink">Создайте свою секцию</p>
                  <p class="text-caption text-steel">Переиспользуйте контент между инструкциями</p>
                </div>
                <div class="grid h-32 place-items-center rounded-md bg-canvas">
                  <div class="flex flex-col items-center gap-2 text-steel">
                    <Icon name="lucide:plus" class="h-6 w-6" />
                    <p class="text-caption">Добавить новую секцию</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 16.5 Active sidebar nav-item -->
          <div>
            <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">Сайдбар: пункт меню</p>
            <div class="grid gap-md md:grid-cols-2">
              <div class="rounded-[14px] bg-surface p-sm">
                <p class="mb-xs px-sm text-caption text-steel">Активный пункт</p>
                <div class="flex h-9 items-center gap-3 rounded-md bg-primary px-sm text-body-sm-md text-on-primary">
                  <Icon name="lucide:file-text" class="h-4 w-4" />
                  <span>Инструкции</span>
                </div>
                <div class="mt-1 flex h-9 items-center gap-3 rounded-md px-sm text-body-sm-md text-charcoal">
                  <Icon name="lucide:bar-chart-3" class="h-4 w-4" />
                  <span>Аналитика</span>
                </div>
                <div class="mt-1 flex h-9 items-center gap-3 rounded-md px-sm text-body-sm-md text-charcoal hover:bg-hairline">
                  <Icon name="lucide:qr-code" class="h-4 w-4" />
                  <span>QR-коды</span>
                  <SidebarBadge kind="count" :value="3" class="ml-auto" />
                </div>
                <div class="mt-1 flex h-9 items-center gap-3 rounded-md px-sm text-body-sm-md text-charcoal">
                  <Icon name="lucide:settings" class="h-4 w-4" />
                  <span>Настройки</span>
                  <SidebarBadge kind="attention" class="ml-auto" />
                </div>
              </div>
              <div class="rounded-[14px] bg-surface p-sm">
                <p class="mb-xs px-sm text-caption text-steel">Свёрнутый сайдбар</p>
                <div class="grid h-9 w-9 place-items-center rounded-md bg-primary text-on-primary">
                  <Icon name="lucide:file-text" class="h-4 w-4" />
                </div>
                <div class="mt-1 grid h-9 w-9 place-items-center rounded-md text-charcoal">
                  <Icon name="lucide:bar-chart-3" class="h-4 w-4" />
                </div>
                <div class="relative mt-1 grid h-9 w-9 place-items-center rounded-md text-charcoal">
                  <Icon name="lucide:qr-code" class="h-4 w-4" />
                  <span class="absolute right-1.5 top-1 h-2 w-2 rounded-full bg-error ring-2 ring-surface" />
                </div>
              </div>
            </div>
          </div>

          <!-- 16.6 Empty state -->
          <div>
            <p class="mb-sm text-caption-bold uppercase tracking-wide text-steel">Пустое состояние</p>
            <div class="rounded-lg bg-surface p-3xl text-center">
              <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-canvas text-navy/50">
                <Icon name="lucide:file-text" class="h-6 w-6" />
              </div>
              <p class="mt-md text-h5 text-navy">Пока нет инструкций</p>
              <p class="mt-1 text-body-sm text-steel">
                Создайте первую инструкцию, чтобы покупатель открыл её по QR-коду на упаковке.
              </p>
              <div class="mt-md flex justify-center">
                <UiButton>
                  <Icon name="lucide:plus" class="h-4 w-4" />
                  Создать инструкцию
                </UiButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 17. Иконки                                                     -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:shapes" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">Иконки</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          Все иконки — lucide через <code class="text-caption">&lt;Icon name="lucide:…"&gt;</code>.
          Используем 4/5/6px-классы Tailwind: <code class="text-caption">h-4 w-4</code> в пунктах меню,
          <code class="text-caption">h-5 w-5</code> в section-mini-header, <code class="text-caption">h-6 w-6</code> в PageHeader.
        </p>

        <div class="mt-md grid grid-cols-2 gap-2 rounded-lg bg-surface p-xl sm:grid-cols-3 md:grid-cols-5">
          <div
            v-for="i in iconLibrary"
            :key="i.name"
            class="flex items-center gap-3 rounded-md bg-canvas px-md py-sm"
          >
            <Icon :name="i.name" class="h-5 w-5 shrink-0 text-navy opacity-70" />
            <div class="min-w-0">
              <p class="truncate text-body-sm-md text-ink">{{ i.use }}</p>
              <p class="truncate text-caption text-steel">{{ i.name }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ────────────────────────────────────────────────────────────── -->
      <!-- 18. Подсказки по расхождениям с DESIGN-notion.md               -->
      <!-- ────────────────────────────────────────────────────────────── -->
      <section>
        <div class="flex items-center gap-3">
          <Icon name="lucide:notebook-pen" class="h-5 w-5 text-navy opacity-50" />
          <h2 class="text-h4 text-navy">На что обратить внимание</h2>
        </div>
        <p class="mt-1 text-body-sm text-steel">
          Точки, в которых текущая реализация расходится с <code class="text-caption">DESIGN-notion.md</code>.
        </p>

        <div class="mt-md space-y-sm">
          <UiAlert kind="info" title="Primary — синий, не фиолетовый">
            В дизайн-доке местами остался «Notion-фиолетовый» в текстовых описаниях секций.
            В коде <code class="text-caption">--color-primary</code> — синий quar.io (#0c3fe9).
          </UiAlert>
          <UiAlert kind="info" title="Кнопки — radius 12px, не 8px">
            Доковая запись `button-primary` указывает <code class="text-caption">rounded: md (8px)</code>,
            фактически <code class="text-caption">UiButton size="md"</code> рендерится с <code class="text-caption">rounded-lg</code>.
            Это намеренно — выравнивает по h-10 / segmented-tabs / search-pill.
          </UiAlert>
          <UiAlert kind="info" title="UiInput — focus через box-shadow ring">
            В доке указано <code class="text-caption">2px solid primary</code> на фокусе. В коде ширина бордера
            не меняется, фокус виден через 2px ring — это убирает 1px-сдвиг разметки.
          </UiAlert>
          <UiAlert kind="info" title="Search pill — фон canvas, не surface">
            В <code class="text-caption">DESIGN-notion.md</code> search-pill описан с фоном
            <code class="text-caption">surface</code>. В дашборде поиск рендерится на белом фоне,
            а в working-row внутри info-card — на surface. Унифицировать.
          </UiAlert>
          <UiAlert kind="info" title="error сдвинут в розово-красную сторону">
            Был <code class="text-caption">#e03131</code> — рядом с brand-orange <code class="text-caption">#dd5b00</code>
            (warning) глаз склеивал оба свотча. Теперь <code class="text-caption">#e11d48</code> (rose-600) —
            ~40° по тону отдельно, при этом warning остаётся брендовым оранжевым.
          </UiAlert>
          <UiAlert kind="info" title="Модалка — surface-фон с белой рамкой">
            В <code class="text-caption">UiModal</code> сейчас два слоя: серый внешний контейнер и белый
            внутренний бокс для контента. В доке описана плоская модалка — нужно зафиксировать актуальный вариант.
          </UiAlert>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* Удерживаем длинные сэмплы текста в одну строку на десктопе, чтобы строка
 * типографики не перетекала на две — иначе сложно сравнивать межстрочные
 * расстояния визуально. */
@media (min-width: 768px) {
  .text-h1, .text-h2, .text-h3, .text-h4, .text-h5, .text-subtitle {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* Тонкая разделительная линия перед каждой секцией, кроме первой. Воздух
 * вокруг hr симметричен (48px сверху + 48px снизу) — это убирает ощущение,
 * что линия «прилипла» к верхнему блоку, и читается как группы в
 * macOS System Settings. */
.ui-page-sections > section + section {
  margin-top: 48px;
  padding-top: 48px;
  border-top: 1px solid var(--color-hairline);
}
</style>
