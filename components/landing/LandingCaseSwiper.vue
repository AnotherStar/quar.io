<script setup lang="ts">
const cases = [
  {
    title: 'Теперь это ваш покупатель',
    copy: 'Открывая инструкцию, клиенты сразу видят оффер на следующую покупку: расходники, аксессуары, промокод или скидку',
    cta: 'Рост повторных продаж до 40%',
    icon: 'lucide:shopping-bag'
  },
  {
    title: 'Работа с негативом до публикации отзыва',
    copy: 'Вместо негативного отзыва покупатель нажимает кнопку в инструкции, задаёт вопрос и получает помощь там же, где застрял.',
    cta: 'До 90% меньше негативных отзывов',
    icon: 'lucide:message-circle-question'
  },
  {
    title: 'Профессиональная инструкция — это просто',
    copy: 'Загрузите обычные фотографии или уже существующий файл с инструкцией: quar.io соберет профессиональную инструкцию, добавит иллюстрации и визуальные подсказки. Экономьте время и деньги на верстке и дизайне.',
    cta: 'Инструкция опубликована за 10 минут',
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
  <section id="cases" class="relative z-10 bg-canvas shadow-[0_-16px_40px_-20px_rgba(15,15,15,0.16),0_16px_40px_-20px_rgba(15,15,15,0.16)]">
    <div class="container-page py-section-lg">
      <div
        ref="viewport"
        class="overflow-hidden bg-canvas"
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
              <div class="border-b border-hairline py-xl pr-xl md:py-2xl md:pr-2xl lg:border-b-0">
                <h3 class="text-h2 text-navy">{{ slide.title }}</h3>
                <p class="mt-lg text-h4 font-medium leading-[1.55] text-steel">{{ slide.copy }}</p>
                <p class="mt-8 inline-flex items-center gap-sm rounded-lg bg-surface px-md py-sm text-h5 font-semibold text-primary">
                  <Icon name="lucide:trending-up" class="h-5 w-5" />
                  {{ slide.cta }}
                </p>
              </div>

              <div class="min-h-[420px] bg-transparent p-lg md:p-2xl">
                <div v-if="slide.realIndex === 0" class="h-full">
                  <img
                    src="/landing/feature-1.png"
                    alt="Инструкция с оффером для повторной покупки после продажи"
                    class="h-full w-full rounded-2xl object-cover shadow-card"
                    draggable="false"
                  >
                </div>

                <div v-else-if="slide.realIndex === 1" class="h-full">
                  <img
                    src="/landing/negative-1.png"
                    alt="Инструкция с открытым чатом поддержки для работы с вопросом покупателя"
                    class="h-full w-full rounded-2xl object-cover shadow-card"
                    draggable="false"
                  >
                </div>

                <div v-else class="grid h-full place-items-center">
                  <div class="case-compare case-compare-frame relative w-full max-w-3xl overflow-hidden rounded-2xl bg-canvas">
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

      <div class="mt-xl flex justify-center gap-sm">
        <button
          v-for="(_, index) in cases"
          :key="index"
          type="button"
          :class="['h-3 rounded-full transition-all', active === index ? 'w-16 bg-primary' : 'w-3 bg-hairline-strong hover:bg-hairline-strong']"
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
}

.case-compare-divider {
  left: 90%;
}

@supports (animation-timeline: view()) {
  .case-compare-after {
    animation: case-compare-reveal linear both;
    animation-timeline: view();
    animation-range: cover 25% cover 75%;
  }

  .case-compare-divider {
    animation: case-compare-divider linear both;
    animation-timeline: view();
    animation-range: cover 25% cover 75%;
  }
}

@keyframes case-compare-reveal {
  from {
    clip-path: polygon(90% 0, 100% 0, 100% 100%, 90% 100%);
  }

  to {
    clip-path: polygon(10% 0, 100% 0, 100% 100%, 10% 100%);
  }
}

@keyframes case-compare-divider {
  from {
    left: 90%;
  }

  to {
    left: 10%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .case-compare-after {
    animation: none;
    clip-path: polygon(50% 0, 100% 0, 100% 100%, 50% 100%);
  }

  .case-compare-divider {
    animation: none;
    left: 50%;
  }
}
</style>
