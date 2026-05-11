<script setup lang="ts">
const cases = [
  {
    title: 'Теперь это Ваш покупатель',
    copy: 'Открывая инструкцию, клиенты сразу видят оффер на следующую покупку: расходники, аксессуары, промокод или скидку',
    cta: 'Клиент совершает повторный заказ',
    icon: 'lucide:shopping-bag'
  },
  {
    title: 'Работа с негативом до публикации отзыва',
    copy: 'Вместо негативного отзыва покупатель нажимает кнопку в инструкции, задаёт вопрос и получает помощь там же, где застрял.',
    cta: 'Вопрос решён до отзыва',
    icon: 'lucide:message-circle-question'
  },
  {
    title: 'Профессиональная инструкция — это просто',
    copy: 'Загрузите обычные фотографии или уже существующий файл с инструкцией: quar.io соберет профессиональную инструкцию, добавит иллюстрации и визуальные подсказки. Экономьте время и деньги на верстке и дизайне.',
    cta: 'Из материалов — в готовую инструкцию',
    icon: 'lucide:image-plus'
  }
]

const extendedCases = computed(() => [
  { ...cases[cases.length - 1], realIndex: cases.length - 1, clone: 'last' },
  ...cases.map((item, index) => ({ ...item, realIndex: index, clone: null })),
  { ...cases[0], realIndex: 0, clone: 'first' }
])

const viewport = ref<HTMLElement | null>(null)
const slideIndex = ref(1)
const transitionEnabled = ref(false)
const dragOffset = ref(0)
const dragStartX = ref(0)
const isDragging = ref(false)

onMounted(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      transitionEnabled.value = true
    })
  })
})

const active = computed(() => {
  if (slideIndex.value === 0) return cases.length - 1
  if (slideIndex.value === cases.length + 1) return 0
  return slideIndex.value - 1
})

const trackStyle = computed(() => ({
  transform: `translateX(calc(${-slideIndex.value * 100}% + ${dragOffset.value}px))`,
  transition: transitionEnabled.value && !isDragging.value ? 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)' : 'none'
}))

function moveTo(index: number) {
  if (isDragging.value) return
  transitionEnabled.value = true
  slideIndex.value = index
}

function next() {
  moveTo(slideIndex.value + 1)
}

function prev() {
  moveTo(slideIndex.value - 1)
}

function onTrackTransitionEnd() {
  if (slideIndex.value === cases.length + 1) {
    transitionEnabled.value = false
    slideIndex.value = 1
  }
  if (slideIndex.value === 0) {
    transitionEnabled.value = false
    slideIndex.value = cases.length
  }
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  isDragging.value = true
  transitionEnabled.value = false
  dragStartX.value = event.clientX
  dragOffset.value = 0
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  dragOffset.value = event.clientX - dragStartX.value
}

function onPointerUp(event: PointerEvent) {
  if (!isDragging.value) return
  const width = viewport.value?.clientWidth ?? 1
  const threshold = Math.min(120, width * 0.18)
  const offset = dragOffset.value

  isDragging.value = false
  transitionEnabled.value = true
  dragOffset.value = 0
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)

  if (offset <= -threshold) next()
  else if (offset >= threshold) prev()
}

function onPointerCancel(event: PointerEvent) {
  isDragging.value = false
  transitionEnabled.value = true
  dragOffset.value = 0
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}
</script>

<template>
  <section id="cases" class="border-y border-hairline bg-canvas">
    <div class="container-page py-section-lg">
      <div>
        <h2 class="mx-auto max-w-3xl text-center text-h2 text-navy">QUAR — больше чем QR:</h2>
      </div>

      <div
        ref="viewport"
        class="mt-section overflow-hidden bg-canvas"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerCancel"
      >
        <div
          class="flex touch-pan-y select-none"
          :style="trackStyle"
          @transitionend.self="onTrackTransitionEnd"
        >
          <article
            v-for="slide in extendedCases"
            :key="`${slide.realIndex}-${slide.clone ?? 'real'}`"
            class="min-w-full"
            :aria-hidden="slide.realIndex !== active"
          >
            <div class="grid lg:grid-cols-2">
              <div class="border-b border-hairline py-xl pr-xl md:py-2xl md:pr-2xl lg:border-b-0 lg:border-r">
                <h3 class="text-h2 text-navy">
                  <template v-if="slide.realIndex === 0">
                    Теперь это
                    <span class="inline-block rounded-lg bg-primary px-sm text-white shadow-subtle">Ваш</span>
                    покупатель
                  </template>
                  <template v-else>{{ slide.title }}</template>
                </h3>
                <p class="mt-lg text-h4 font-medium leading-[1.55] text-slate">{{ slide.copy }}</p>
                <p class="mt-8 text-body-sm-md text-primary">{{ slide.cta }}</p>
              </div>

              <div class="min-h-[420px] bg-transparent p-lg md:p-2xl">
                <div v-if="slide.realIndex === 0" class="grid h-full gap-lg md:grid-cols-[1fr_0.82fr]">
                  <div class="rounded-xl bg-canvas p-xl shadow-subtle">
                    <p class="text-caption-bold uppercase text-steel">Инструкция</p>
                    <div class="mt-lg rounded-lg bg-surface p-lg">
                      <p class="text-h5 text-ink">Шаг 3. Нанесите клей</p>
                      <p class="mt-sm text-body text-slate">Тонкий слой по периметру. Отступ от края — 5 мм.</p>
                    </div>
                    <div class="mt-lg rounded-lg bg-tint-yellow p-lg">
                      <p class="text-body-sm-md text-warning">Важно</p>
                      <p class="mt-sm text-body text-slate">Не применять ниже +5°C.</p>
                    </div>
                  </div>
                  <div class="rounded-xl bg-primary/10 p-xl text-center">
                    <p class="text-body-sm-md text-primary">Только для вас</p>
                    <p class="mt-sm text-[52px] font-semibold text-primary">-15%</p>
                    <p class="mt-sm text-body text-slate">На следующий тюбик герметика напрямую.</p>
                    <button class="mt-xl h-12 rounded-lg bg-primary px-lg text-body-sm-md text-white">Заказать за 340 ₽</button>
                  </div>
                </div>

                <div v-else-if="slide.realIndex === 1" class="grid h-full place-items-center">
                  <div class="w-full max-w-2xl rounded-2xl bg-canvas p-xl shadow-subtle">
                    <p class="text-caption-bold uppercase text-steel">Помощь внутри инструкции</p>
                    <div class="mt-lg space-y-sm">
                      <div class="max-w-[80%] rounded-xl bg-surface p-md text-body-sm text-charcoal">Не понимаю, какой стороной поставить направляющую.</div>
                      <div class="ml-auto max-w-[82%] rounded-xl bg-primary p-md text-body-sm text-white">Проверьте, чтобы стрелка на детали смотрела к центру. Я добавил схему к шагу 4.</div>
                    </div>
                    <button class="mt-lg h-11 rounded-lg bg-surface px-lg text-body-sm-md text-charcoal">Написать продавцу</button>
                  </div>
                </div>

                <div v-else class="grid h-full place-items-center">
                  <div class="case-compare case-compare-frame group relative w-full max-w-3xl overflow-hidden rounded-2xl bg-canvas">
                    <div class="case-compare-media relative aspect-square bg-surface">
                      <img
                        src="/landing/vel-before.png"
                        alt="Фото велотренажера до обработки"
                        class="absolute inset-0 h-full w-full object-cover"
                        draggable="false"
                      >
                      <img
                        src="/landing/vel-after.png"
                        alt="Профессиональная техническая иллюстрация после обработки"
                        class="case-compare-after absolute inset-0 h-full w-full object-cover"
                        draggable="false"
                      >
                      <div class="case-compare-divider absolute inset-y-0 w-[8px] bg-white shadow-card">
                        <span class="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-white text-primary shadow-card">
                          <Icon name="lucide:chevrons-left-right" class="h-5 w-5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>

      <div class="mt-lg flex justify-center gap-xs">
        <button
          v-for="(_, index) in cases"
          :key="index"
          type="button"
          :class="['h-2 rounded-full transition-all', active === index ? 'w-8 bg-primary' : 'w-2 bg-hairline-strong']"
          :aria-label="`Показать кейс ${index + 1}`"
          @click="moveTo(index + 1)"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.case-compare-frame {
  box-shadow: 0 8px 20px rgb(16 24 40 / 12%), 0 3px 8px rgb(16 24 40 / 7%);
  isolation: isolate;
  transform: translateZ(0);
}

.case-compare-media {
  overflow: hidden;
  border-radius: inherit;
  transform: translateZ(0);
}

.case-compare-media img {
  border-radius: inherit;
}

.case-compare-after {
  clip-path: polygon(90% 0, 100% 0, 100% 100%, 90% 100%);
  transition: clip-path 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

.case-compare-divider {
  left: 90%;
  transition: left 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

.case-compare:hover .case-compare-after {
  clip-path: polygon(10% 0, 100% 0, 100% 100%, 10% 100%);
}

.case-compare:hover .case-compare-divider {
  left: 10%;
}
</style>
