<script setup lang="ts">
const stats = [
  { target: 120, suffix: '+', label: 'инструкций в пилотах' },
  { target: 38, suffix: '%', label: 'средняя доля вопросов по сложным шагам' },
  { target: 12, suffix: '%', label: 'переходов к повторному заказу в демо-сценарии' }
]

const displayed = ref<number[]>(stats.map(() => 0))
const statsRoot = ref<HTMLElement | null>(null)
let countersStarted = false

function runCounters() {
  if (countersStarted) return
  countersStarted = true
  const duration = 1400
  const startTime = performance.now()
  function frame(now: number) {
    const progress = Math.min(1, (now - startTime) / duration)
    const eased = 1 - Math.pow(1 - progress, 3)
    displayed.value = stats.map(stat => Math.round(stat.target * eased))
    if (progress < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

const testimonials = [
  { name: 'Анна', avatar: '/landing/faces/2.png', company: 'бренд товаров для дома', role: 'операционный директор', quote: 'Раньше вопросы жили в отзывах. Теперь видим, где человек застрял, и можем исправить инструкцию до следующей партии.' },
  { name: 'Илья', avatar: '/landing/faces/1.png', company: 'магазин на маркетплейсах', role: 'основатель', quote: 'QR уже в коробке, покупатель уже у нас. Самое логичное место, чтобы предложить расходники и повторный заказ напрямую.' },
  { name: 'Мария', avatar: '/landing/faces/4.png', company: 'электроника', role: 'руководитель поддержки', quote: 'Нам важна не красота PDF, а меньше возвратов и меньше однотипных вопросов. quar.io попадает ровно в эту задачу.' },
  { name: 'Дмитрий', avatar: '/landing/faces/3.png', company: 'мебельный каталог', role: 'product lead', quote: 'Версии и переиспользуемые секции выглядят как система, которую можно масштабировать на каталог, а не делать вручную по SKU.' },
  { name: 'Олег', avatar: '/landing/faces/5.png', company: 'товары для ремонта', role: 'category manager', quote: 'После скана QR покупатель не остаётся один с инструкцией. Он может спросить, а мы видим, какой шаг реально ломает сценарий.' },
  { name: 'Елена', avatar: '/landing/faces/6.png', company: 'детские товары', role: 'brand manager', quote: 'Для нас это канал после продажи: объяснить, успокоить, предложить аксессуар и не потерять человека в интерфейсе маркетплейса.' },
  { name: 'Павел', avatar: '/landing/faces/7.png', company: 'спорттовары', role: 'ecommerce lead', quote: 'Понравилось, что QR не надо менять после печати. Исправили шаг, обновили оффер, а коробки остаются теми же.' },
  { name: 'Ксения', avatar: '/landing/faces/8.png', company: 'косметика и уход', role: 'CRM lead', quote: 'Повторная покупка появляется в момент использования продукта, а не через холодную рассылку через месяц.' },
  { name: 'Роман', avatar: '/landing/faces/9.png', company: 'инструменты', role: 'руководитель продукта', quote: 'Сразу видно, где люди нажимают “непонятно”. Это честнее, чем ждать плохой отзыв и гадать, что именно пошло не так.' },
  { name: 'Наталья', avatar: '/landing/faces/10.png', company: 'зоотовары', role: 'операционный менеджер', quote: 'Хорошо, что это не просто страница. Есть инструкция, контакт с покупателем, аналитика и место для следующего предложения.' }
]

const testimonialSlides = [...testimonials, ...testimonials]
const marqueeTrack = ref<HTMLElement | null>(null)
const marqueeOffset = ref(0)
const marqueePaused = ref(false)

const marqueeTrackStyle = computed(() => ({
  transform: `translateX(${-marqueeOffset.value}px)`
}))

let marqueeFrame: number | undefined
let marqueeLastTime = 0
let marqueeSpeed = 0
const marqueeBaseSpeed = 24

function setMarqueePaused(value: boolean) {
  marqueePaused.value = value
}

const isDragging = ref(false)
let dragStartX = 0
let dragStartOffset = 0

function cycleWidth() {
  return (marqueeTrack.value?.scrollWidth ?? 0) / 2
}

function wrapOffset(value: number) {
  const w = cycleWidth()
  if (w <= 0) return 0
  return ((value % w) + w) % w
}

function onMarqueePointerDown(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  isDragging.value = true
  marqueePaused.value = true
  dragStartX = event.clientX
  dragStartOffset = marqueeOffset.value
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onMarqueePointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  const delta = event.clientX - dragStartX
  marqueeOffset.value = wrapOffset(dragStartOffset - delta)
}

function endMarqueeDrag(event: PointerEvent) {
  if (!isDragging.value) return
  isDragging.value = false
  marqueePaused.value = false
  marqueeLastTime = 0
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}

function runMarquee(timestamp: number) {
  if (!marqueeLastTime) marqueeLastTime = timestamp
  const delta = Math.min(timestamp - marqueeLastTime, 64)
  marqueeLastTime = timestamp

  if (!isDragging.value) {
    const targetSpeed = marqueePaused.value ? 0 : marqueeBaseSpeed
    const ease = 1 - Math.exp(-delta / 260)
    marqueeSpeed += (targetSpeed - marqueeSpeed) * ease

    if (cycleWidth() > 0) {
      marqueeOffset.value = wrapOffset(marqueeOffset.value + marqueeSpeed * delta / 1000)
    }
  } else {
    marqueeSpeed = 0
  }

  marqueeFrame = requestAnimationFrame(runMarquee)
}

let statsObserver: IntersectionObserver | undefined

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (reduced) {
    displayed.value = stats.map(s => s.target)
  } else if (statsRoot.value) {
    statsObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          runCounters()
          statsObserver?.disconnect()
        }
      }
    }, { threshold: 0.4 })
    statsObserver.observe(statsRoot.value)
  }

  if (reduced) return
  marqueeFrame = requestAnimationFrame(runMarquee)
})

onBeforeUnmount(() => {
  if (marqueeFrame) cancelAnimationFrame(marqueeFrame)
  statsObserver?.disconnect()
})
</script>

<template>
  <section id="trust" class="trust-section bg-[linear-gradient(180deg,var(--color-surface)_0%,var(--color-surface)_45%,var(--color-canvas)_100%)] text-ink">
    <div class="container-page py-section-sm md:py-section-lg">
      <div class="mx-auto max-w-3xl text-center">
        <p class="text-caption-bold uppercase text-steel">Нам доверяют</p>
      </div>

    </div>

    <div
      class="trust-marquee overflow-hidden pb-section-lg"
    >
      <div
        class="trust-marquee-hitbox touch-pan-y select-none"
        :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
        @pointerenter="setMarqueePaused(true)"
        @pointerleave="setMarqueePaused(false)"
        @pointerdown="onMarqueePointerDown"
        @pointermove="onMarqueePointerMove"
        @pointerup="endMarqueeDrag"
        @pointercancel="endMarqueeDrag"
      >
        <div
          ref="marqueeTrack"
          class="trust-marquee-track flex w-max gap-md px-md will-change-transform"
          :style="marqueeTrackStyle"
        >
          <article
            v-for="(item, index) in testimonialSlides"
            :key="`${item.name}-${index}`"
            class="trust-card flex min-h-[360px] w-[280px] shrink-0 flex-col justify-between rounded-2xl bg-canvas p-xl shadow-card md:w-[320px]"
          >
            <div>
              <div class="flex items-center justify-between">
                <img
                  :src="item.avatar"
                  :alt="item.name"
                  class="h-14 w-14 rounded-full object-cover shadow-subtle ring-4 ring-canvas"
                  draggable="false"
                >
                <Icon name="lucide:quote" class="h-6 w-6 text-primary/30" />
              </div>
              <p class="mt-xl text-h5 leading-[1.45] text-charcoal">“{{ item.quote }}”</p>
            </div>

            <div class="mt-xl border-t border-hairline pt-lg">
              <h3 class="text-h5 text-navy">{{ item.name }}</h3>
              <p class="mt-1 text-body-sm text-steel">{{ item.role }}</p>
              <p class="mt-sm text-caption-bold uppercase text-primary">{{ item.company }}</p>
            </div>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stat-num {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}
</style>
